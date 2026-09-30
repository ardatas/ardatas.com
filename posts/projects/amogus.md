---
title: "Werkio"
summary: "Full-stack job platform with AI-assisted application workflows"
coverImage: "/assets/logo-werkio.png"
order: -5
website: "https://getwerkio.com"
highlights:
  - "Built Gemini-based form mapping and cover-letter drafting across a TypeScript browser extension, React frontend, and Spring Boot backend."
  - "Added structured-output validation, evidence checks, and review steps for uncertain or sensitive fields. Users stay in control of form submission."
  - "Wrote Playwright end-to-end tests for browser workflows and failure cases, plus backend integration and security tests."
---

I built Werkio, a full-stack web app for finding student jobs and academic roles,
and developed its AI-assisted application workflows across a TypeScript browser
extension, React frontend, and Spring Boot backend.

The Copilot uses Gemini to map profile data to application forms and draft
cover letters from approved facts and job context. I added structured JSON
validation and evidence checks, with review steps for uncertain or sensitive
fields. Users review the proposed changes and submit applications themselves.

I implemented workflow state and error handling so the extension can explain
failures and invalidate stale plans when the active page changes. Access checks,
CSRF protection, and feature flags control when actions are available.

I wrote Playwright end-to-end tests that load the browser extension against
controlled application forms. They cover multi-step forms, sensitive fields,
provider and network failures, preserving user edits, and manual submission.
Backend unit, integration, and security tests cover the API and persistence
boundaries; GitHub Actions runs the checks before integration.

The platform uses PostgreSQL and Flyway behind a REST API, with Docker Compose
and Caddy on AWS EC2. Job matching and email digests support the core job-search
product.

[Visit Werkio](https://getwerkio.com).
