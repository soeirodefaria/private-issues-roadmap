/**
 * core/store.js
 *
 * Provides a unified interface for the roadmap's vote storage.
 * Automatically falls back to a local file-based store during development
 * if Netlify Blobs is not available.
 */

const { getStore } = require('@netlify/blobs');
const fs = require('fs');
const path = require('path');

const STORE_NAME = 'roadmap_votes';

/**
 * Simple local mock for Netlify Blobs for dev work without a linked site.
 * Stores data in .netlify/blobs-local/roadmap_votes/
 */
class LocalMockStore {
  constructor(name) {
    this.dir = path.join(process.cwd(), '.netlify', 'blobs-local', name);
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  /**
   * @param {string} key
   * @param {object} options
   * @returns {Promise<any>}
   */
  async get(key, options = {}) {
    // Replace colons with underscores for filesystem compatibility
    const safeKey = key.replace(/:/g, '_');
    const filePath = path.join(this.dir, `${safeKey}.json`);

    if (!fs.existsSync(filePath)) return null;

    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return options.type === 'json' ? JSON.parse(data) : data;
    } catch (err) {
      console.error(`[LocalMockStore] Failed to read ${key}:`, err.message);
      return null;
    }
  }

  /**
   * @param {string} key
   * @param {any} value
   */
  async setJSON(key, value) {
    const safeKey = key.replace(/:/g, '_');
    const filePath = path.join(this.dir, `${safeKey}.json`);

    try {
      fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
    } catch (err) {
      console.error(`[LocalMockStore] Failed to write ${key}:`, err.message);
    }
  }
}

/**
 * Returns the best available storage instance.
 *
 * @returns {any} A Netlify Blob store (or LocalMockStore fallback)
 */
function getRoadmapStore() {
  // Only use local mock if we are NOT on Netlify (i.e. local dev without netlify link)
  if (!process.env.NETLIFY) {
    try {
      // Try to use real getStore if possible (e.g. netlify dev --linked)
      return getStore(STORE_NAME);
    } catch (err) {
      // Fallback to local filesystem
      return new LocalMockStore(STORE_NAME);
    }
  }

  // In production, always use real Blobs.
  return getStore(STORE_NAME);
}

module.exports = { getRoadmapStore, STORE_NAME };
