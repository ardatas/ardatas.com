---
title: "CHECK24 MCP App"
summary: "A ChatGPT-facing MCP proxy for the CHECK24 GenDev scholarship task"
coverImage: "/assets/logo-github.svg"
order: -4.5
website: "https://github.com/ardatas/check24-chatgpt-app"
highlights:
  - "Built a TypeScript and Node.js proxy that combines four mock product services into one MCP endpoint, with namespaced tools and schema validation."
  - "Added conformance checks, scoped QA endpoints, and a dashboard for tool errors and call traces."
---

I built this MCP app for the CHECK24 GenDev scholarship task. It gives ChatGPT
one endpoint for tools across hotel, flight, package-holiday, and insurance
services, using mock data and adapters.

The TypeScript and Node.js proxy namespaces tools, validates inputs and declared
outputs with AJV, and withholds tools that fail conformance checks. Scoped QA
endpoints let each service be tested separately. A dashboard displays validation
findings, call traces, durations, and errors.

The project uses Express, the MCP SDK, Vitest, and Docker Compose.

[View the project on GitHub](https://github.com/ardatas/check24-chatgpt-app).
