import { ProjectBackdrop } from "@/components/project-backdrop";
import "./site-path";
import { createRoot, hydrateRoot } from "react-dom/client";
import { MacbookDesktop } from "@/components/macbook-desktop";
import "./macbook.css";
import GitHubActivity from "@/components/github-activity";
const calendar = document.getElementById("github-calendar");
if (calendar) createRoot(calendar).render(<GitHubActivity />);

const macbook = document.getElementById("macbook-desktop");
if (macbook) hydrateRoot(macbook, <MacbookDesktop files={JSON.parse(macbook.dataset.files || "[]")} />);

const projects = document.getElementById("project-backdrop");
if (projects) createRoot(projects).render(<ProjectBackdrop />);
