/**
 * Shared heading→id slugifier. Used by both the registry's heading extraction (for the TOC)
 * and LegalDocumentRenderer's custom h2/h3 renderers, so anchor ids always match without
 * needing a rehype-slug dependency.
 */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}
