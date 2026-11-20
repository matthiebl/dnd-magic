export type Card = {
  id: string
  title: string
  color: string
  description: string
  link: string
  x: number
  y: number
  width: number
  height: number
  placed: boolean
}

export type Grid = {
  id: string
  ownerUid: string
  name: string
  rows: number
  columns: number
  snap: number
  lineEvery: number
  rowLabels: string[]
  columnLabels: string[]
  headerAlignment?: 'center' | 'border'
  shared: boolean
  cards: Card[]
  updatedAt: number
}

export const colors = [
  { name: 'Blue', value: '#5578C8', background: '#E7EDFC' },
  { name: 'Amber', value: '#B57727', background: '#FCF0DA' },
  { name: 'Violet', value: '#8962BB', background: '#F1EAFB' },
  { name: 'Green', value: '#4B9873', background: '#E3F4E9' },
  { name: 'Coral', value: '#C66B65', background: '#FBEAE6' },
  { name: 'Teal', value: '#3C9C9B', background: '#DFF3F1' },
]

export const presets = {
  blank: { name: 'Untitled grid', rows: 6, columns: 5, snap: 0.5, lineEvery: 1, rowLabels: [], columnLabels: [], headerAlignment: 'center' },
  day: { name: 'My day', rows: 8, columns: 1, snap: 0.25, lineEvery: 1, rowLabels: ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'], columnLabels: [], headerAlignment: 'border' },
  week: { name: 'My week', rows: 4, columns: 7, snap: 1, lineEvery: 1, rowLabels: [], columnLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], headerAlignment: 'center' },
} satisfies Record<string, Pick<Grid, 'name' | 'rows' | 'columns' | 'snap' | 'lineEvery' | 'rowLabels' | 'columnLabels' | 'headerAlignment'>>

export function parseSnap(value: string): number | null {
  const parts = value.trim().split('/')
  const result = parts.length === 2 ? Number(parts[0]) / Number(parts[1]) : Number(value)
  return Number.isFinite(result) && result > 0 ? result : null
}

export function formatSnap(value: number): string {
  const fractions: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' }
  return fractions[String(value)] ?? String(value)
}

export function snapTo(value: number, interval: number): number {
  return Math.round(value / interval) * interval
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function newId(length = 10): string {
  const alphabet = '23456789abcdefghjkmnpqrstuvwxyz'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('')
}

export function newGridId(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const digits = '0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (byte, index) => index < 4 ? letters[byte % letters.length] : digits[byte % digits.length]).join('')
}

export function newCard(title: string): Card {
  return {
    id: newId(12), title, color: colors[Math.floor(Math.random() * colors.length)].value,
    description: '', link: '', x: 0, y: 0, width: 1, height: 1, placed: false,
  }
}

export function safeUrl(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch { return null }
}
