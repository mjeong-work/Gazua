import { useEffect } from 'react'

const DEFAULT_TITLE = 'Social Investment Education Platform'

/** Sets document.title and the meta description tag for the lifetime of the calling page. */
export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    const previousTitle = document.title
    document.title = title

    let metaTag: HTMLMetaElement | null = null
    let previousDescription: string | null = null

    if (description) {
      metaTag = document.querySelector('meta[name="description"]')
      if (!metaTag) {
        metaTag = document.createElement('meta')
        metaTag.setAttribute('name', 'description')
        document.head.appendChild(metaTag)
      }
      previousDescription = metaTag.getAttribute('content')
      metaTag.setAttribute('content', description)
    }

    return () => {
      document.title = previousTitle
      if (metaTag && previousDescription !== null) {
        metaTag.setAttribute('content', previousDescription)
      }
    }
  }, [title, description])
}

export { DEFAULT_TITLE }
