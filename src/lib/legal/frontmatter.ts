/**
 * Minimal frontmatter parser for the legal content pipeline.
 *
 * We deliberately don't use `gray-matter` here — it calls `Buffer.from()` internally
 * (lib/to-file.js), which doesn't exist in a browser/Vite bundle without a Node polyfill
 * and would throw at runtime. Our frontmatter schema is flat string key/value pairs only
 * (no nested structures, no arrays), so a full YAML parser buys us nothing.
 */
export function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) return { data: {}, content: raw }

  const [, frontmatterBlock, content] = match
  const data: Record<string, string> = {}

  for (const line of frontmatterBlock.split(/\r?\n/)) {
    const lineMatch = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/)
    if (!lineMatch) continue
    const [, key, rawValue] = lineMatch
    const value = rawValue.trim().replace(/^["'](.*)["']$/, '$1')
    data[key] = value
  }

  return { data, content: content.trim() }
}
