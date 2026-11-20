// ShipCheck — Jira REST API helpers (Forge runtime).
// Uses api.asApp().requestJira with the `route` tagged template (required by
// the Forge permission model). Search uses POST /rest/api/3/search/jql — the
// legacy GET/POST /rest/api/3/search endpoint was shut down in Oct 2025
// (returns 410 Gone). /search/jql paginates with nextPageToken, not startAt,
// and defaults to fields=id, so fields are always passed explicitly.
import api, { route } from '@forge/api';

const SEARCH_FIELDS = [
  'summary',
  'status',
  'priority',
  'assignee',
  'duedate',
  'updated',
  'issuelinks',
  'fixVersions',
];

function escapeJqlString(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function jiraJson(path, options = {}) {
  const response = await api.asApp().requestJira(path, {
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Jira API ${response.status}: ${text.slice(0, 300)}`);
  }
  return response.json();
}

/** Normalize a raw Jira issue into the shape readiness.js expects. */
export function normalizeIssue(raw) {
  const f = raw.fields || {};
  return {
    key: raw.key,
    summary: f.summary || '',
    status: f.status ? f.status.name : '',
    statusCategory: f.status && f.status.statusCategory ? f.status.statusCategory.key : 'new',
    priority: f.priority ? f.priority.name : null,
    assignee: f.assignee ? (f.assignee.displayName || f.assignee.accountId) : null,
    duedate: f.duedate || null,
    updated: f.updated || null,
    issuelinks: f.issuelinks || [],
    fixVersions: (f.fixVersions || []).map((v) => v.name),
  };
}

/** All issues in a project with a given fixVersion, paginated via nextPageToken. */
export async function searchIssuesByVersion(projectKey, versionName) {
  const jql = `project = "${escapeJqlString(projectKey)}" AND fixVersion = "${escapeJqlString(versionName)}" ORDER BY priority DESC, updated DESC`;
  const issues = [];
  let nextPageToken = undefined;
  for (let page = 0; page < 10; page++) {
    const body = { jql, maxResults: 100, fields: SEARCH_FIELDS };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const data = await jiraJson(route`/rest/api/3/search/jql`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    (data.issues || []).forEach((raw) => issues.push(normalizeIssue(raw)));
    if (!data.nextPageToken || (data.issues || []).length === 0) break;
    nextPageToken = data.nextPageToken;
  }
  return issues;
}

/** Unreleased versions of a project (for the project-page version picker). */
export async function listVersions(projectKey) {
  const data = await jiraJson(route`/rest/api/3/project/${projectKey}/versions`);
  return (Array.isArray(data) ? data : [])
    .filter((v) => !v.released && !v.archived)
    .map((v) => ({ id: v.id, name: v.name, releaseDate: v.releaseDate || null }));
}

/** Full context of one issue: fields, comments, linked issues, linked Confluence pages. */
export async function getIssueContext(issueKey) {
  const raw = await jiraJson(
    route`/rest/api/3/issue/${issueKey}?fields=summary,status,priority,assignee,duedate,updated,description,issuelinks,fixVersions,comment`
  );
  const issue = normalizeIssue(raw);
  const comments = ((raw.fields.comment && raw.fields.comment.comments) || []).map((c) => ({
    author: c.author ? c.author.displayName : 'unknown',
    created: c.created,
    body: adfToText(c.body),
  }));
  const linkedIssues = (issue.issuelinks || []).map((link) => {
    const other = link.outwardIssue || link.inwardIssue;
    return {
      key: other ? other.key : '',
      summary: other && other.fields ? other.fields.summary : '',
      status: other && other.fields && other.fields.status ? other.fields.status.name : '',
      relationship: link.type ? (link.outwardIssue ? link.type.outward : link.type.inward) : '',
    };
  });
  return { ...issue, comments: comments.slice(-5), linkedIssues };
}

/** Create a Jira issue. Description is sent as Atlassian Document Format (ADF). */
export async function createIssue(projectKey, summary, description, issueType = 'Task') {
  const data = await jiraJson(route`/rest/api/3/issue`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        project: { key: projectKey },
        issuetype: { name: issueType },
        summary,
        description: textToAdf(description || ''),
      },
    }),
  });
  return { key: data.key, id: data.id };
}

function textToAdf(text) {
  const paragraphs = String(text).split(/\n+/).filter((p) => p.trim().length > 0);
  return {
    type: 'doc',
    version: 1,
    content: (paragraphs.length > 0 ? paragraphs : ['(no description)']).map((p) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p }],
    })),
  };
}

/** Best-effort plain-text rendering of an ADF comment body. */
export function adfToText(adf) {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  if (Array.isArray(adf.content)) {
    return adf.content
      .map((node) => {
        if (node.type === 'text') return node.text || '';
        if (node.content) return adfToText(node);
        return '';
      })
      .join('');
  }
  return '';
}
