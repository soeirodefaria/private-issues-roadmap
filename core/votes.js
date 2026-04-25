/**
 * core/votes.js
 *
 * Abstract voting interface.
 * Adapters (Netlify, Vercel, etc.) implement the storage backend;
 * this file documents the shape they must conform to.
 *
 * Storage contract
 * ────────────────
 * Each issue's vote record is stored as JSON under the key `issue:{number}`:
 *
 *   {
 *     "count":      3,
 *     "voters":     ["sha256-hash-a", "sha256-hash-b", "sha256-hash-c"],
 *     "updated_at": "2026-04-25T12:00:00.000Z"
 *   }
 *
 * A global index is stored under the key `index`:
 *
 *   { "issues": [1, 2, 3] }
 *
 * This index lets adapters retrieve all vote counts without scanning the
 * entire store (which may not be supported by every backend).
 *
 * Public vote count response shape (voters list is NEVER exposed):
 *
 *   { "42": { "count": 5 }, "7": { "count": 1 } }
 *
 * Security notes
 * ──────────────
 * • The raw voterId (browser UUID) must be hashed server-side with SHA-256
 *   before being stored or compared.
 * • The voters array must never be returned to the client.
 * • Validation of issueNumber and voterId must happen in the adapter layer.
 *
 * TODO: Vercel adapter
 * ────────────────────
 * When adding Vercel support, implement the same storage contract using one of:
 *   - Vercel KV  (powered by Upstash Redis)
 *   - Upstash Redis  (direct)
 *   - Supabase Postgres
 *
 * See adapters/vercel/README.md for guidance.
 */

// Nothing to export from this file — it is intentionally documentation-only.
// Adapter implementations live in adapters/{platform}/functions/vote.js
// and adapters/{platform}/functions/votes.js.
