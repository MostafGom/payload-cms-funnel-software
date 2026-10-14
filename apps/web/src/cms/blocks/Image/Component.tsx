import Image from 'next/image'
import type { ImageBlock as ImageBlockData, Media } from '@/payload-types'

export function ImageBlock({ image, caption, size, priority }: ImageBlockData) {
  const media = typeof image === 'object' ? (image as Media) : null
  if (!media?.url) return null
  return (
    <figure className={`block-image block-image--${size ?? 'content'}`}>
      <Image
        src={media.url}
        alt={media.alt ?? ''}
        width={media.width ?? 1200}
        height={media.height ?? 675}
        priority={!!priority}
        sizes={size === 'full' ? '100vw' : '(max-width: 960px) 100vw, 960px'}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  )
}
