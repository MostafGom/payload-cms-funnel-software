import { RichText } from '@payloadcms/richtext-lexical/react'
import type { RichTextBlock as RichTextBlockData } from '@/payload-types'

export function RichTextBlock({ content }: RichTextBlockData) {
  return (
    <section className="block-richtext">
      <RichText data={content} />
    </section>
  )
}
