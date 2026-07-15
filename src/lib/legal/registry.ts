import { parseFrontmatter } from './frontmatter'
import { slugifyHeading } from './slugify'
import type { LegalDocument, LegalDocumentMeta, LegalCategory, LegalHeading } from './types'

// Eager + raw: these are ~10 small text files, and every consumer (registry lookups, the
// legal footer's link list, SignUp's acceptance recording) wants synchronous access — no
// lazy-loading complexity is warranted at this scale.
const rawFiles = import.meta.glob('/src/content/legal/**/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

function extractHeadings(body: string): LegalHeading[] {
  const headings: LegalHeading[] = []
  for (const match of body.matchAll(/^(##|###)\s+(.+)$/gm)) {
    const depth = match[1].length as 2 | 3
    const text = match[2].trim()
    headings.push({ id: slugifyHeading(text), text, depth })
  }
  return headings
}

const ALL_DOCUMENTS: LegalDocument[] = Object.values(rawFiles)
  .map((raw) => {
    const { data, content } = parseFrontmatter(raw)
    const meta: LegalDocumentMeta = {
      slug: data.slug,
      title: data.title,
      version: data.version,
      effectiveDate: data.effectiveDate,
      jurisdiction: data.jurisdiction || 'US',
      locale: data.locale || 'en',
      category: (data.category as LegalCategory) || 'core',
    }
    return { ...meta, content, headings: extractHeadings(content) }
  })
  // Newest version first, so getLatestDocument can just take the first match per slug.
  .sort((a, b) => b.version.localeCompare(a.version))

/** One entry per slug (latest version only) — for nav/footer link lists. */
export function getAllDocuments(): LegalDocumentMeta[] {
  const seen = new Set<string>()
  return ALL_DOCUMENTS.filter((doc) => {
    if (seen.has(doc.slug)) return false
    seen.add(doc.slug)
    return true
  })
}

export function getLatestDocument(
  slug: string,
  jurisdiction = 'US',
  locale = 'en',
): LegalDocument | null {
  return (
    ALL_DOCUMENTS.find((d) => d.slug === slug && d.jurisdiction === jurisdiction && d.locale === locale) ??
    // Fall back to any jurisdiction/locale variant of this doc — most docs only have one today.
    ALL_DOCUMENTS.find((d) => d.slug === slug) ??
    null
  )
}

export function getDocumentVersion(slug: string, version: string): LegalDocument | null {
  return ALL_DOCUMENTS.find((d) => d.slug === slug && d.version === version) ?? null
}

export function listVersions(slug: string): LegalDocumentMeta[] {
  return ALL_DOCUMENTS.filter((d) => d.slug === slug)
}
