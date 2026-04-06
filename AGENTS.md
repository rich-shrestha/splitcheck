# SplitCheck Agent Notes

## What This Project Is

SplitCheck is a Vercel-hosted expense-splitting app with:

- single-file frontend in `public/index.html`
- serverless API routes in `api/`
- Redis via Upstash for sync/state
- AI-assisted statement and receipt parsing

## Read First

- `CLAUDE.md`
- `public/index.html`
- `api/`
- `lib/redis.js`

## Run / Deploy

- Primary deploy path: `npm run deploy`
- Manual deploy path: `git add -A && git commit -m "..." && git push && npx vercel --prod`

## Repo-Specific Constraint

- `CLAUDE.md` says edits should be deployed immediately.
- Treat that as repo-local behavior, not a global rule.
- In Codex, still respect approval/sandbox constraints before networked deploy steps.

## Files That Matter Most

- `public/index.html`: primary product UI
- `api/parse-statement.js`: statement parsing
- `api/parse-receipt.js`: receipt parsing
- `api/push.js`: sync/push flow
- `vercel.json`: rewrites and API headers

## Risks

- Large single-file frontend can become hard to change safely
- Deploy-after-every-edit can hide quality issues if testing is skipped
- Parsing flows depend on external AI behavior and may need deterministic fallbacks

## Preferred Handoff

When starting work here, state:

1. target user flow
2. files likely to change
3. whether deploy is expected
4. whether live AI parsing behavior is in scope
