/**
 * adapters/netlify/functions/vote.js
 *
 * Netlify Function — POST /api/vote
 *
 * Accepts: { issueNumber: number, voterId: string }
 * Returns: { issueNumber: number, count: number, voted: boolean }
 *
 * - Hashes voterId server-side with SHA-256 (raw ID never stored)
 * - Supports toggle: voting twice removes the vote
 * - Maintains a global index of voted issues for efficient bulk retrieval
 * - Storage: Netlify Blobs (falls back to local FS in dev)
 */

const { createHash }      = require('crypto');
const { getRoadmapStore } = require('../../../core/store');

const INDEX_KEY = 'index';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  // ── Parse + validate body ────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body.' }) };
  }

  const { issueNumber, voterId } = body;

  if (typeof issueNumber !== 'number' || !Number.isInteger(issueNumber) || issueNumber < 1) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'issueNumber must be a positive integer.' }),
    };
  }
  if (!voterId || typeof voterId !== 'string' || voterId.trim() === '') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'voterId must be a non-empty string.' }),
    };
  }

  // ── Hash the voterId — never store the raw ID ────────────────
  const hashedVoter = createHash('sha256').update(voterId.trim()).digest('hex');

  // ── Get Storage instance ────────────────────────────────────
  const store = getRoadmapStore();

  try {
    const issueKey = `issue:${issueNumber}`;

    // Read existing record (missing == empty)
    let record = { count: 0, voters: [], updated_at: null };
    const existing = await store.get(issueKey, { type: 'json' });
    if (existing) record = existing;

    const alreadyVoted = record.voters.includes(hashedVoter);

    // ── Toggle: remove vote if already cast ──────────────────
    if (alreadyVoted) {
      record.count      = Math.max(0, record.count - 1);
      record.voters     = record.voters.filter((v) => v !== hashedVoter);
      record.updated_at = new Date().toISOString();
      await store.setJSON(issueKey, record);

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueNumber, count: record.count, voted: false }),
      };
    }

    // ── New vote ──────────────────────────────────────────────
    record.count += 1;
    record.voters.push(hashedVoter);
    record.updated_at = new Date().toISOString();
    await store.setJSON(issueKey, record);

    // Update global index so votes.js can fetch all counts without scanning
    let index = { issues: [] };
    const existingIndex = await store.get(INDEX_KEY, { type: 'json' });
    if (existingIndex) index = existingIndex;

    if (!index.issues.includes(issueNumber)) {
      index.issues.push(issueNumber);
      await store.setJSON(INDEX_KEY, index);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issueNumber, count: record.count, voted: true }),
    };
  } catch (err) {
    console.error('vote.js error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};
