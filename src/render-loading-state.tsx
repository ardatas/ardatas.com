import { renderToStaticMarkup } from "react-dom/server";
import BuildingStatus from "@/components/building-status";
console.log(renderToStaticMarkup(<BuildingStatus />));
