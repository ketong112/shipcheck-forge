# ShipCheck — Release Readiness for Jira

**Codegeist 2026 entry — Category: Apps for Software Teams**
**Bonus prizes: Best app with Atlassian MCP (primary) · Best Agents — Rovo/Assignable agents (secondary)**

## The problem

Before every release, a team lead has to answer one question: **"Is this release ready to ship?"**

Today that means opening Jira, filtering by fixVersion, and manually checking every issue:
are they all done? Is anything blocked? Who is unassigned? What is overdue? The answer ends
up being a gut feeling — and the blockers surface too late, usually in the release meeting.

## What ShipCheck does

ShipCheck turns that gut feeling into a number, with the evidence attached.

- **Readiness score (0–100) + verdict** for any Jira version (fixVersion), computed from live
  Jira data. The scoring is transparent — every deduction is listed with its reason.
- **The exact blockers**: open Blocker/Highest-priority issues, issues blocked by an unresolved
  linked issue, unassigned open issues, and overdue open issues.
- **Full issue context**: summary, status, assignee, priority, due date, recent comments, and
  linked issues — so an agent (or a teammate) can understand *why* something is blocked.
- **Follow-up issues**: create a Jira issue for a blocker straight from the agent, so the
  release work is tracked where it belongs.

## Three ways to use it

1. **Any MCP client (the MCP bonus)** — ShipCheck exposes a `rovo:mcp` module. Enable the tools
   for external clients in Atlassian Administration (Apps → Sites → your site → Connected apps →
   your app → Tools), then add the MCP endpoint `https://mcp.atlassian.com/forge/<appId>` to
   Claude Code, Cursor, or any MCP-compatible client. See `skill.md` for the tool list and
   example prompts.
2. **Rovo Chat (the Agents bonus)** — the ShipCheck agent (`rovo:agent`) lives in Rovo Chat.
   Ask it *"Is release 2.3 ready to ship?"* and it calls the same tools and answers with the
   score, the verdict, and the top blockers.
3. **Jira project page** — open the ShipCheck tab in any Jira project, pick a version, and see
   the score, the deductions, and the blocker list in the product.

## The four MCP tools

| Tool | What it does |
|---|---|
| `shipcheck-readiness` | Readiness score + verdict + breakdown for a project + version |
| `shipcheck-blockers` | The blocking issues for a project + version, de-duplicated, with reasons |
| `shipcheck-issue-context` | Full context of one issue (fields, comments, linked issues) |
| `shipcheck-create-followup` | Create a follow-up Jira issue (e.g. for a blocker) |

All four are also the Rovo agent's actions — one codebase, two bonus tracks.

## How the score works (transparent, no black box)

Start from the % of issues in a Done status category, then deduct:

| Deduction | Points |
|---|---|
| Each open Blocker/Highest-priority issue | −10 (capped at −30) |
| Each issue blocked by an unresolved linked issue | −10 (capped at −30) |
| Each unassigned open issue | −5 (capped at −15) |
| Each overdue open issue | −5 (capped at −10) |

Clamped to 0–100. Verdicts: 90+ "Ready to ship" · 70–89 "Almost ready — fix the blockers" ·
50–69 "Not ready" · below 50 "Not ready — significant work remains".

## Install (for judges / testers)

1. Open the **installation link** from the Devpost submission.
2. Choose your Atlassian site and confirm the install (the app needs `read:jira-work` and
   `write:jira-work` — read issues/versions, create follow-up issues).
3. In Jira, open any project → the **ShipCheck** tab → enter a project key → Load versions →
   pick a version → Check readiness.
4. In Rovo Chat, find the **ShipCheck** agent and ask *"Is release 2.3 ready to ship?"*
5. For MCP clients, enable the tools for external clients (see above) and add the endpoint.

No Forge LLM is used. No external services are called. The app only talks to the Jira API
of the site it is installed on.

## For developers

Prerequisites: Node.js 22+ (24.x works), Forge CLI 13.3.0+ (`npm install -g @forge/cli`).

```bash
# Log in with an Atlassian API scoped token (Forge scope).
# On headless/CI machines, use env vars instead of `forge login`:
export FORGE_EMAIL="you@example.com"
export FORGE_API_TOKEN="<your Forge-scoped API token>"

# Deploy and install on a demo site (seeded data, 90 days):
forge deploy
forge install --demo-site

# Or install on your own developer site:
forge install
```

Notes for this environment: if `npm install -g @forge/cli` fails on a `chown EPERM`
in the postinstall step, reinstall with `npm install -g @forge/cli --ignore-scripts`.
If Forge commands fail on a config `chown`, set `XDG_CONFIG_HOME=/tmp/forge-xdg` and
`forge settings set usage-analytics false` once.

## Project layout

```
manifest.yml            modules: rovo:mcp, rovo:agent, action x4, jira:projectPage
src/
  readiness.js          pure scoring logic (unit-tested, no Forge imports)
  jira.js               Jira REST helpers (POST /rest/api/3/search/jql, issue, versions)
  actions.js            the 4 action handlers (MCP tools + Rovo agent actions)
  resolver.js           UI Kit resolver for the project page (invoke)
  frontend/index.jsx    UI Kit 2 React project page
test/
  test-readiness.mjs    unit tests for the scoring (npm test)
skill.md                open-source skill file for third-party agents (MCP bonus)
```

Run the tests: `npm test` (5 tests, no network, no Forge login needed).

## Why this wins the MCP bonus

- It is a **real MCP server for a real product**: the tools read and write live Jira data
  through the app's own scopes — not a hello-world logger.
- It is **usable by any MCP client**, not just Rovo Studio: the external endpoint
  `https://mcp.atlassian.com/forge/<appId>` works with Claude Code, Cursor, and others.
- It ships an **open-source `skill.md`** so any agent can learn the tools (explicitly
  encouraged by the 2026 MCP bonus rules).
- The same actions back a **Rovo agent**, so the entry also qualifies for the Agents bonus.

## License

MIT.
