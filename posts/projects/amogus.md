---
title: "Werkio"
summary: "Student jobs and academic roles at getwerkio.com"
coverImage: "/assets/logo-werkio.png"
order: -5
website: "https://getwerkio.com"
---

Werkio is a full-stack web app that collects student jobs and academic roles
from German universities, research institutes, and companies. Users receive a
personalized daily digest instead of checking each source separately.

The backend uses hexagonal architecture with Spring Boot, PostgreSQL, and Flyway.
It exposes a REST API consumed by a React and Tailwind single-page application.

Google OAuth and double opt-in handle registration. Tag-based matching filters
more than 2,000 jobs, and Brevo SMTP sends the digest at 07:00 Europe/Berlin.

The application runs on AWS EC2 with Docker Compose and Caddy TLS. Operations
include EBS snapshot backups, self-hosted Umami analytics, and UptimeRobot
monitoring.
