# ShipCheck — Codegeist 2026 draft submission

> DRAFT — do NOT submit to Devpost yet. Needs: installation link, demo video
> (YouTube, public), and the user's explicit confirmation.

## Project

- **Name:** ShipCheck — Release Readiness for Jira
- **Repo:** https://github.com/ketong112/shipcheck-forge (to be created — see "Still needed")
- **Category:** Apps for Software Teams
- **Bonus prizes:**
  - **Best app with Atlassian MCP** (primary) — the app exposes 4 tools via the
    `rovo:mcp` module, usable by Rovo Studio custom agents AND by any third-party
    MCP client through `https://mcp.atlassian.com/forge/<appId>`. Ships with an
    open-source `skill.md` for third-party agents (explicitly encouraged by the
    2026 MCP bonus rules).
  - **Best Agents — Rovo/Assignable agents** (secondary) — the same 4 actions back
    a `rovo:agent` (ShipCheck) that answers release-readiness questions in Rovo Chat.

## Explanation (how it meets the technology requirement)

ShipCheck is a Forge app (manifest with `rovo:mcp`, `rovo:agent`, `action` × 4,
`jira:projectPage`, `function` × 5) that integrates with **Jira** — the minimum
one-Atlassian-product requirement — and with **Rovo**.

The problem it solves is specific and real: before a release, a team lead must
answer "Is this release ready to ship?" by manually checking every issue in a
fixVersion. ShipCheck answers it with evidence: a 0–100 readiness score computed
from live Jira data (done %, open Blocker/Highest issues, issues blocked by an
unresolved linked issue, unassigned issues, overdue issues — every deduction
listed with its reason), the exact blocker list, full issue context (comments,
linked issues), and the ability to create a follow-up issue for a blocker.

The 2026 theme is "Build with context. Ship with confidence." ShipCheck is
literally that: it gathers the context scattered across a release (issues,
links, comments, assignees, due dates) and turns it into a ship/no-ship
decision. The MCP server lets *any* AI agent — not just Rovo — ask the question
and act on the answer, which is the point of the MCP bonus track.

No Forge LLM is used (per the rules it is optional and Codegeist provides no
credits). Rovo is used instead: the agent's reasoning runs in Rovo, and the
tools are plain Forge functions calling the Jira REST API.

## Testing instructions (for judges)

1. Open the installation link (below) and install ShipCheck on your Atlassian
   site. The app requests `read:jira-work` (read issues/versions) and
   `write:jira-work` (create follow-up issues).
2. **Jira project page:** in any Jira project, open the **ShipCheck** tab, enter
   a project key (e.g. `SCRUM`), click **Load versions**, pick a version, click
   **Check readiness**. You will see the score, the verdict, the deductions, and
   the blocker list.
3. **Rovo Chat:** open Rovo Chat, select the **ShipCheck** agent, and ask
   *"Is release 2.3 ready to ship?"* (replace `2.3` with a version on your site).
   Then ask *"What is blocking it?"* and *"Show me the context for <an issue key
   from the blocker list>."*
4. **MCP (third-party client):** in Atlassian Administration → Apps → Sites →
   your site → Connected apps → ShipCheck → Tools, turn on the tools for
   external clients. Then add the MCP endpoint
   `https://mcp.atlassian.com/forge/<appId>` to Claude Code
   (`claude mcp add --transport http shipcheck <endpoint>`) or any
   MCP-compatible client, and ask *"Is release 2.3 ready to ship?"*
5. **Demo data:** install on a Forge demo site (seeded Jira data) or any site
   with a project that has a fixVersion with a mix of Done and open issues.

## Demo video (under 5 minutes) — outline

1. (0:00–0:30) The problem: a release is coming, nobody knows if it is ready.
2. (0:30–1:30) Jira project page: pick a version, score + verdict + blockers appear.
3. (1:30–2:30) Rovo Chat: ask the ShipCheck agent "Is release 2.3 ready to ship?"
   — it calls the tools and answers with the score and top blockers.
4. (2:30–3:30) MCP: add the ShipCheck endpoint to Claude Code, ask the same
   question, show the tools being called; create a follow-up issue for a blocker.
5. (3:30–4:30) Show the created follow-up issue in Jira + recap the score formula.

The video must be uploaded to YouTube (public) by the user — the agent does not
upload to YouTube.

## Links (to be filled in)

- Installation link: _TBD after deploy + sharing enabled in the developer console_
- Demo video (YouTube): _TBD after recording + user upload_
- Repo: https://github.com/ketong112/shipcheck-forge _(to be created)_

## Still needed from the user (in order)

1. **Atlassian account** (email signup, ketong.ardi@gmail.com — manual email, no
   Google OAuth). Email verification code will be needed; the user must provide it.
2. **Atlassian API token (Forge scope)** from
   https://id.atlassian.com/manage-profile/security/api-tokens — "Create API token
   with scopes", app = Forge. The token must reach the agent through the Secure
   Vault / secure flow, NEVER in chat. Then the agent sets `FORGE_EMAIL` +
   `FORGE_API_TOKEN` and runs `forge deploy` + `forge install --demo-site`.
3. **GitHub repo** `shipcheck-forge` on ketong112 (the agent needs GitHub auth;
   `gh` is currently not logged in on this VM) — or the user creates the empty
   repo and the agent pushes the code.
4. **Demo video**: recorded after the app is deployed (needs the live app + Rovo
   Studio/MCP client); the user uploads it to YouTube (public) and shares the link.
5. **Devpost**: the user creates/confirms the Devpost account; the agent prepares
   the submission, the user reviews and submits (deadline 22 Dec 2026 12:00 PT).
