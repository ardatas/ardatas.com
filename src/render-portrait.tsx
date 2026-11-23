import { renderToStaticMarkup } from "react-dom/server"
import { AsciiArt } from "@/components/ui/starry-nights"

const label = "Tile portrait of Arda sitting in the sunshine in front of a historic building"

console.log(renderToStaticMarkup(
  <picture>
    <source media="(max-width: 639px)" srcSet="/portrait/arda-tiles-mobile.webp" />
    <AsciiArt className="whoami-portrait" imageSrc="/portrait/arda-tiles.webp" label={label} />
  </picture>
))
