// ShipCheck — Jira project page (UI Kit 2, @forge/react).
// Pick a version, see the readiness score, the deductions, and the blockers.
// NOTE (verified against the installed @forge/react types):
// - The text input is `Textfield` (lowercase 'f'), not `TextField`.
// - `Textfield` and `Select` take NO `label` prop — pair them with `Label`.
// - `Select` is react-select: onChange receives the selected option object
//   { label, value } (not an event), and `value` must be the option object.
import React, { useState } from 'react';
import ForgeReconciler, {
  Box,
  Button,
  Heading,
  Label,
  SectionMessage,
  Select,
  Stack,
  Text,
  Textfield,
  useProductContext,
} from '@forge/react';
import { invoke } from '@forge/bridge';

const App = () => {
  const context = useProductContext();
  const contextProjectKey =
    context && context.extension && context.extension.project
      ? context.extension.project.key
      : '';
  const [projectKey, setProjectKey] = useState(contextProjectKey);
  const [versions, setVersions] = useState([]);
  const [versionName, setVersionName] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadVersions = async () => {
    if (!projectKey.trim()) {
      setError('Enter a project key first (for example SCRUM).');
      return;
    }
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const result = await invoke('getVersions', { projectKey: projectKey.trim() });
      if (!result.ok) {
        setError(result.error || 'Could not list versions.');
        setVersions([]);
        return;
      }
      setVersions(result.versions || []);
      if ((result.versions || []).length === 0) {
        setError(`No unreleased versions found in project ${projectKey.trim()}.`);
      }
    } catch (e) {
      setError(`Could not list versions: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkReadiness = async () => {
    if (!projectKey.trim() || !versionName) {
      setError('Pick a project and a version first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await invoke('getReadiness', {
        projectKey: projectKey.trim(),
        versionName,
      });
      if (!result.ok) {
        setError(result.error || 'Could not compute readiness.');
        setReport(null);
        return;
      }
      setReport(result);
    } catch (e) {
      setError(`Could not compute readiness: ${e.message}`);
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const allBlockers = report
    ? [
        ...report.blockers.blockerPriority.map((b) => ({ ...b, reason: 'Blocker/Highest priority' })),
        ...report.blockers.blockedByLink.map((b) => ({ ...b, reason: 'Blocked by an unresolved issue' })),
        ...report.blockers.unassigned.map((b) => ({ ...b, reason: 'Unassigned' })),
        ...report.blockers.overdue.map((b) => ({ ...b, reason: 'Overdue' })),
      ].filter(
        (b, idx, arr) => arr.findIndex((x) => x.key === b.key) === idx
      )
    : [];

  return (
    <Stack space="space.200">
      <Heading as="h1">ShipCheck — Release Readiness</Heading>
      <Text>
        Pick a release version and ShipCheck scores it from live Jira data: how much is done,
        what is blocking it, and whether it is ready to ship.
      </Text>

      <Box>
        <Label labelFor="project-key">Project key</Label>
        <Textfield
          id="project-key"
          value={projectKey}
          onChange={(e) => setProjectKey(e.target.value)}
          placeholder="SCRUM"
        />
      </Box>
      <Button appearance="primary" onClick={loadVersions} isDisabled={loading}>
        Load versions
      </Button>

      {versions.length > 0 && (
        <Box>
          <Label labelFor="version-select">Release version</Label>
          <Select
            inputId="version-select"
            value={versionName ? { label: versionName, value: versionName } : null}
            onChange={(option) => setVersionName(option ? option.value : '')}
            options={versions.map((v) => ({ label: v.name, value: v.name }))}
            placeholder="Select a version"
          />
          <Button appearance="primary" onClick={checkReadiness} isDisabled={loading || !versionName}>
            Check readiness
          </Button>
        </Box>
      )}

      {error && (
        <SectionMessage title="Something went wrong" appearance="warning">
          <Text>{error}</Text>
        </SectionMessage>
      )}

      {report && report.score !== null && (
        <Stack space="space.200">
          <Heading as="h2">
            {report.projectKey} {report.versionName}: {report.score}/100 — {report.verdict}
          </Heading>
          <Text>
            {report.done} of {report.total} issues done ({report.donePct}%). {report.open} still open.
          </Text>
          {report.deductions.length > 0 && (
            <Stack space="space.100">
              <Heading as="h3">Why points were deducted</Heading>
              {report.deductions.map((d) => (
                <Text key={d.reason}>
                  - {d.reason}: -{d.points} ({d.count} issue{d.count === 1 ? '' : 's'})
                </Text>
              ))}
            </Stack>
          )}
          {allBlockers.length > 0 ? (
            <Stack space="space.100">
              <Heading as="h3">Blockers ({allBlockers.length})</Heading>
              {allBlockers.slice(0, 20).map((b) => (
                <Text key={b.key}>
                  - {b.key} [{b.priority || 'no priority'}] {b.summary} ({b.status}; {b.reason}
                  ; assignee: {b.assignee || 'unassigned'})
                </Text>
              ))}
            </Stack>
          ) : (
            <SectionMessage title="No blockers" appearance="success">
              <Text>Nothing is blocking this release.</Text>
            </SectionMessage>
          )}
          <Text>
            Tip: ask the ShipCheck agent in Rovo Chat "Is release {report.versionName} ready to ship?"
            — or call the same tools from any MCP client.
          </Text>
        </Stack>
      )}

      {report && report.score === null && (
        <SectionMessage title="No issues found" appearance="information">
          <Text>{report.summary}</Text>
        </SectionMessage>
      )}
    </Stack>
  );
};

ForgeReconciler.render(<App />);
