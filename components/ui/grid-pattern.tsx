import { useId, type SVGProps } from "react"
import { cn } from "@/lib/utils"

interface GridPatternProps extends SVGProps<SVGSVGElement> {
  width?: number
  height?: number
  x?: number
  y?: number
  squares?: Array<[number, number]>
}

export function GridPattern({
  width = 40, height = 40, x = -1, y = -1, squares, strokeDasharray = "0", className, ...props
}: GridPatternProps) {
  const id = useId()
  return (
    <svg aria-hidden="true" className={cn("pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30", className)} {...props}>
      <defs>
        <pattern id={id} width={width} height={height} x={x} y={y} patternUnits="userSpaceOnUse">
          <path d={`M.5 ${height}V.5H${width}`} fill="none" strokeDasharray={strokeDasharray} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" strokeWidth="0" fill={`url(#${id})`} />
      {squares && <svg x={x} y={y} className="overflow-visible">
        {squares.map(([col, row]) => <rect key={`${col}-${row}`} strokeWidth="0"
          width={width - 1} height={height - 1} x={col * width + 1} y={row * height + 1} />)}
      </svg>}
    </svg>
  )
}
