/**
 * adapters/netlify/functions/votes.js
 *
 * Netlify Function — GET /api/votes
 *
 * Returns aggregate vote counts for all roadmap issues.
 * The voters array is deliberately never exposed to the client.
 *
 * Includes a local fallback for development without a linked site.
 */

const { getRoadmapStore } = require('../../../core/store');

const INDEX_KEY = 'index';

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const store = getRoadmapStore();
    const index = await store.get(INDEX_KEY, { type: 'json' });

    // No votes recorded yet
    if (!index || !Array.isArray(index.issues) || index.issues.length === 0) {
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({}) };
    }

    // Fetch all issue blobs in parallel
    const results = await Promise.all(
      index.issues.map(async (issueNumber) => {
        const record = await store.get(`issue:${issueNumber}`, { type: 'json' });
        return { issueNumber, count: record ? record.count : 0 };
      })
    );

    // Build public counts map — voters array deliberately excluded
    const counts = {};
    results.forEach(({ issueNumber, count }) => {
      counts[String(issueNumber)] = { count };
    });

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify(counts) };
  } catch (err) {
    console.error('votes.js error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error.' }) };
  }
};
