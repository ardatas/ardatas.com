"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, type DayPickerProps } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = DayPickerProps

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const navButton = cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0")
  return (
    <DayPicker
      className={cn("p-3", className)}
      showOutsideDays={showOutsideDays}
      classNames={{
        months: "relative",
        month_caption: "flex h-7 items-center justify-center",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 top-0 flex justify-between pointer-events-none",
        button_previous: cn(navButton, "pointer-events-auto"),
        button_next: cn(navButton, "pointer-events-auto"),
        month_grid: "mt-3 w-full border-collapse text-center",
        weekday: "h-8 text-xs font-normal text-muted-foreground",
        day: "p-0",
        day_button: cn(buttonVariants({ variant: "ghost" }), "h-9 w-full p-0 font-normal"),
        today: "[&_button]:underline [&_button]:underline-offset-4",
        outside: "text-muted-foreground",
        selected: "[&_button]:bg-primary [&_button]:text-primary-foreground",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, size }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className={cn("h-4 w-4", className)} size={size} aria-hidden />
        },
      }}
      {...props}
    />
  )
}
