import { createRoot } from "react-dom/client";
import BuildingStatus from "@/components/building-status";

const root = document.getElementById("building-status");
if (root) createRoot(root).render(<BuildingStatus />);
