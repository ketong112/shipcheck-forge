# ShipCheck — Privacy Policy

ShipCheck is a Forge app for Jira (Codegeist 2026 entry) by Ardiansyah (ketong112).

## What ShipCheck does
ShipCheck reads Jira issue data (summary, status, priority, assignee, due date, linked issues, comments, fixVersions) through the Jira REST API to compute a release-readiness score (0–100) for a chosen fixVersion, list blockers, and optionally create a follow-up Jira issue.

## Data storage
ShipCheck does **not** store personal data. It does not use Forge storage or any external database. Issue data is read live from Jira, processed in memory to compute the score, and returned to the user. Nothing is persisted by the app.

## Data sharing
ShipCheck does not share data with any third party. All Jira API calls go directly between the Forge app and the Jira site where it is installed.

## Contact
Questions: ketong.ardi@gmail.com
