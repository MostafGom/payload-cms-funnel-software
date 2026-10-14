/** JSON for inline <script>: escape `<` so content cannot close the tag. */
export const safeJson = (v: unknown): string => JSON.stringify(v).replace(/</g, '\\u003c')
