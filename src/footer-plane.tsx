import { createRoot } from "react-dom/client";
import InfinitePlaneBg from "@/components/ui/infinite-plane";

const host = document.getElementById("footer-plane");
if (host) createRoot(host).render(<InfinitePlaneBg speed={0.42} />);
