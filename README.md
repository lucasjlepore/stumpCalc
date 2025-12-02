# Forest City Stump Works

Offline-ready (PWA) stump grinding quote tool hosted on GitHub Pages.

## What it does
- Single-page React app (Vite + Tailwind) with local (browser) storage.
- Pricing: flat $5/inch per stump; HST toggle at 13%. No volume discounts.
- Per-stump inputs: diameter, count, location note, optional notes/complexity flags, up to 3 photos (kept in memory for sharing).
- Live totals with Subtotal, HST, Total.
- Sharing/export:
  - Share/Copy text (formatted quote) with up to 3 compressed photos when Web Share supports files.
  - Email quote button (formatted text; mailto can’t attach files).
  - Export PDF of the on-screen summary.
- PWA enabled (install to home screen).

## Limits / notes
- Photos are not persisted across reloads (to avoid localStorage quota issues); they stay in memory for the current session.
- Mailto cannot attach photos; use Share on supported mobile browsers for photo attachments.
- Hosted at: https://lucasjlepore.github.io/forestcitystumpworks/

## Develop
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deploy (GitHub Pages via Actions)
Push to `main`; the workflow publishes `dist/` to Pages. Base path is `/forestcitystumpworks/` for the project URL above.

## Optional: Email sending via Cloudflare Worker + AWS SES
- Worker code: `worker/email-worker.js` (SES raw email with attachments)
- Configure `worker/wrangler.toml` and set env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SES_FROM` (verified in SES).
- Deploy: `cd worker && wrangler deploy` (requires Cloudflare account + wrangler CLI).
- Frontend would POST `{ to, subject, html, photos }` to the Worker URL; Worker sends HTML email with attachments through SES.
