// ShipCheck — unit tests for the readiness scoring (pure functions).
// Run: npm test   (node --test test/test-readiness.mjs)
import test from 'node:test';
import assert from 'node:assert/strict';
import { computeReadiness, blockingLinks, readinessSummary } from '../src/readiness.js';

const NOW = new Date('2026-11-20T00:00:00Z');

function issue(overrides) {
  return {
    key: 'SCRUM-1',
    summary: 'Sample issue',
    status: 'In Progress',
    statusCategory: 'indeterminate',
    priority: 'Medium',
    assignee: 'Ada',
    duedate: null,
    updated: '2026-11-19T00:00:00Z',
    issuelinks: [],
    fixVersions: ['2.3'],
    ...overrides,
  };
}

test('all done -> 100, Ready to ship', () => {
  const issues = [
    issue({ key: 'SCRUM-1', statusCategory: 'done', status: 'Done' }),
    issue({ key: 'SCRUM-2', statusCategory: 'done', status: 'Done' }),
  ];
  const r = computeReadiness(issues, NOW);
  assert.equal(r.score, 100);
  assert.equal(r.verdict, 'Ready to ship');
  assert.equal(r.donePct, 100);
});

test('half done, one Blocker, one unassigned, one overdue', () => {
  const issues = [
    issue({ key: 'SCRUM-1', statusCategory: 'done', status: 'Done' }),
    issue({ key: 'SCRUM-2', statusCategory: 'done', status: 'Done' }),
    issue({ key: 'SCRUM-3', priority: 'Blocker' }), // -10
    issue({ key: 'SCRUM-4', assignee: null }), // -5 (unassigned)
    issue({ key: 'SCRUM-5', duedate: '2026-11-10' }), // -5 (overdue)
  ];
  // donePct = 40 (2/5). Deductions: Blocker 10 + unassigned 5 + overdue 5 = 20.
  // score = 40 - 20 = 20.
  const r = computeReadiness(issues, NOW);
  assert.equal(r.donePct, 40);
  assert.equal(r.score, 20);
  assert.equal(r.verdict, 'Not ready — significant work remains');
  assert.equal(r.blockers.blockerPriority.length, 1);
  assert.equal(r.blockers.unassigned.length, 1);
  assert.equal(r.blockers.overdue.length, 1);
});

test('blocked-by-link detection (Blocks / is blocked by, blocker not done)', () => {
  const blocked = issue({
    key: 'SCRUM-10',
    issuelinks: [
      {
        type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
        inwardIssue: {
          key: 'SCRUM-9',
          fields: { summary: 'Dependency', status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } } },
        },
      },
    ],
  });
  assert.equal(blockingLinks(blocked).length, 1);
  assert.equal(blockingLinks(blocked)[0].blockedBy, 'SCRUM-9');

  // Same link, but the blocking issue is Done -> not a blocker.
  const unblocked = issue({
    key: 'SCRUM-11',
    issuelinks: [
      {
        type: { name: 'Blocks', inward: 'is blocked by', outward: 'blocks' },
        inwardIssue: {
          key: 'SCRUM-9',
          fields: { summary: 'Dependency', status: { name: 'Done', statusCategory: { key: 'done' } } },
        },
      },
    ],
  });
  assert.equal(blockingLinks(unblocked).length, 0);
});

test('deduction caps: many Blockers cannot push below the cap', () => {
  const issues = [
    issue({ key: 'SCRUM-1', statusCategory: 'done', status: 'Done' }),
    ...Array.from({ length: 10 }, (_, i) => issue({ key: `SCRUM-${10 + i}`, priority: 'Blocker' })),
  ];
  // donePct = 1/11 = 9. Blocker deduction capped at 30. score = max(0, 9-30) = 0.
  const r = computeReadiness(issues, NOW);
  assert.equal(r.deductions.find((d) => d.reason.startsWith('Open Blocker')).points, 30);
  assert.equal(r.score, 0);
});

test('readinessSummary is a readable one-liner plus blockers', () => {
  const issues = [
    issue({ key: 'SCRUM-1', statusCategory: 'done', status: 'Done' }),
    issue({ key: 'SCRUM-2', priority: 'Blocker', summary: 'Crash on login' }),
  ];
  const r = computeReadiness(issues, NOW);
  const s = readinessSummary(r, 'SCRUM', '2.3');
  assert.match(s, /SCRUM 2\.3: readiness 40\/100/);
  assert.match(s, /SCRUM-2.*Crash on login/);
});
