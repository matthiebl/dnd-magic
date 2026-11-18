import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatSnap, newId, parseSnap, presets, type Grid } from './model'
import { getUser, rememberGrid, saveGrid, recentGrids } from './storage'

type Preset = keyof typeof presets
type Draft = Omit<(typeof presets)[Preset], 'snap'> & { snapText: string }
const initial = (preset: Preset): Draft => ({ ...presets[preset], snapText: String(presets[preset].snap) })

export default function Setup() {
  const navigate = useNavigate()
  const [preset, setPreset] = useState<Preset>('blank')
  const [draft, setDraft] = useState<Draft>(() => initial('blank'))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const recent = recentGrids()
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(old => ({ ...old, [key]: value }))
  const snap = parseSnap(draft.snapText)

  async function create(event: FormEvent) {
    event.preventDefault()
    if (![draft.rows, draft.columns, draft.lineEvery].every(value => Number.isSafeInteger(value) && value > 0) || !snap) {
      setError('Rows, columns, line spacing, and snap increment must be positive numbers.')
      return
    }
    setBusy(true); setError('')
    try {
      const user = await getUser()
      const id = newId()
      const grid: Grid = { id, ownerUid: user?.uid ?? 'local', name: draft.name.trim() || 'Untitled grid', rows: draft.rows, columns: draft.columns, lineEvery: draft.lineEvery, rowLabels: draft.rowLabels, columnLabels: draft.columnLabels, snap, shared: false, cards: [], updatedAt: Date.now() }
      await saveGrid(grid)
      rememberGrid(id)
      navigate(`/g/${id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the grid.')
    } finally { setBusy(false) }
  }

  const previewRows = Math.min(Math.max(draft.rows || 1, 1), 8)
  const previewColumns = Math.min(Math.max(draft.columns || 1, 1), 8)
  return <main className="setup-page"><div className="setup-intro"><span className="eyebrow">A SPACE TO ARRANGE ANYTHING</span><h1>Make a grid. Make it yours.</h1><p>Choose the shape and snap points, then add cards as you go. Day and week are just starting points.</p></div><div className="setup-layout"><form className="setup-form" onSubmit={create}><div className="section-title"><span className="step">01</span><div><h2>Choose a starting point</h2><p>All presets become fully editable grids.</p></div></div><div className="preset-row">{([['blank', 'Blank grid', 'Build any layout'], ['day', 'Day example', '8 rows · quarter snap'], ['week', 'Week example', '7 columns']] as const).map(([key, title, hint]) => <button key={key} type="button" className={`preset ${preset === key ? 'selected' : ''}`} aria-pressed={preset === key} onClick={() => { setPreset(key); setDraft(initial(key)) }}><span className="preset-icon">{key === 'blank' ? '▦' : key === 'day' ? '☷' : '▥'}</span><strong>{title}</strong><small>{hint}</small></button>)}</div><div className="section-title settings-title"><span className="step">02</span><div><h2>Set up your grid</h2><p>Change these now or after creating it.</p></div></div><div className="form-grid"><label className="field wide">Grid name<input value={draft.name} onChange={event => set('name', event.target.value)} /></label><label className="field">Rows<input type="number" min="1" step="1" value={draft.rows} onChange={event => set('rows', Number(event.target.value))} /></label><label className="field">Columns<input type="number" min="1" step="1" value={draft.columns} onChange={event => set('columns', Number(event.target.value))} /></label><label className="field">Snap increment <em>in cells</em><input value={draft.snapText} onChange={event => set('snapText', event.target.value)} placeholder="1/4, 1/2, 1, 2…" /></label><label className="field">Visible line every <em>cells</em><input type="number" min="1" step="1" value={draft.lineEvery} onChange={event => set('lineEvery', Number(event.target.value))} /></label><label className="field">Row labels <em>optional</em><input value={draft.rowLabels.join(', ')} onChange={event => set('rowLabels', event.target.value.split(',').map(label => label.trim()))} placeholder="One, Two, Three…" /></label><label className="field">Column labels <em>optional</em><input value={draft.columnLabels.join(', ')} onChange={event => set('columnLabels', event.target.value.split(',').map(label => label.trim()))} placeholder="A, B, C…" /></label></div><p className="helper">Snap points are independent of visible lines. Use a fraction like 1/4 or any positive decimal.</p>{error && <p className="error" role="alert">{error}</p>}<button className="button primary create-button" disabled={busy}>{busy ? 'Creating…' : 'Create grid'} <span>↗</span></button></form><aside className="setup-preview"><div className="preview-header"><div><span className="eyebrow">LIVE PREVIEW</span><h3>{draft.name || 'Untitled grid'}</h3></div><span className="count-pill">{draft.rows || 1} × {draft.columns || 1}</span></div><div className="preview-paper"><div className="mini-grid" style={{ gridTemplateColumns: `repeat(${previewColumns},1fr)`, gridTemplateRows: `repeat(${previewRows},1fr)` }}>{Array.from({ length: previewRows * previewColumns }, (_, index) => <span key={index} style={{ borderRightColor: ((index % previewColumns + 1) % draft.lineEvery === 0 || index % previewColumns === previewColumns - 1) ? undefined : "transparent", borderBottomColor: ((Math.floor(index / previewColumns) + 1) % draft.lineEvery === 0 || Math.floor(index / previewColumns) === previewRows - 1) ? undefined : "transparent" }} />)}</div></div>{(draft.rows > 8 || draft.columns > 8) && <p className="helper">Preview shows the first 8 rows and columns; the full grid uses your dimensions.</p>}<div className="preview-footer"><span>Lines: every {draft.lineEvery || 1} cell{draft.lineEvery === 1 ? '' : 's'}</span><span>Snap: {snap ? formatSnap(snap) : '—'} cell{snap === 1 ? '' : 's'}</span></div></aside></div>{recent.length > 0 && <section className="recent"><h2>Recent grids</h2><div>{recent.map(id => <Link key={id} to={`/g/${id}`} className="recent-link">▦ <span>/g/{id}</span> ↗</Link>)}</div></section>}</main>
}
