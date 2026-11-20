// ShipCheck — release-readiness scoring.
// Pure functions (no Forge imports) so they can be unit-tested locally.
// An "issue" here is the normalized shape produced by jira.js normalizeIssue():
//   { key, summary, status, statusCategory, priority, assignee, duedate,
//     updated, issuelinks, fixVersions }
// statusCategory is one of 'new' | 'indeterminate' | 'done' (Jira statusCategory.key).

/**
 * An issue counts as blocked when another issue blocks it and that
 * blocking issue is not Done yet. Jira represents this as an issuelink of
 * type "Blocks" where this issue is on the inward side ("is blocked by").
 */
export function blockingLinks(issue) {
  const links = issue.issuelinks || [];
  return links.filter((link) => {
    if (!link || !link.type || link.type.name !== 'Blocks') return false;
    // inwardIssue = the issue that blocks THIS issue ("is blocked by").
    const blocker = link.inwardIssue;
    if (!blocker) return false;
    const blockerStatus = blocker.fields && blocker.fields.status;
    const category = blockerStatus && blockerStatus.statusCategory && blockerStatus.statusCategory.key;
    return category !== 'done';
  }).map((link) => ({
    blockedBy: link.inwardIssue.key,
    blockedBySummary: link.inwardIssue.fields ? link.inwardIssue.fields.summary : '',
    blockedByStatus: link.inwardIssue.fields && link.inwardIssue.fields.status
      ? link.inwardIssue.fields.status.name
      : '',
  }));
}

export function isBlocked(issue) {
  return blockingLinks(issue).length > 0;
}

function isOverdue(issue, now) {
  if (!issue.duedate) return false;
  const due = new Date(issue.duedate + 'T23:59:59Z');
  return due.getTime() < now.getTime();
}

/**
 * Compute the readiness of a release from its issues.
 * Scoring (transparent, explainable — the report shows every deduction):
 *   start from the % of issues in a Done status category,
 *   -10 per open Blocker-priority issue (capped at -30),
 *   -10 per issue blocked by an unresolved linked issue (capped at -30),
 *   -5  per unassigned open issue (capped at -15),
 *   -5  per overdue open issue (capped at -10),
 *   clamped to 0-100.
 */
export function computeReadiness(issues, now = new Date()) {
  const total = issues.length;
  const done = issues.filter((i) => i.statusCategory === 'done');
  const open = issues.filter((i) => i.statusCategory !== 'done');
  const donePct = total === 0 ? 100 : Math.round((done.length / total) * 100);

  const blockerPriority = open.filter((i) => i.priority === 'Blocker' || i.priority === 'Highest');
  const blockedByLink = open.filter((i) => isBlocked(i));
  const unassigned = open.filter((i) => !i.assignee);
  const overdue = open.filter((i) => isOverdue(i, now));

  const deductions = [
    { reason: 'Open Blocker/Highest priority issues', count: blockerPriority.length, per: 10, cap: 30 },
    { reason: 'Issues blocked by an unresolved linked issue', count: blockedByLink.length, per: 10, cap: 30 },
    { reason: 'Unassigned open issues', count: unassigned.length, per: 5, cap: 15 },
    { reason: 'Overdue open issues', count: overdue.length, per: 5, cap: 10 },
  ].map((d) => ({ ...d, points: Math.min(d.cap, d.count * d.per) }));

  const totalDeduction = deductions.reduce((sum, d) => sum + d.points, 0);
  const score = Math.max(0, Math.min(100, donePct - totalDeduction));

  const verdict = score >= 90
    ? 'Ready to ship'
    : score >= 70
      ? 'Almost ready — fix the blockers below'
      : score >= 50
        ? 'Not ready'
        : 'Not ready — significant work remains';

  return {
    total,
    done: done.length,
    open: open.length,
    donePct,
    score,
    verdict,
    deductions: deductions.filter((d) => d.points > 0),
    blockers: {
      blockerPriority: blockerPriority.map((i) => issueLine(i)),
      blockedByLink: blockedByLink.map((i) => ({
        ...issueLine(i),
        blockedBy: blockingLinks(i),
      })),
      unassigned: unassigned.map((i) => issueLine(i)),
      overdue: overdue.map((i) => issueLine(i)),
    },
  };
}

export function issueLine(issue) {
  return {
    key: issue.key,
    summary: issue.summary,
    status: issue.status,
    priority: issue.priority,
    assignee: issue.assignee,
    duedate: issue.duedate || null,
  };
}

/** One-line human summary used by the agent-facing tools. */
export function readinessSummary(report, projectKey, versionName) {
  const lines = [];
  lines.push(`Release ${projectKey} ${versionName}: readiness ${report.score}/100 — ${report.verdict}.`);
  lines.push(`${report.done} of ${report.total} issues done (${report.donePct}%).`);
  if (report.deductions.length > 0) {
    lines.push('Deductions: ' + report.deductions.map((d) => `${d.reason}: -${d.points}`).join('; ') + '.');
  }
  const top = [
    ...report.blockers.blockerPriority,
    ...report.blockers.blockedByLink,
  ];
  if (top.length > 0) {
    lines.push('Top blockers:');
    top.slice(0, 8).forEach((b) => {
      lines.push(`- ${b.key} [${b.priority || 'no priority'}] ${b.summary} (${b.status}; assignee: ${b.assignee || 'unassigned'})`);
    });
  } else if (report.open === 0) {
    lines.push('No open issues. Nothing is blocking this release.');
  }
  return lines.join('\n');
}
