import type { Block } from 'payload'
import { CountdownBlock } from './Countdown/config'
import { CtaBlock } from './CTA/config'
import { FaqBlock } from './FAQ/config'
import { FooterBlock } from './Footer/config'
import { FormBlock } from './Form/config'
import { HeroBlock } from './Hero/config'
import { ImageBlock } from './Image/config'
import { RichTextBlock } from './RichText/config'
import { TestimonialsBlock } from './Testimonials/config'
import { VideoBlock } from './Video/config'

/**
 * Block registry (plan §6, FR-FUN-2). Adding a block:
 *  1. create `blocks/<Name>/config.ts` + `Component.tsx`
 *  2. register it here AND in `renderers.tsx`
 *  3. `pnpm --filter @fp/web migrate:create` (blocks add tables)
 * `registry.test.ts` fails if a config has no renderer or vice versa.
 */
export const PAGE_BLOCKS: Block[] = [
  HeroBlock,
  RichTextBlock,
  ImageBlock,
  VideoBlock,
  FormBlock,
  CtaBlock,
  TestimonialsBlock,
  FaqBlock,
  CountdownBlock,
  FooterBlock,
]
