# GitHub Pages Deployment Guide

This document describes how Kitaab is configured for deployment to GitHub Pages.

## Overview

Kitaab is a Next.js application configured for static export. When deployed to GitHub Pages, the app runs as a Single Page Application (SPA) at `https://<username>.github.io/kitaab/`.

## Configuration

### Build Settings

The `next.config.ts` automatically applies production settings when `NODE_ENV=production`:

```typescript
const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  ...(isProd && {
    basePath: '/kitaab',
    assetPrefix: '/kitaab',
  }),
};
```

**Critical**: The build **must** run with `NODE_ENV=production` for assets to load correctly on GitHub Pages.

### NPM Scripts

```json
{
  "build": "cross-env NODE_ENV=production next build",
  "clean:out": "rimraf out",
  "deploy:local": "npm run build && echo 'Build complete. Copy out/ directory to your host.'"
}
```

- `cross-env` ensures cross-platform environment variable support
- The `out/` directory is the exported static site

## Automatic Deployment (CI/CD)

The `.github/workflows/deploy-pages.yml` workflow automatically deploys on every push to `main`:

1. Installs dependencies with `npm ci`
2. Builds with `NODE_ENV=production`
3. Copies `out/index.html` → `out/404.html` (enables SPA refresh)
4. Runs sanity checks
5. Deploys to `gh-pages` branch

### Repository Settings

Configure GitHub Pages in your repository:

1. Go to **Settings → Pages**
2. Set **Source** to "Deploy from a branch"
3. Select **gh-pages** branch and **/(root)** folder
4. Save

## Manual Deployment

To deploy manually:

```bash
# Build for production
npm run build

# Copy index.html for SPA refresh support
cp out/index.html out/404.html

# Deploy using gh-pages CLI (if installed)
npx gh-pages -d out

# Or copy out/ directory to your host
```

## Troubleshooting

### Assets 404 on GitHub Pages

**Symptom**: Site builds locally but assets 404 on GitHub Pages.

**Cause**: Build ran without `NODE_ENV=production`, so `basePath`/`assetPrefix` weren't applied.

**Fix**: Ensure `NODE_ENV=production` is set during build. Check the CI workflow or use `cross-env` in package.json.

### Refreshing nested routes returns 404

**Symptom**: Direct links or refreshes on `/kitaab/about/` return GitHub Pages 404.

**Cause**: GitHub Pages doesn't know how to handle client-side routes.

**Fix**: Ensure `out/404.html` exists (copied from `index.html`). The CI workflow does this automatically.

### Mixed content errors with AI providers

**Symptom**: Local HTTP AI providers fail on deployed HTTPS site.

**Cause**: Browsers block HTTP requests from HTTPS pages.

**Behavior**: The app automatically hides local HTTP-only providers when served over HTTPS (not localhost). Only HTTPS cloud providers (OpenAI, Anthropic, OpenRouter) are shown in the deployed app.

### Build fails in CI

**Symptom**: GitHub Actions fails with permission errors.

**Fix**: Ensure the workflow has `permissions: contents: write`.

## Post-Deploy Verification Checklist

After first deployment, verify:

- [ ] Site loads at `https://<username>.github.io/kitaab/`
- [ ] CSS/JS assets return 200 in DevTools Network tab
- [ ] Assets are served at `/kitaab/_next/static/` paths
- [ ] Client-side navigation works between routes
- [ ] Deep-link refreshes render correctly (not 404)
- [ ] Settings → AI Configuration shows only HTTPS providers
- [ ] Export features (MD/HTML/PDF) work in incognito mode

## Architecture Notes

### Why `trailingSlash: true`?

This creates folder-style output (`/about/index.html` instead of `/about.html`), which works better with GitHub Pages static hosting.

### Why copy `index.html` to `404.html`?

GitHub Pages serves `404.html` for unmatched routes. By copying `index.html`, we ensure the SPA loads and the client-side router handles the path.

### Base Path Strategy

The app uses conditional basePath/assetPrefix based on `NODE_ENV`:
- Development: No basePath (runs at `localhost:3000`)
- Production: `/kitaab` basePath (matches repo name for GitHub Pages)

If you rename the repository, update `basePath` and `assetPrefix` in `next.config.ts`.

## Security Considerations

- API keys are stored in IndexedDB (client-side only)
- No server-side relay for AI requests
- Local HTTP providers are automatically hidden on HTTPS deployments
- No secrets are committed to the repository

## Resources

- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-export)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)
