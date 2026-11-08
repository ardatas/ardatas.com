import { renderToStaticMarkup } from "react-dom/server"
import { AsciiArt } from "@/components/ui/starry-nights"

const label = "Tile portrait of Arda sitting in the sunshine in front of a historic building"

console.log(renderToStaticMarkup(
  <AsciiArt className="whoami-portrait" imageSrc="/portrait/arda-tiles.webp" label={label} />
))
