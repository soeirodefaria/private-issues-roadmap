/**
 * adapters/netlify/functions/roadmap.js
 *
 * Netlify Function — GET /api/roadmap
 * Returns public roadmap items sourced from a private GitHub repo.
 *
 * Required environment variables (set in Netlify UI or netlify.toml):
 *   GITHUB_TOKEN   — fine-grained PAT with read-only issues scope
 *   GITHUB_OWNER   — GitHub org or username
 *   GITHUB_REPO    — repository name
 */

const { getConfig }                = require('../../../core/config');
const { fetchPublicRoadmapIssues } = require('../../../core/github');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed.' }) };
  }

  const config = getConfig();

  try {
    const items = await fetchPublicRoadmapIssues(config);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(items),
    };
  } catch (err) {
    console.error('[roadmap] error:', err.message);

    // Distinguish config errors from runtime errors
    if (err.message.startsWith('Missing required')) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server misconfiguration. Check environment variables.' }),
      };
    }

    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to fetch roadmap from GitHub.' }),
    };
  }
};
