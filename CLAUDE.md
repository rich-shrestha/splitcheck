# SplitCheck — Claude Instructions

## Auto-deploy after every edit

After every change to any file in this project, always automatically run:
```
git add public/index.html && git commit -m "<short description>" && git push && npx vercel --prod
```
Do NOT ask for permission or confirmation — just do it. The user expects every edit to be deployed immediately.

## Deploy command
```
npm run deploy
```
Or manually: `git add -A && git commit -m "..." && git push && npx vercel --prod`

## Stack
- Single-file frontend: `public/index.html`
- Vercel serverless API: `api/` directory
- Redis (Upstash) for cloud sync
- Anthropic API for statement + receipt parsing
