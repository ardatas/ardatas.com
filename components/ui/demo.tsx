import CalendarThree from "@/components/ui/calendar-03"
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

export function DemoCalendarThree() {
  return (
    <div className="flex min-h-[420px] w-full items-center justify-center p-6">
      <CalendarThree />
    </div>
  )
}
