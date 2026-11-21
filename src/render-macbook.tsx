import { renderToString } from "react-dom/server";
import { MacbookDesktop } from "@/components/macbook-desktop";

console.log(renderToString(<MacbookDesktop />));
