# ShipCheck skill

Use this skill when you need to answer, with evidence, whether a Jira software
release is ready to ship — or to work the blockers that stand in its way.

ShipCheck is a Forge app (Codegeist 2026) that exposes four MCP tools for Jira
release readiness. It reads live Jira data on the site where it is installed;
it never invents issue keys, statuses, or scores.

## Connect

Add ShipCheck as a remote MCP server in your client. The endpoint is:

```
https://mcp.atlassian.com/forge/<appId>
```

Replace `<appId>` with the app ID from the ShipCheck `manifest.yml`
(the UUID after `ari:cloud:ecosystem::app/`).

The site admin must first enable the tools for external clients: Atlassian
Administration → Apps → Sites → your site → Connected apps → ShipCheck → Tools →
turn on the tools to expose. (Rovo Studio custom agents can use the tools
without this step, via Connected apps.)

For Claude Code:

```
claude mcp add --transport http shipcheck https://mcp.atlassian.com/forge/<appId>
```

## Tools

### shipcheck-readiness — Get release readiness
Inputs: `projectKey` (e.g. `SCRUM`), `versionName` (the fixVersion, e.g. `2.3`).
Returns: readiness score 0–100, verdict, done/open counts, the deductions with
reasons, and the blocking issues. Use this FIRST when anyone asks if a release
is ready to ship.

### shipcheck-blockers — List release blockers
Inputs: `projectKey`, `versionName`.
Returns: the de-duplicated blocking issues, each with a reason: open
Blocker/Highest-priority issue, blocked by an unresolved linked issue, open and
unassigned, or open and past its due date.

### shipcheck-issue-context — Get issue context
Input: `issueKey` (e.g. `SCRUM-123`).
Returns: summary, status, assignee, priority, due date, recent comments, and
linked issues. Use it to understand WHY a blocker is blocked before proposing
a fix.

### shipcheck-create-followup — Create follow-up issue
Inputs: `projectKey`, `summary` (required), `description` (optional),
`issueType` (optional, default `Task`).
Creates a Jira issue for a blocker. Only call it when the user (or the release
plan) asks for a follow-up to be tracked — never create issues speculatively.

## How the score works

Start from the % of issues in a Done status category, then deduct: −10 per open
Blocker/Highest issue (cap −30), −10 per issue blocked by an unresolved linked
issue (cap −30), −5 per unassigned open issue (cap −15), −5 per overdue open
issue (cap −10). Clamped 0–100. Verdicts: 90+ Ready to ship · 70–89 Almost
ready — fix the blockers · 50–69 Not ready · below 50 Not ready — significant
work remains.

## Example flows

**"Is release 2.3 ready to ship?"**
1. Call `shipcheck-readiness` with the project key and `2.3`.
2. Quote the score and verdict, then list the top blockers by key with one line
   each explaining why they block the release.
3. If the user asks what to do next, call `shipcheck-blockers` for the full
   list, then offer to create a follow-up issue for the top blocker.

**"Why is SCRUM-123 blocked?"**
1. Call `shipcheck-issue-context` with `SCRUM-123`.
2. Explain from the comments and linked issues — quote the blocking issue key
   and its status.

**"File a follow-up for the login crash blocker."**
1. Call `shipcheck-blockers` to confirm which issue it is.
2. Call `shipcheck-create-followup` with a clear summary and description.
3. Report the new issue key.

## Rules

- Never invent issue keys, statuses, or scores. If a tool returns an error,
  say so plainly and suggest what to check (project key, version name, app
  installed on the right site).
- If no issues are found for a version, say so — the fixVersion may not be
  assigned to any issue yet.
- Do not create follow-up issues unless asked.
