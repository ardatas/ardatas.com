"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar-03-utils/calendar"
import { ScrollArea } from "@/components/ui/scroll-area"

export const title = "Calendar as Appointment Picker"

const availableTimes = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM",
]

export default function CalendarThree() {
  const [date, setDate] = useState(() => new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  return (
    <div className="mx-auto grid w-full max-w-[860px] overflow-hidden rounded-md border border-input bg-background sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Calendar mode="single" required fixedWeeks selected={date} onSelect={day => {
        setDate(day)
        setSelectedTime(null)
      }} />
      <div className="flex min-h-0 flex-col border-t border-input sm:relative sm:border-l sm:border-t-0">
        <div className="flex min-h-0 flex-col gap-4 py-5 sm:py-6 sm:absolute sm:inset-0">
          <p className="text-center text-base font-medium">Available Times</p>
          <ScrollArea className="h-52 sm:h-auto sm:min-h-0 sm:flex-1">
            <div role="group" aria-label="Available times" className="grid gap-3 px-4 pb-1 sm:px-6">
              {availableTimes.map(time => (
                <Button key={time} type="button" className="h-11 text-base" aria-pressed={selectedTime === time}
                  variant={selectedTime === time ? "default" : "outline"} onClick={() => setSelectedTime(time)}>
                  {time}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
