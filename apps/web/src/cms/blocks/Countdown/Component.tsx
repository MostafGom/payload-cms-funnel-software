import type { CountdownBlock as CountdownBlockData } from '@/payload-types'
import { CountdownClock } from './Clock'

export function CountdownBlock({ label, endsAt, expiredText }: CountdownBlockData) {
  return (
    <section className="block-countdown">
      <CountdownClock label={label ?? ''} endsAt={endsAt} expiredText={expiredText ?? ''} />
    </section>
  )
}
