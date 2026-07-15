// ================================================================
// Gazua Legal Document Registry — TypeScript Types
// ================================================================

export type LegalCategory = 'core' | 'disclosure' | 'policy' | 'principles'

export interface LegalHeading {
  id: string
  text: string
  depth: 2 | 3
}

export interface LegalDocumentMeta {
  slug: string
  title: string
  version: string
  effectiveDate: string
  jurisdiction: string
  locale: string
  category: LegalCategory
}

export interface LegalDocument extends LegalDocumentMeta {
  content: string
  headings: LegalHeading[]
}
