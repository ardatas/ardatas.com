---
title: "Werkio"
summary: "Full-stack platform for student jobs and academic-role discovery"
coverImage: "/assets/werkio.svg"
order: -3
---

Werkio is a full-stack web application for aggregating student jobs, academic
roles, and research opportunities into a personalized daily digest.

The backend is organized around a hexagonal architecture in Spring Boot, with
PostgreSQL for persistence and Flyway for schema migrations. The API is consumed
by a React and Tailwind single-page application.

The product workflow emphasizes consent and relevance: users confirm sign-up
through double opt-in, choose tags that describe their interests, and receive a
scheduled digest matched against a large job corpus.

Deployment work included Docker Compose, TLS termination, cloud hosting,
snapshot backups, lightweight analytics, and uptime monitoring. The result is a
practical product that combines backend design, frontend delivery, operations,
and user-focused matching logic.
