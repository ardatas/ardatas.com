"use client"

// Starry nights, baked by the 21st.dev ASCII editor. Remix the original at
// https://21st.dev/community/ascii/editor?from=7ad845c6-760e-459d-b294-96ed22fe439e
const originalVideo = "https://assets.21st.dev/ascii-recipes/videos/user_3CsH4USnadu1DaOGLGegjBVQeA2/d7c70a61-4be8-497b-aa96-728173159d52.mp4"
const originalPoster = "https://assets.21st.dev/ascii-recipes/thumbnails/user_3CsH4USnadu1DaOGLGegjBVQeA2/20b7cadd-f69b-4a89-b3ec-9a1fc455a176.webp"

type AsciiArtProps = {
  className?: string
  src?: string
  imageSrc?: string
  poster?: string
  label?: string
  controls?: boolean
}

export function AsciiArt({
  className,
  src = originalVideo,
  imageSrc,
  poster = originalPoster,
  label = "starry nights — animated ASCII art",
  controls = false,
}: AsciiArtProps) {
  if (imageSrc) {
    return <img className={className} src={imageSrc} alt={label} draggable={false} loading="eager" fetchPriority="high" />
  }

  return (
    <video
      className={className}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      controls={controls}
      aria-label={label}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    >
      <source src={src} type="video/mp4" media="(prefers-reduced-motion: no-preference)" />
    </video>
  )
}
