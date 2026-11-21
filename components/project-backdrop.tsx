import { useEffect, useRef } from "react"
import { GridPattern } from "@/components/ui/grid-pattern"

// Original pixel artwork inspired by BlackisPlay's Pac-Man Ghost Loader on Uiverse.
const corners = [[0, 0], [100, 0], [100, 100], [0, 100]] as const

export function ProjectBackdrop() {
  const ghost = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const sprite = ghost.current!
    const track = sprite.parentElement!
    const motion = matchMedia("(prefers-reduced-motion: reduce)")
    let corner = 0
    let direction = Math.random() < .5 ? 1 : -1
    let visible = false
    let leg: Animation | undefined
    function travel() {
      const next = (corner + direction + corners.length) % corners.length
      const [x, y] = corners[corner]
      const [toX, toY] = corners[next]
      const distance = x === toX ? track.clientHeight : track.clientWidth
      sprite.style.setProperty("--look-x", String(Math.sign(toX - x)) + "px")
      sprite.style.setProperty("--look-y", String(Math.sign(toY - y)) + "px")
      leg = sprite.animate([
        { left: x + "%", top: y + "%" }, { left: toX + "%", top: toY + "%" },
      ], { duration: Math.max(800, distance / 65 * 1000), easing: "linear", fill: "forwards" })
      leg.onfinish = () => {
        leg?.cancel()
        corner = next
        if (Math.random() < .25) direction *= -1
        travel()
      }
    }
    function sync() {
      if (motion.matches || !visible || document.hidden) leg?.pause()
      else if (!leg) travel()
      else leg.play()
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() })
    observer.observe(track)
    motion.addEventListener("change", sync)
    document.addEventListener("visibilitychange", sync)
    return () => {
      observer.disconnect()
      motion.removeEventListener("change", sync)
      document.removeEventListener("visibilitychange", sync)
      leg?.cancel()
    }
  }, [])

  return <>
    <GridPattern width={32} height={32} squares={[[1, 2], [5, 0], [12, 3], [19, 1], [25, 5], [3, 8]]} />
    <div className="project-ghost-track">
      <svg ref={ghost} className="project-ghost" viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
        <path fill="#d83b43" d="M5 1h6v1h2v2h1v2h1v9h-2v-2h-2v2H9v-2H7v2H5v-2H3v2H1V6h1V4h1V2h2z" />
        <path fill="#fff" d="M3 5h4v5H3zm6 0h4v5H9z" />
        <path className="project-ghost-eyes" fill="#243d81" d="M4 7h2v2H4zm6 0h2v2h-2z" />
      </svg>
    </div>
  </>
}
