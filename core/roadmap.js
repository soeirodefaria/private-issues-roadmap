/**
 * core/roadmap.js
 *
 * Transforms raw GitHub issue objects into safe, public-facing roadmap items.
 * No network calls, no storage. Pure data transformation.
 *
 * @typedef {Object} RoadmapItem
 * @property {number}      number
 * @property {string}      title
 * @property {string}      excerpt      - Plain text, max 500 chars
 * @property {string[]}    labels
 * @property {string|null} status       - e.g. "status:planned"
 * @property {string|null} milestone
 * @property {string}      created_at
 * @property {string}      updated_at
 */

/**
 * @param {object} issue   - Raw GitHub issue object
 * @param {ReturnType<import('./config').getConfig>} config
 * @returns {RoadmapItem}
 */
function transformIssue(issue, config) {
  const labelNames = issue.labels.map((l) => l.name);

  // Find the first recognised status label
  const statusValues = [
    config.labels.planned,
    config.labels.inProgress,
    config.labels.shipped,
  ];
  const status = labelNames.find((l) => statusValues.includes(l)) || null;

  return {
    number:     issue.number,
    title:      issue.title,
    excerpt:    extractExcerpt(issue.body),
    labels:     labelNames,
    status,
    milestone:  issue.milestone ? issue.milestone.title : null,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
}

/**
 * Extracts a readable plain-text excerpt from a GitHub issue body.
 * Prefers the "## Overview" section; falls back to the first 200 chars.
 *
 * @param {string|null} body
 * @returns {string}
 */
function extractExcerpt(body) {
  if (!body) return '';

  const match = body.match(/##\s*Overview\s*\n+([\s\S]*?)(?=\n##|$)/i);
  if (match) return stripMarkdown(match[1].trim()).slice(0, 500);

  return stripMarkdown(body).slice(0, 200);
}

/**
 * Strips common markdown syntax and returns readable plain text.
 *
 * @param {string} text
 * @returns {string}
 */
function stripMarkdown(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/#{1,6}\s+/gm, '')              // headings
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')     // bold+italic
    .replace(/\*\*(.+?)\*\*/g, '$1')         // bold
    .replace(/\*(.+?)\*/g, '$1')             // italic
    .replace(/`{3}[\s\S]*?`{3}/g, '')        // fenced code blocks
    .replace(/`(.+?)`/g, '$1')               // inline code
    .replace(/!\[.*?\]\(.*?\)/g, '')         // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/<!--[\s\S]*?-->/g, '')         // HTML comments
    .replace(/^[-*+]\s+/gm, '')              // unordered list bullets
    .replace(/^\d+\.\s+/gm, '')              // ordered list numbers
    .replace(/^>\s+/gm, '')                  // blockquotes
    .replace(/\n{3,}/g, '\n\n')              // collapse excess blank lines
    .trim();
}

module.exports = { transformIssue, extractExcerpt, stripMarkdown };
