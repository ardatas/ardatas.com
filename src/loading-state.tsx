import { createRoot } from "react-dom/client";
import GitHubActivity from "@/components/github-activity";
import BuildingStatus from "@/components/building-status";

const root = document.getElementById("building-status");
if (root) createRoot(root).render(<BuildingStatus />);

const calendar = document.getElementById("github-calendar");
if (calendar) createRoot(calendar).render(<GitHubActivity />);
