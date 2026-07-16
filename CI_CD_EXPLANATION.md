# CI/CD Workflow Explanation

## Overview

This project uses **GitHub Actions** for continuous integration. The workflow is defined in `.github/workflows/ci.yml` and runs automatically on every push and pull request targeting the `main` branch.

## What it does

The workflow is split into two independent jobs, since the project is a monorepo containing both a NestJS backend and a Next.js frontend:

### 1. Backend job
- Checks out the repository
- Sets up Node.js 20 with npm dependency caching
- Installs dependencies with `npm ci` (a clean, reproducible install based on `package-lock.json`)
- Runs `npm run lint` (ESLint) to catch style and code-quality issues
- Runs `npm run build` (`nest build`) to confirm the TypeScript compiles without errors

### 2. Frontend job
- Same checkout and Node.js setup, scoped to the `frontend/` directory
- Installs dependencies with `npm ci`
- Runs `npm run lint` (Next.js's built-in ESLint config)
- Runs `npm run build` (`next build`) to confirm the app compiles and all pages/routes build successfully
- Passes `NEXT_PUBLIC_API_URL` as a build-time environment variable, since Next.js inlines `NEXT_PUBLIC_*` variables at build time

Both jobs run in parallel and are independent — a failure in one does not block the other from running, but either failing will mark the overall check as failed on a pull request.

## Why this scope

Given the project timeline, the CI pipeline focuses on the two checks that catch the most common integration issues cheaply and quickly:

- **Lint** catches syntax errors, unused variables, and style violations before they reach `main`.
- **Build** catches TypeScript type errors and compilation failures — the same class of error that caused deployment failures during manual Railway/Netlify setup earlier in this project (e.g. missing environment variables, incorrect types).

Automated tests (unit/e2e) are not currently included in the CI pipeline, as this was deprioritized in favor of completing core features and deployment within the submission deadline. This is documented as a known limitation in the Feature Completion Report.

## How to verify it's working

1. Push a commit to `main`, or open a pull request.
2. Go to the **Actions** tab in the GitHub repository.
3. The "CI" workflow should appear with both "Backend — Lint & Build" and "Frontend — Lint & Build" jobs running.
4. A green checkmark indicates both lint and build passed for that job.