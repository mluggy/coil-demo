# Security Policy

## Reporting a vulnerability

If you discover a security issue in coil, please **do not** open a public GitHub issue.

Instead, email the maintainer privately or use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability) feature on this repository.

Please include:

- A description of the vulnerability
- Steps to reproduce
- The impact you're concerned about
- Any suggested mitigation

You'll get an acknowledgement within a few days.

## Scope

coil is a static-site generator + Cloudflare Pages middleware. The main areas of concern are:

- XSS via episode metadata (titles, descriptions, transcripts) — all rendering paths should escape user content.
- SSR injection in `functions/_middleware.js` — the middleware echoes request-derived data into HTML responses.
- Credential leakage — the pipeline uses AWS, Cloudflare R2, Gemini API, and Cloudflare Pages credentials via GitHub Actions secrets. These must never appear in committed files or build artifacts.

Forks with public GitHub repositories are a supported use case. Any finding that causes a fork to leak its own secrets is in scope.

## Out of scope

- Bugs in upstream dependencies (report those to the respective projects)
- DoS via large podcast files (self-hosted; users are responsible for their own infra)
