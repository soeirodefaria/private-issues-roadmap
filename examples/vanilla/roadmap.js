/**
 * examples/vanilla/roadmap.js
 *
 * Client-side roadmap logic.
 *
 * Configuration
 * ─────────────
 * If you deploy to Netlify, the default API paths work out of the box.
 * For other platforms, update the ENDPOINTS below.
 *
 * Status labels (must match your GitHub labels and server config):
 *   status:planned      → "Planned"     (purple)
 *   status:in-progress  → "In Progress" (amber)
 *   status:shipped      → "Shipped"     (green)
 */

// ── Configurable endpoints ────────────────────────────────────────────────
const ENDPOINTS = {
  roadmap: '/.netlify/functions/roadmap',
  vote:    '/.netlify/functions/vote',
  votes:   '/.netlify/functions/votes',
};

// ── Display order & badge labels ─────────────────────────────────────────
const COLUMNS = [
  { key: 'status:shipped',     slug: 'shipped',    badgeLabel: 'Shipped'     },
  { key: 'status:in-progress', slug: 'inprogress', badgeLabel: 'In Progress' },
  { key: 'status:planned',     slug: 'planned',    badgeLabel: 'Planned'     },
];

// ── Helpers ───────────────────────────────────────────────────────────────

function statusSlug(status) {
  const map = {
    'status:planned':     'planned',
    'status:in-progress': 'inprogress',
    'status:shipped':     'shipped',
  };
  return map[status] || 'planned';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function showLoading() {
  document.getElementById('roadmapWrap').innerHTML = `
    <div class="state-message" aria-live="polite">
      <div class="state-spinner" role="status" aria-label="Loading roadmap…"></div>
      <p>Loading roadmap…</p>
    </div>`;
}

function showError(message) {
  document.getElementById('roadmapWrap').innerHTML = `
    <div class="state-message" role="alert">
      <div class="error-icon" aria-hidden="true">⚠️</div>
      <p>${escapeHtml(message)}</p>
    </div>`;
}

// ── Anonymous voter identity ──────────────────────────────────────────────
// A UUID is generated once per browser and persisted in localStorage.
// The raw ID is never sent to the server raw — vote.js hashes it with SHA-256.

function getVoterId() {
  let id = localStorage.getItem('roadmap_voter_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('roadmap_voter_id', id);
  }
  return id;
}

function getVotedIssues() {
  try { return JSON.parse(localStorage.getItem('roadmap_voted_issues') || '[]'); }
  catch { return []; }
}

function setLocalVote(issueNumber, voted) {
  let list = getVotedIssues();
  if (voted) {
    if (!list.includes(issueNumber)) list.push(issueNumber);
  } else {
    list = list.filter((n) => n !== issueNumber);
  }
  localStorage.setItem('roadmap_voted_issues', JSON.stringify(list));
}

// ── Vote handler ──────────────────────────────────────────────────────────

async function handleVote(issueNumber, btn) {
  if (btn.disabled) return;
  btn.disabled = true;

  try {
    const res = await fetch(ENDPOINTS.vote, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueNumber, voterId: getVoterId() }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    applyVoteState(btn, data.count, data.voted);
    setLocalVote(issueNumber, data.voted);
  } catch (err) {
    // Vote failure is non-fatal — log and silently recover
    console.error('[roadmap] vote error:', err);
  } finally {
    btn.disabled = false;
  }
}

function applyVoteState(btn, count, voted) {
  btn.querySelector('.vote-count').textContent = count;
  const label = btn.getAttribute('aria-label') || '';
  if (voted) {
    btn.classList.add('voted');
    btn.setAttribute('aria-label', label.replace('Vote for', 'Voted for'));
  } else {
    btn.classList.remove('voted');
    btn.setAttribute('aria-label', label.replace('Voted for', 'Vote for'));
  }
}

// ── Rendering ─────────────────────────────────────────────────────────────

function renderRow(issue, col) {
  const slug = statusSlug(issue.status);

  const row = document.createElement('div');
  row.className = 'issue-row';
  row.setAttribute('role', 'listitem');

  const inner = document.createElement('div');
  inner.className = 'issue-row-inner';

  // Build trigger: title + optional milestone + badge + chevron
  const trigger = document.createElement('button');
  trigger.className = 'issue-row-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', `issue-body-${issue.number}`);

  const milestoneHtml = issue.milestone
    ? `<span class="issue-milestone">${escapeHtml(issue.milestone)}</span>`
    : '';

  trigger.innerHTML = `
    <span class="issue-row-title">${escapeHtml(issue.title)}</span>
    ${milestoneHtml}
    <span class="status-badge badge--${slug}">${escapeHtml(col.badgeLabel)}</span>
    <svg class="issue-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  `;

  // Expandable body
  const body = document.createElement('div');
  body.className = 'issue-body';
  body.id = `issue-body-${issue.number}`;
  body.setAttribute('role', 'region');

  const desc = document.createElement('p');
  desc.className = 'issue-description';
  desc.textContent = issue.excerpt || 'No description available.';
  body.appendChild(desc);

  trigger.addEventListener('click', () => {
    const willOpen = !row.classList.contains('open');
    // Close any currently open row (single-open accordion)
    document.querySelectorAll('.issue-row.open').forEach((r) => {
      r.classList.remove('open');
      r.querySelector('.issue-row-trigger')?.setAttribute('aria-expanded', 'false');
    });
    if (willOpen) {
      row.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    }
  });

  inner.appendChild(trigger);
  inner.appendChild(body);

  // Vote column
  const voteCol = document.createElement('div');
  voteCol.className = 'vote-col';

  const voteBtn = document.createElement('button');
  voteBtn.className = 'vote-btn';
  voteBtn.dataset.issue = issue.number;
  voteBtn.setAttribute('aria-label', `Vote for ${issue.title}`);
  voteBtn.innerHTML = `<span class="vote-icon">+</span><span class="vote-count">0</span>`;
  voteBtn.addEventListener('click', () => handleVote(issue.number, voteBtn));

  voteCol.appendChild(voteBtn);
  row.appendChild(inner);
  row.appendChild(voteCol);
  return row;
}

function groupByStatus(issues) {
  const groups = {};
  COLUMNS.forEach((col) => { groups[col.key] = []; });

  issues.forEach((issue) => {
    const key = issue.status && groups[issue.status] !== undefined
      ? issue.status
      : 'status:planned';
    groups[key].push(issue);
  });

  return groups;
}

// ── Main load ─────────────────────────────────────────────────────────────

async function loadRoadmap() {
  showLoading();

  // 1. Fetch roadmap items
  let issues;
  try {
    const res = await fetch(ENDPOINTS.roadmap);
    if (!res.ok) {
      let msg = `Request failed (${res.status})`;
      try { const d = await res.json(); if (d.error) msg = d.error; } catch (_) {}
      showError(msg);
      return;
    }
    issues = await res.json();
  } catch (err) {
    console.error('[roadmap] fetch error:', err);
    showError('Could not load roadmap. Please try again later.');
    return;
  }

  // 2. Fetch vote counts in parallel — failure is non-fatal
  let voteCounts = {};
  try {
    const vRes = await fetch(ENDPOINTS.votes);
    if (vRes.ok) voteCounts = await vRes.json();
  } catch (_) { /* votes are best-effort */ }

  // 3. Render
  const groups = groupByStatus(issues);
  const wrap   = document.getElementById('roadmapWrap');
  wrap.innerHTML = '';

  let hasItems = false;
  COLUMNS.forEach((col) => {
    const colIssues = groups[col.key];
    if (colIssues.length === 0) return;
    hasItems = true;

    const list = document.createElement('div');
    list.setAttribute('role', 'list');
    colIssues.forEach((issue) => list.appendChild(renderRow(issue, col)));
    wrap.appendChild(list);
  });

  if (!hasItems) {
    wrap.innerHTML = `
      <div class="state-message">
        <p>No public roadmap items yet. Check back soon.</p>
      </div>`;
    return;
  }

  // 4. Hydrate vote buttons with server counts + local voted state
  const votedLocally = getVotedIssues();
  document.querySelectorAll('.vote-btn').forEach((btn) => {
    const num   = Number(btn.dataset.issue);
    const count = voteCounts[String(num)]?.count ?? 0;
    const voted = votedLocally.includes(num);
    applyVoteState(btn, count, voted);
  });
}

loadRoadmap();
