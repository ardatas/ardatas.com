import { ProjectBackdrop } from "@/components/project-backdrop";
import "./site-path";
import { createRoot, hydrateRoot } from "react-dom/client";
import { MacbookDesktop } from "@/components/macbook-desktop";
import "./macbook.css";
import { createPortal } from "react-dom";
import ProfileContacts from "@/components/profile-contacts";
import GitHubActivity, { useGitHubDays } from "@/components/github-activity";
import BuildingStatus from "@/components/building-status";

const root = document.getElementById("building-status");
if (root) createRoot(root).render(<BuildingStatus />);

const calendar = document.getElementById("github-calendar");
const contacts = document.getElementById("contact");

function ContactAndActivity() {
  const days = useGitHubDays();
  return <>
    {contacts && <ProfileContacts days={days} />}
    {calendar && createPortal(<GitHubActivity days={days} />, calendar)}
  </>;
}

if (contacts || calendar) {
  calendar?.replaceChildren();
  createRoot(contacts ?? document.createDocumentFragment()).render(<ContactAndActivity />);
}

const macbook = document.getElementById("macbook-desktop");
if (macbook) hydrateRoot(macbook, <MacbookDesktop files={JSON.parse(macbook.dataset.files || "[]")} />);

const projects = document.getElementById("project-backdrop");
if (projects) createRoot(projects).render(<ProjectBackdrop />);
