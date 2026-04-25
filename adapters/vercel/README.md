# Vercel Adapter (Coming Soon)

The core logic in `/core` is completely platform-agnostic. Adding a Vercel adapter
is straightforward — the only thing that changes is how you handle requests and
where you store votes.

---

## Why not Vercel Blob?

It's a natural question: Netlify uses Blobs, so why not Vercel Blob?

**Netlify Blobs** is a key/value store. You call `store.get('issue:42')` and
`store.setJSON('issue:42', data)` — atomic reads and writes on named keys.

**Vercel Blob** is object/file storage (think S3). It stores files at URLs and
doesn't support atomic read/modify/write. That's a problem for vote counts:
two users voting simultaneously would both read `count: 3`, both write
`count: 4`, and one vote would be silently lost.

**The correct Vercel equivalent is [Vercel KV](https://vercel.com/docs/storage/vercel-kv)**
— a Redis-backed key/value store that supports atomic increments and the same
index pattern used by the Netlify adapter.

---

## Recommended storage: Vercel KV

Vercel KV is the closest equivalent to Netlify Blobs for this use case:
- Key/value API (`get`, `set`, `hset`)
- Atomic operations (no race conditions on vote counts)
- Available natively in the Vercel dashboard

### Example implementation

```js
// adapters/vercel/api/vote.js
import { kv }          from '@vercel/kv';
import { createHash }  from 'crypto';
import { getConfig }   from '../../../core/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const { issueNumber, voterId } = req.body;

  if (typeof issueNumber !== 'number' || !Number.isInteger(issueNumber) || issueNumber < 1) {
    return res.status(400).json({ error: 'issueNumber must be a positive integer.' });
  }
  if (!voterId || typeof voterId !== 'string' || voterId.trim() === '') {
    return res.status(400).json({ error: 'voterId must be a non-empty string.' });
  }

  const hashedVoter = createHash('sha256').update(voterId.trim()).digest('hex');
  const issueKey    = `issue:${issueNumber}`;

  // Read existing record
  let record = (await kv.get(issueKey)) || { count: 0, voters: [] };
  const alreadyVoted = record.voters.includes(hashedVoter);

  if (alreadyVoted) {
    record.count   = Math.max(0, record.count - 1);
    record.voters  = record.voters.filter(v => v !== hashedVoter);
    record.updated_at = new Date().toISOString();
    await kv.set(issueKey, record);
    return res.json({ issueNumber, count: record.count, voted: false });
  }

  record.count += 1;
  record.voters.push(hashedVoter);
  record.updated_at = new Date().toISOString();
  await kv.set(issueKey, record);

  // Update global index
  const index = (await kv.get('index')) || { issues: [] };
  if (!index.issues.includes(issueNumber)) {
    index.issues.push(issueNumber);
    await kv.set('index', index);
  }

  return res.json({ issueNumber, count: record.count, voted: true });
}
```

```js
// adapters/vercel/api/votes.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const index = await kv.get('index');
  if (!index?.issues?.length) return res.json({});

  const results = await Promise.all(
    index.issues.map(async (n) => ({ n, record: await kv.get(`issue:${n}`) }))
  );

  const counts = {};
  results.forEach(({ n, record }) => {
    counts[String(n)] = { count: record?.count ?? 0 };
  });

  res.json(counts);
}
```

---

## Function structure

```
adapters/vercel/
  api/
    roadmap.js   ← same core/github.js call, different handler signature
    vote.js      ← same SHA-256 logic, Vercel KV storage
    votes.js     ← same index pattern, Vercel KV storage
```

## Handler signature difference

Netlify functions export `exports.handler = async (event) => { statusCode, headers, body }`.

Vercel functions export `export default async function handler(req, res) { ... }` and use
`res.json()` / `res.status(n).json()`.

The core functions (`fetchPublicRoadmapIssues`, `transformIssue`, etc.) work identically in both.

---

## Alternative storage options

If you don't want to use Vercel KV, these are compatible alternatives:

| Option | Notes |
|---|---|
| **[Upstash Redis](https://upstash.com)** | Works on any platform including Vercel. Same Redis API as Vercel KV. |
| **Supabase** | Postgres. More complex setup but gives you a full DB and admin UI. |
| **PlanetScale / Turso** | Serverless MySQL/SQLite. Good if you're already using SQL. |

All of these support the same read/modify/write pattern — just swap the client library.

---

## Environment variables

```
GITHUB_TOKEN=
GITHUB_OWNER=
GITHUB_REPO=
KV_REST_API_URL=       # from Vercel KV dashboard
KV_REST_API_TOKEN=     # from Vercel KV dashboard
```

PRs welcome!
