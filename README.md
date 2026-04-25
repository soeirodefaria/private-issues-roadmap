# private-issues-roadmap

**Use your private GitHub Issues as a public product roadmap, without exposing your repo or token.**

A lightweight, open-source starter that lets you surface selected GitHub Issues as a public-facing roadmap page with anonymous voting — deployable to Netlify in under 10 minutes.

---

## Why this exists

In the era of vibe-coding, you don't need fancy, over-engineered tools to get things moving. GitHub Issues and Projects are already a world-class task tracker—you shouldn't need a separate SaaS just to show the world what you're building.

The problem: your repo is private, but you want to share progress and collect user signal publicly.

This project bridges that gap. Tag your private issues with `visibility:public`, deploy a few serverless functions, and you have a live, public roadmap with anonymous voting. No extra database, no auth, and zero friction.

---

## Inspiration & Live Example

This project was inspired by the public roadmap implementation at [fluxxo.ai/roadmap](https://fluxxo.ai/roadmap).

It takes the same "vibe-coding" philosophy—using existing tools (GitHub) as the source of truth—and packages it as a portable starter for any product team.

---

## Features

- 🔒 **Private repo stays private** — your GitHub token never leaves the server
- 🏷️ **Label-driven** — `visibility:public` opts an issue into the roadmap
- 📊 **Status lanes** — `status:planned`, `status:in-progress`, `status:shipped`
- 👍 **Anonymous voting** — browser UUID hashed server-side with SHA-256
- ⚡ **Zero build step** — vanilla HTML/CSS/JS frontend, no bundler needed
- 🌐 **Netlify-first** — one `netlify.toml`, three functions, done
- 🔜 **Vercel-ready architecture** — core logic is platform-agnostic

---

## Architecture

```
/core                          ← platform-agnostic logic
  config.js                   ← env var config
  github.js                   ← GitHub API fetching + filtering
  roadmap.js                  ← issue → safe public object transform
  votes.js                    ← storage contract documentation

/adapters
  /netlify
    /functions
      roadmap.js              ← GET /api/roadmap
      vote.js                 ← POST /api/vote
      votes.js                ← GET /api/votes
  /vercel
    README.md                 ← future adapter guide

/examples
  /vanilla
    roadmap.html              ← HTML shell
    roadmap.css               ← all styles (design tokens at top)
    roadmap.js                ← all client-side logic

.env.example
netlify.toml
package.json
```

The `core/` modules have zero dependencies on Netlify, Vercel, or any runtime platform. Adapters are thin wrappers that handle request parsing, call core functions, and write responses.

---

## Netlify setup

### 1. Clone and install

```bash
git clone https://github.com/your-username/private-issues-roadmap
cd private-issues-roadmap
npm install
```

### 2. Create a GitHub token

Go to **GitHub → Settings → Developer settings → Fine-grained personal access tokens**.

Create a token with:
- **Repository access**: your private repo only
- **Permissions**: `Issues` → Read-only

Copy the token.

### 3. Add environment variables

In the **Netlify UI → Site configuration → Environment variables**, add:

| Variable | Value |
|---|---|
| `GITHUB_TOKEN` | Your fine-grained PAT |
| `GITHUB_OWNER` | Your GitHub org or username |
| `GITHUB_REPO` | Your private repo name |

Or copy `.env.example` to `.env` for local development:

```bash
cp .env.example .env
# fill in your values
```

### 4. Deploy to Netlify

Connect your repo in the Netlify UI. The `netlify.toml` already points to the right functions directory — no extra config needed.

For local dev with real Blobs (voting):

```bash
npm install -g netlify-cli
netlify link        # link to your deployed Netlify site
netlify dev         # starts local dev server with live Blobs
```

### 5. Set up GitHub labels

In your private repo, create these labels:

| Label | Purpose |
|---|---|
| `visibility:public` | Makes an issue appear on the roadmap |
| `status:planned` | Shows as "Planned" (purple) |
| `status:in-progress` | Shows as "In Progress" (amber) |
| `status:shipped` | Shows as "Shipped" (green) |

Tag your issues and deploy — they'll appear on the roadmap immediately.

---

## Adding the roadmap to your site

Copy the three files from `examples/vanilla/` into your project:

```
roadmap.html
roadmap.css
roadmap.js
```

If you're **not** using Netlify, update the `ENDPOINTS` object at the top of `roadmap.js`:

```js
const ENDPOINTS = {
  roadmap: '/api/roadmap',   // ← change to your platform's path
  vote:    '/api/vote',
  votes:   '/api/votes',
};
```

---

## Issue body conventions

The roadmap excerpt is extracted from the issue body automatically.

**Preferred** — add an `## Overview` section:

```markdown
## Overview

A short description of what this feature does and why it matters.

## Details
(internal, not shown publicly)
```

**Fallback** — if no `## Overview` section exists, the first 200 characters of the body are used (markdown stripped).

---

## How anonymous voting works

1. When a user first visits the roadmap, a UUID is generated in their browser and stored in `localStorage`.
2. When they click vote, the UUID is sent to `POST /api/vote` along with the issue number.
3. The server hashes the UUID with SHA-256 and stores only the hash.
4. On re-visit, `localStorage` is used to restore the voted state visually.
5. The vote toggle works: clicking again removes the vote.

**What this is not:** This is not fraud-proof. Someone determined can clear localStorage and vote again. It's lightweight social signal, not a binding poll.

---

## Security notes

- Your `GITHUB_TOKEN` is only ever used server-side, inside the Netlify function.
- Raw voter UUIDs are never logged or stored. Only SHA-256 hashes reach the database.
- The `voters` array is never returned to the client — only aggregate `count` values.
- Issues not tagged `visibility:public` are silently filtered before the response is sent.
- No assignees, internal comments, or private fields are ever returned.

---

## Limitations

- **One vote per browser**, not per person. Clearing localStorage resets the vote.
- **No real-time updates** — the count updates after your own vote, but doesn't live-sync with other users.
- **100 issues max per fetch** — GitHub's API `per_page` limit. Pagination can be added if needed.
- **Netlify Blobs** is the only supported vote storage for now. See `adapters/vercel/README.md` for future Vercel support.

---

## Customising the design

All CSS custom properties (design tokens) are at the top of `examples/vanilla/roadmap.css`:

```css
:root {
  --accent:       #6655ff;   /* ← swap for your brand colour */
  --bg:           #f2f0fb;
  --text:         #1a1528;
  /* ... */
}
```

The fonts (Outfit, Inter, DM Mono) are loaded from Google Fonts. Swap them out in the `<head>` of `roadmap.html` if you prefer different typography.

---

## Vercel support

Not implemented yet, but the architecture is ready for it.

The correct Vercel equivalent to Netlify Blobs is **Vercel KV** (Redis-backed key/value store), not Vercel Blob. Vercel Blob is object/file storage and doesn't support the atomic read/modify/write needed for reliable vote counts.

See [`adapters/vercel/README.md`](adapters/vercel/README.md) for:
- Why Vercel Blob isn't the right fit (and what is)
- A working Vercel KV implementation example
- Alternative storage backends (Upstash Redis, Supabase)

PRs welcome.

---

## Project roadmap

- [x] Netlify adapter (roadmap, vote, votes)
- [x] Vanilla JS frontend example
- [x] SHA-256 voter hashing
- [x] Toggle voting
- [x] Vercel adapter architecture guide
- [ ] Vercel adapter implementation
- [ ] Pagination for repos with many issues
- [ ] Optional label filtering in the UI
- [ ] `netlify dev` mock for voting without a linked site

---

## License

MIT
