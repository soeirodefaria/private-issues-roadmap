/**
 * core/github.js
 *
 * All GitHub REST API logic lives here. Zero Netlify / Vercel dependencies.
 *
 * Exported functions:
 *   fetchPublicRoadmapIssues(config)  → RoadmapItem[]
 */

const { transformIssue } = require('./roadmap');

/**
 * Fetches open issues from a private GitHub repo and returns only those
 * that carry the public visibility label, transformed into safe public objects.
 *
 * @param {ReturnType<import('./config').getConfig>} config
 * @returns {Promise<import('./roadmap').RoadmapItem[]>}
 */
async function fetchPublicRoadmapIssues(config) {
  const { token, owner, repo } = config.github;

  if (!token || !owner || !repo) {
    throw new Error('Missing required GitHub config: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO');
  }

  const url =
    `https://api.github.com/repos/${encodeURIComponent(owner)}` +
    `/${encodeURIComponent(repo)}/issues?state=open&per_page=100`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${body}`);
  }

  const issues = await response.json();

  return issues
    .filter((issue) => {
      if (issue.pull_request) return false;
      const names = issue.labels.map((l) => l.name);
      return names.includes(config.labels.public);
    })
    .map((issue) => transformIssue(issue, config));
}

module.exports = { fetchPublicRoadmapIssues };
