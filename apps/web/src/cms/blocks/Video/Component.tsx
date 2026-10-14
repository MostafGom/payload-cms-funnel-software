import type { Media, VideoBlock as VideoBlockData } from '@/payload-types'

/** Privacy-friendly embeds: youtube-nocookie and Vimeo's dnt flag (no third-party cookies before consent). */
export function VideoBlock({ source, videoId, file, title }: VideoBlockData) {
  if (source === 'upload') {
    const media = typeof file === 'object' ? (file as Media) : null
    if (!media?.url) return null
    return (
      <section className="block-video">
        <video controls preload="metadata" src={media.url} title={title} data-track="video" />
      </section>
    )
  }
  if (!videoId || !/^[\w-]{1,64}$/.test(videoId)) return null
  const src =
    source === 'vimeo'
      ? `https://player.vimeo.com/video/${videoId}?dnt=1`
      : `https://www.youtube-nocookie.com/embed/${videoId}`
  return (
    <section className="block-video">
      <div className="ratio">
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allow="encrypted-media; picture-in-picture"
          allowFullScreen
        />
      </div>
    </section>
  )
}
