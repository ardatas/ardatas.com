import { createRoot } from "react-dom/client"
import CalendarThree from "@/components/ui/calendar-03"

const picker = document.getElementById("appointment-picker")
if (picker) createRoot(picker).render(<CalendarThree />)
