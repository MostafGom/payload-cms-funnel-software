import type { Block } from 'payload'

export const CountdownBlock: Block = {
  slug: 'countdown',
  interfaceName: 'CountdownBlock',
  labels: { singular: 'Countdown', plural: 'Countdowns' },
  fields: [
    { name: 'label', type: 'text', localized: true, defaultValue: 'Offer ends in' },
    {
      name: 'endsAt',
      type: 'date',
      required: true,
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    { name: 'expiredText', type: 'text', localized: true, defaultValue: 'This offer has ended.' },
  ],
}
