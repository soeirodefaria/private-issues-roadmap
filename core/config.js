/**
 * core/config.js
 *
 * Reads environment variables and exports a single config object.
 * All adapters and core modules should import from here rather than
 * reading process.env directly — makes future Vercel / edge support easy.
 */

function getConfig() {
  return {
    github: {
      token: process.env.GITHUB_TOKEN || '',
      owner: process.env.GITHUB_OWNER || '',
      repo:  process.env.GITHUB_REPO  || '',
    },

    labels: {
      /** Issues must carry this label to appear on the public roadmap. */
      public:     process.env.ROADMAP_PUBLIC_LABEL       || 'visibility:public',
      planned:    process.env.ROADMAP_STATUS_PLANNED      || 'status:planned',
      inProgress: process.env.ROADMAP_STATUS_IN_PROGRESS || 'status:in-progress',
      shipped:    process.env.ROADMAP_STATUS_SHIPPED      || 'status:shipped',
    },
  };
}

module.exports = { getConfig };
