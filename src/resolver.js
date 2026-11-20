// ShipCheck — UI Kit resolver (backs the jira:projectPage via `invoke`).
// The frontend calls invoke('getVersions', { projectKey }) and
// invoke('getReadiness', { projectKey, versionName }).
// Uses makeResolver (named export) instead of `new Resolver()` — the default
// import of @forge/resolver breaks under Forge's webpack bundling
// ("out_namespaceObject is not a constructor" at runtime).
import { makeResolver } from '@forge/resolver';
import { searchIssuesByVersion, listVersions } from './jira.js';
import { computeReadiness, readinessSummary } from './readiness.js';

export const handler = makeResolver({
  getVersions: async (req) => {
    const projectKey = req.payload && req.payload.projectKey;
    if (!projectKey) return { ok: false, error: 'Missing projectKey.' };
    try {
      const versions = await listVersions(String(projectKey).trim());
      return { ok: true, versions };
    } catch (err) {
      return { ok: false, error: `Could not list versions: ${err.message}` };
    }
  },

  getReadiness: async (req) => {
    const projectKey = req.payload && req.payload.projectKey;
    const versionName = req.payload && req.payload.versionName;
    if (!projectKey || !versionName) {
      return { ok: false, error: 'Missing projectKey or versionName.' };
    }
    try {
      const issues = await searchIssuesByVersion(String(projectKey).trim(), String(versionName).trim());
      if (issues.length === 0) {
        return {
          ok: true,
          projectKey,
          versionName,
          score: null,
          summary: `No issues found in project ${projectKey} with fixVersion "${versionName}".`,
        };
      }
      const report = computeReadiness(issues);
      return {
        ok: true,
        projectKey,
        versionName,
        ...report,
        summary: readinessSummary(report, projectKey, versionName),
      };
    } catch (err) {
      return { ok: false, error: `Could not compute readiness: ${err.message}` };
    }
  },
});
