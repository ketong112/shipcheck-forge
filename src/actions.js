// ShipCheck — action handlers.
// Each export backs one `action` module in manifest.yml (via the `function`
// entries). The Rovo agent and the Rovo MCP server both invoke these.
// A handler receives the declared action inputs in `payload` and returns a
// plain object (serialized to the agent). Errors are returned as objects,
// never thrown, so the agent gets a readable message instead of a tool crash.
import { searchIssuesByVersion, getIssueContext as fetchIssueContext, createIssue } from './jira.js';
import { computeReadiness, readinessSummary, issueLine } from './readiness.js';

function requireField(payload, name) {
  const value = payload && payload[name];
  if (value === undefined || value === null || String(value).trim() === '') {
    return { ok: false, error: `Missing required input: ${name}.` };
  }
  return { ok: true, value: String(value).trim() };
}

export async function getReadiness(payload) {
  const project = requireField(payload, 'projectKey');
  if (!project.ok) return project;
  const version = requireField(payload, 'versionName');
  if (!version.ok) return version;
  try {
    const issues = await searchIssuesByVersion(project.value, version.value);
    if (issues.length === 0) {
      return {
        ok: true,
        projectKey: project.value,
        versionName: version.value,
        score: null,
        summary: `No issues found in project ${project.value} with fixVersion "${version.value}". Check the project key and version name, or assign the fixVersion to the release issues first.`,
      };
    }
    const report = computeReadiness(issues);
    return {
      ok: true,
      projectKey: project.value,
      versionName: version.value,
      score: report.score,
      verdict: report.verdict,
      done: report.done,
      open: report.open,
      total: report.total,
      donePct: report.donePct,
      deductions: report.deductions,
      blockers: report.blockers,
      summary: readinessSummary(report, project.value, version.value),
    };
  } catch (err) {
    return { ok: false, error: `Could not compute readiness: ${err.message}` };
  }
}

export async function listBlockers(payload) {
  const project = requireField(payload, 'projectKey');
  if (!project.ok) return project;
  const version = requireField(payload, 'versionName');
  if (!version.ok) return version;
  try {
    const issues = await searchIssuesByVersion(project.value, version.value);
    if (issues.length === 0) {
      return {
        ok: true,
        projectKey: project.value,
        versionName: version.value,
        blockers: { blockerPriority: [], blockedByLink: [], unassigned: [], overdue: [] },
        summary: `No issues found in project ${project.value} with fixVersion "${version.value}".`,
      };
    }
    const report = computeReadiness(issues);
    const all = [
      ...report.blockers.blockerPriority.map((b) => ({ ...b, reason: 'Blocker/Highest priority, still open' })),
      ...report.blockers.blockedByLink.map((b) => ({ ...b, reason: 'Blocked by an unresolved linked issue' })),
      ...report.blockers.unassigned.map((b) => ({ ...b, reason: 'Open and unassigned' })),
      ...report.blockers.overdue.map((b) => ({ ...b, reason: 'Open and past its due date' })),
    ];
    // De-duplicate by key, keep the first (strongest) reason.
    const seen = new Set();
    const unique = all.filter((b) => {
      if (seen.has(b.key)) return false;
      seen.add(b.key);
      return true;
    });
    return {
      ok: true,
      projectKey: project.value,
      versionName: version.value,
      readinessScore: report.score,
      blockers: unique,
      summary: unique.length === 0
        ? `No blockers for ${project.value} ${version.value} (readiness ${report.score}/100).`
        : `${unique.length} blocker(s) for ${project.value} ${version.value} (readiness ${report.score}/100):\n` +
          unique.map((b) => `- ${b.key} [${b.priority || 'no priority'}] ${b.summary} (${b.status}; ${b.reason}; assignee: ${b.assignee || 'unassigned'})`).join('\n'),
    };
  } catch (err) {
    return { ok: false, error: `Could not list blockers: ${err.message}` };
  }
}

export async function getIssueContext(payload) {
  const issue = requireField(payload, 'issueKey');
  if (!issue.ok) return issue;
  try {
    const ctx = await fetchIssueContext(issue.value);
    return {
      ok: true,
      ...ctx,
      summary: `${ctx.key} [${ctx.priority || 'no priority'}] ${ctx.summary} — ${ctx.status} (assignee: ${ctx.assignee || 'unassigned'}; due: ${ctx.duedate || 'none'}). ${ctx.comments.length} recent comment(s), ${ctx.linkedIssues.length} linked issue(s).`,
    };
  } catch (err) {
    return { ok: false, error: `Could not load issue ${issue.value}: ${err.message}` };
  }
}

export async function createFollowup(payload) {
  const project = requireField(payload, 'projectKey');
  if (!project.ok) return project;
  const summary = requireField(payload, 'summary');
  if (!summary.ok) return summary;
  const description = payload.description ? String(payload.description) : '';
  const issueType = payload.issueType ? String(payload.issueType).trim() : 'Task';
  try {
    const created = await createIssue(project.value, summary.value, description, issueType);
    return {
      ok: true,
      key: created.key,
      summary: `Created follow-up issue ${created.key} in project ${project.value}.`,
    };
  } catch (err) {
    return { ok: false, error: `Could not create the follow-up issue: ${err.message}` };
  }
}
