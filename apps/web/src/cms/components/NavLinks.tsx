import Link from 'next/link'

/** Extra admin navigation for custom views (dashboards v1). */
export function NavLinks() {
  const link = { display: 'block', padding: '4px 0', color: 'var(--theme-text)' }
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ opacity: 0.6, fontSize: 12, textTransform: 'uppercase', margin: '8px 0' }}>
        Insights
      </p>
      <Link href="/admin/analytics" style={link}>
        Funnel analytics
      </Link>
      <Link href="/admin/deliveries" style={link}>
        Destination health
      </Link>
      <Link href="/admin/duplicates" style={link}>
        Possible duplicates
      </Link>
    </div>
  )
}
