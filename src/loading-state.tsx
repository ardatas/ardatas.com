import "./site-path";
import { createRoot, hydrateRoot } from "react-dom/client";
import { MacbookDesktop } from "@/components/macbook-desktop";
import "./macbook.css";
import GitHubActivity from "@/components/github-activity";
import BuildingStatus from "@/components/building-status";

const root = document.getElementById("building-status");
if (root) createRoot(root).render(<BuildingStatus />);

const calendar = document.getElementById("github-calendar");
if (calendar) createRoot(calendar).render(<GitHubActivity />);

const macbook = document.getElementById("macbook-desktop");
if (macbook) hydrateRoot(macbook, <MacbookDesktop />);
