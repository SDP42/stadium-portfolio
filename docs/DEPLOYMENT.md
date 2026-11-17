# Deployment

The site is static and is hosted on Vercel at https://stadium-portfolio.vercel.app.

## Vercel

1. Import `SDP42/stadium-portfolio` in Vercel.
2. Keep the detected Vite settings: build command `npm run build`, output directory `dist`, Node 20 or newer.
3. Deploy. Every push to `main` redeploys automatically.

[`vercel.json`](../vercel.json) adds `Cache-Control: immutable` for hashed files under `/assets/` and security headers (`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) for every path.

## Analytics

`src/main.js` calls `inject()` from `@vercel/analytics`. Turn it on in the Vercel project's **Analytics** tab; visits are counted on the deployed site only.

## Continuous integration

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push and pull request: `npm ci`, `npm run check` (content rules) and `npm run build`.

## Other hosts

`npm run build` writes a self-contained `dist/`. Any static host works; hash routing needs no server rewrites.
