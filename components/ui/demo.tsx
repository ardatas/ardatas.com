import Safari_01 from "@/components/ui/safari-01"
import { AsciiArt } from "@/components/ui/starry-nights"

export default function AsciiArtDemo() {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <AsciiArt className="h-full w-full" />
    </div>
  )
}

export function SafariDemo() {
  return <Safari_01 />
}
