import type { ComponentType } from 'react'
import type { Page } from '@/payload-types'
import { CountdownBlock } from './Countdown/Component'
import { CtaBlock } from './CTA/Component'
import { FaqBlock } from './FAQ/Component'
import { FooterBlock } from './Footer/Component'
import { FormBlock } from './Form/Component'
import { HeroBlock } from './Hero/Component'
import { ImageBlock } from './Image/Component'
import { RichTextBlock } from './RichText/Component'
import { TestimonialsBlock } from './Testimonials/Component'
import { VideoBlock } from './Video/Component'

type PageBlock = NonNullable<Page['layout']>[number]
type Renderers = {
  [K in PageBlock['blockType']]: ComponentType<Extract<PageBlock, { blockType: K }>>
}

export const BLOCK_RENDERERS: Renderers = {
  hero: HeroBlock,
  richText: RichTextBlock,
  image: ImageBlock,
  video: VideoBlock,
  form: FormBlock,
  cta: CtaBlock,
  testimonials: TestimonialsBlock,
  faq: FaqBlock,
  countdown: CountdownBlock,
  footer: FooterBlock,
}

export function RenderBlocks({ blocks }: { blocks: PageBlock[] | null | undefined }) {
  return (
    <>
      {blocks?.map((block) => {
        const Component = BLOCK_RENDERERS[block.blockType] as ComponentType<PageBlock>
        return <Component key={block.id ?? undefined} {...block} />
      })}
    </>
  )
}
