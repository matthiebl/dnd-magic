import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowUpRight, Copy, Globe2, LayoutGrid, Link2, LockKeyhole, MoveDiagonal2, Plus, SlidersHorizontal, X } from 'lucide-react'
import { clamp, colors, columnHeadersOnBorder, formatSnap, newCard, parseLabels, parseSnap, rowHeadersOnBorder, safeUrl, snapTo, type Card, type Grid } from './model'
import { firebaseReady, getUser, loadGrid, rememberGrid, saveGrid } from './storage'

const CW = 124
const CH = 92
type Drag = { id: string; mode: 'move' | 'resize'; clientX: number; clientY: number; x: number; y: number; width: number; height: number }
type CardArea = Pick<Card, 'x' | 'y' | 'width' | 'height'>
type CreateDrag = { pointerId: number; clientX: number; clientY: number; x: number; y: number }

export default function Board() {
  const { id = '' } = useParams()
  const [grid, setGrid] = useState<Grid | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState('Saved')
  const [title, setTitle] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [snapInput, setSnapInput] = useState('')
  const [rowLabelsText, setRowLabelsText] = useState('')
  const [columnLabelsText, setColumnLabelsText] = useState('')
  const [copied, setCopied] = useState(false)
  const [createPreview, setCreatePreview] = useState<CardArea | null>(null)
  const [editingCardId, setEditingCardId] = useState<string | null>(null)
  const drag = useRef<Drag | null>(null)
  const createDrag = useRef<CreateDrag | null>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const titleInput = useRef<HTMLInputElement>(null)
  const loadCount = useRef(0)

  useEffect(() => {
    let live = true
    loadCount.current = 0
    async function open() {
      try {
        const user = await getUser()
        const found = await loadGrid(id)
        if (!live) return
        if (!found) { setError('This grid was not found, or you do not have access to it.'); return }
        setUserId(user?.uid ?? 'local'); setGrid(found); setSnapInput(String(found.snap)); setRowLabelsText(found.rowLabels.join(', ')); setColumnLabelsText(found.columnLabels.join(', ')); rememberGrid(id)
      } catch (cause) { if (live) setError(cause instanceof Error ? cause.message : 'Could not load this grid.') }
      finally { if (live) setLoading(false) }
    }
    void open()
    return () => { live = false }
  }, [id])

  const owner = Boolean(grid && grid.ownerUid === userId)
  useEffect(() => {
    if (!grid || !owner) return
    if (loadCount.current++ === 0) return
    setSaveState('Saving…')
    const timer = window.setTimeout(() => {
      saveGrid({ ...grid, updatedAt: Date.now() }).then(() => setSaveState('Saved')).catch(cause => { setSaveState('Save failed'); setError(cause instanceof Error ? cause.message : 'Could not save changes.') })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [grid, owner])

  const updateGrid = useCallback((change: (current: Grid) => Grid) => setGrid(old => old ? change(old) : null), [])
  const updateCard = (id: string, change: (card: Card) => Card) => updateGrid(old => ({ ...old, cards: old.cards.map(card => card.id === id ? change(card) : card) }))
  const selected = grid?.cards.find(card => card.id === selectedId) ?? null

  useEffect(() => {
    if (editingCardId && editingCardId === selectedId) {
      titleInput.current?.focus()
      titleInput.current?.select()
    }
  }, [editingCardId, selectedId])

  function addCard(event: FormEvent) {
    event.preventDefault()
    if (!owner || !title.trim()) return
    updateGrid(old => ({ ...old, cards: [...old.cards, newCard(title.trim())] }))
    setTitle('')
  }

  function placeCard(id: string, x = 0, y = 0) {
    if (!grid || !owner) return
    updateCard(id, card => ({ ...card, placed: true, x: clamp(snapTo(x, grid.snap), 0, Math.max(0, grid.columns - card.width)), y: clamp(snapTo(y, grid.snap), 0, Math.max(0, grid.rows - card.height)) }))
    setSelectedId(id)
  }

  function drop(event: React.DragEvent) {
    event.preventDefault()
    if (!grid || !canvas.current || !owner) return
    const id = event.dataTransfer.getData('text/gridly-card')
    if (!grid.cards.some(card => card.id === id)) return
    const rect = canvas.current.getBoundingClientRect()
    placeCard(id, (event.clientX - rect.left) / (rect.width / grid.columns), (event.clientY - rect.top) / CH)
  }

  function pointerDown(event: PointerEvent, card: Card, mode: Drag['mode']) {
    if (!owner) return
    event.preventDefault(); event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id: card.id, mode, clientX: event.clientX, clientY: event.clientY, x: card.x, y: card.y, width: card.width, height: card.height }
    setSelectedId(card.id)
  }

  function pointerMove(event: PointerEvent) {
    if (!grid || !drag.current) return
    const start = drag.current
    const dx = (event.clientX - start.clientX) / ((canvas.current?.getBoundingClientRect().width ?? grid.columns * CW) / grid.columns)
    const dy = (event.clientY - start.clientY) / CH
    if (start.mode === 'move') {
      updateCard(start.id, card => ({ ...card, x: clamp(snapTo(start.x + dx, grid.snap), 0, Math.max(0, grid.columns - card.width)), y: clamp(snapTo(start.y + dy, grid.snap), 0, Math.max(0, grid.rows - card.height)) }))
    } else {
      updateCard(start.id, card => ({ ...card, width: clamp(snapTo(start.width + dx, grid.snap), Math.min(1, grid.snap), Math.max(grid.snap, grid.columns - card.x)), height: clamp(snapTo(start.height + dy, grid.snap), Math.min(1, grid.snap), Math.max(grid.snap, grid.rows - card.y)) }))
    }
  }

  function canvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    if (!grid || !canvas.current) return { x: 0, y: 0 }
    const rect = canvas.current.getBoundingClientRect()
    return {
      x: clamp(snapTo((clientX - rect.left) / (rect.width / grid.columns), grid.snap), 0, grid.columns),
      y: clamp(snapTo((clientY - rect.top) / CH, grid.snap), 0, grid.rows),
    }
  }

  function creationArea(start: CreateDrag, clientX: number, clientY: number): CardArea {
    if (!grid) return { x: 0, y: 0, width: 1, height: 1 }
    const end = canvasPoint(clientX, clientY)
    const minWidth = grid.columns === 1 ? 1 : Math.min(grid.snap, grid.columns)
    const minHeight = Math.min(grid.snap, grid.rows)
    const x = clamp(Math.min(start.x, end.x), 0, grid.columns - minWidth)
    const y = clamp(Math.min(start.y, end.y), 0, grid.rows - minHeight)
    return {
      x, y,
      width: clamp(Math.abs(end.x - start.x), minWidth, grid.columns - x),
      height: clamp(Math.abs(end.y - start.y), minHeight, grid.rows - y),
    }
  }

  function createPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!owner || event.button !== 0 || event.target !== event.currentTarget) return
    event.preventDefault()
    const point = canvasPoint(event.clientX, event.clientY)
    createDrag.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, ...point }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function createPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = createDrag.current
    if (!start || start.pointerId !== event.pointerId) return
    if (Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) < 5) return
    setCreatePreview(creationArea(start, event.clientX, event.clientY))
  }

  function createPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = createDrag.current
    if (!start || start.pointerId !== event.pointerId || !grid) return
    createDrag.current = null
    setCreatePreview(null)
    if (Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) < 5) return
    const card = { ...newCard('New card'), ...creationArea(start, event.clientX, event.clientY), placed: true }
    updateGrid(old => ({ ...old, cards: [...old.cards, card] }))
    setSelectedId(card.id)
    setEditingCardId(card.id)
  }

  function createPointerCancel() {
    createDrag.current = null
    setCreatePreview(null)
  }

  function commitRowLabels() {
    const labels = parseLabels(rowLabelsText)
    setRowLabelsText(labels.join(', '))
    updateGrid(old => ({ ...old, rowLabels: labels }))
  }

  function commitColumnLabels() {
    const labels = parseLabels(columnLabelsText)
    setColumnLabelsText(labels.join(', '))
    updateGrid(old => ({ ...old, columnLabels: labels }))
  }

  function closeSettings() {
    commitRowLabels()
    commitColumnLabels()
    setSettingsOpen(false)
  }

  function keyMove(event: KeyboardEvent, card: Card) {
    if (!grid || !owner) return
    const motion: Record<string, [number, number]> = { ArrowLeft: [-grid.snap, 0], ArrowRight: [grid.snap, 0], ArrowUp: [0, -grid.snap], ArrowDown: [0, grid.snap] }
    const delta = motion[event.key]
    if (!delta) return
    event.preventDefault()
    updateCard(card.id, old => event.shiftKey
      ? { ...old, width: clamp(old.width + delta[0], Math.min(1, grid.snap), grid.columns - old.x), height: clamp(old.height + delta[1], Math.min(1, grid.snap), grid.rows - old.y) }
      : { ...old, x: clamp(old.x + delta[0], 0, grid.columns - old.width), y: clamp(old.y + delta[1], 0, grid.rows - old.height) })
  }

  async function copyLink() {
    if (!grid?.shared) return
    try { await saveGrid(grid); await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000) }
    catch { setError('Could not copy the link. Copy the URL from your browser instead.') }
  }

  if (loading) return <div className="state-page">Opening grid…</div>
  if (!grid) return <div className="state-page"><h1>Grid unavailable</h1><p>{error}</p><Link className="button primary" to="/">Create a grid</Link></div>

  const rowsOnBorders = rowHeadersOnBorder(grid)
  const columnsOnBorders = columnHeadersOnBorder(grid)
  const canvasStyle: CSSProperties = { width: "100%", height: grid.rows * CH, backgroundSize: `calc(100% * ${grid.lineEvery} / ${grid.columns}) ${grid.lineEvery * CH}px` }
  return <div className={`board-page ${selected ? 'with-inspector' : ''}`}><aside className="card-sidebar"><div className="sidebar-heading"><span className="eyebrow">YOUR MATERIALS</span><h2>Cards <span className="card-count">{grid.cards.length}</span></h2></div>{owner && <form className="quick-add" onSubmit={addCard}><input aria-label="New card title" placeholder="Type a card title…" value={title} onChange={event => setTitle(event.target.value)} /><button type="submit" aria-label="Add card"><Plus size={18} strokeWidth={2.2} aria-hidden="true" /></button></form>}<p className="sidebar-help">{owner ? 'Press Enter to add, or drag empty grid space to draw a card.' : 'This shared grid is view only.'}</p><div className="card-list">{grid.cards.length === 0 && <div className="empty-cards">Your cards will appear here.</div>}{grid.cards.map(card => <div className={`library-card ${selectedId === card.id ? 'active' : ''}`} key={card.id} draggable={owner} onDragStart={event => event.dataTransfer.setData('text/gridly-card', card.id)}><button className="library-title" onClick={() => setSelectedId(card.id)}><span className="card-dot" style={{ background: card.color }} />{card.title}</button>{owner && !card.placed && <button className="place-button" onClick={() => placeCard(card.id)}>Place <ArrowUpRight size={12} aria-hidden="true" /></button>}{card.placed && <span className="placed-tag">On grid</span>}</div>)}</div><div className="sidebar-bottom"><LayoutGrid size={14} aria-hidden="true" /> One grid, any purpose.</div></aside><main className="board-main"><div className="board-top"><div><span className="eyebrow">GRID <span className="grid-id">{grid.id.toUpperCase()}</span></span><h1>{grid.name}</h1><p>{grid.rows} rows × {grid.columns} columns <span>·</span> {formatSnap(grid.snap)}-cell snap <span>·</span> {saveState}</p></div><div className="board-actions">{owner && <button className="button" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={15} aria-hidden="true" /> Grid settings</button>}{owner && firebaseReady && <button className="button" onClick={() => updateGrid(old => ({ ...old, shared: !old.shared }))}>{grid.shared ? <><Globe2 size={15} aria-hidden="true" /> Shared</> : <><LockKeyhole size={15} aria-hidden="true" /> Private</>}</button>}{grid.shared && firebaseReady && <button className="button primary" onClick={copyLink}><Copy size={14} aria-hidden="true" /> {copied ? 'Copied!' : 'Copy link'}</button>}</div></div>{error && <p className="error board-error" role="alert">{error}</p>}<div className="grid-caption"><span>THE CANVAS</span><span>{owner ? 'Drag empty space to create · Drag cards to move · Drag corners to resize' : 'Shared view'}</span></div><div className="canvas-scroll"><div className={`canvas-layout ${rowsOnBorders ? 'row-headers-on-borders' : ''} ${columnsOnBorders ? 'column-headers-on-borders' : ''}`} style={{ minWidth: grid.columns * CW + 88 + (columnsOnBorders ? 44 : 0) }}><div className="axis-corner" /><div className="column-axis" style={{ gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))` }}>{Array.from({ length: grid.columns + (columnsOnBorders ? 1 : 0) }, (_, index) => <span key={index} title={grid.columnLabels[index] ?? ''} style={columnsOnBorders ? { left: `${index / grid.columns * 100}%`, width: `${100 / grid.columns}%` } : undefined}>{grid.columnLabels[index] ?? ''}</span>)}</div><div className="row-axis" style={{ gridTemplateRows: `repeat(${grid.rows}, ${CH}px)` }}>{Array.from({ length: grid.rows + (rowsOnBorders ? 1 : 0) }, (_, index) => <span key={index} title={grid.rowLabels[index] ?? ''} style={rowsOnBorders ? { top: index * CH } : undefined}>{grid.rowLabels[index] ?? ''}</span>)}</div><div className={`grid-canvas ${owner ? 'can-create' : ''}`} ref={canvas} style={canvasStyle} onDragOver={event => event.preventDefault()} onDrop={drop} onPointerDown={createPointerDown} onPointerMove={createPointerMove} onPointerUp={createPointerUp} onPointerCancel={createPointerCancel}>{createPreview && <div className="creation-preview" style={{ left: `${createPreview.x / grid.columns * 100}%`, top: createPreview.y * CH, width: `${createPreview.width / grid.columns * 100}%`, height: createPreview.height * CH }}><Plus size={15} aria-hidden="true" /> New card</div>}{grid.cards.filter(card => card.placed).map(card => { const color = colors.find(item => item.value === card.color) ?? colors[0]; return <div key={card.id} className={`placed-card ${selectedId === card.id ? 'selected' : ''}`} style={{ left: `calc(${card.x / grid.columns * 100}% + 3px)`, top: card.y * CH + 3, width: `calc(${card.width / grid.columns * 100}% - 6px)`, height: card.height * CH - 6, background: color.background, borderColor: card.color }} onPointerDown={event => pointerDown(event, card, 'move')} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onClick={() => setSelectedId(card.id)} onKeyDown={event => keyMove(event, card)} role="button" tabIndex={0} aria-label={`${card.title}, row ${card.y + 1}, column ${card.x + 1}. Arrow keys move; Shift and arrow keys resize.`}><strong>{card.title}</strong>{card.description && <small>{card.description}</small>}{owner && <button className="resize-handle" aria-label={`Resize ${card.title}`} onPointerDown={event => pointerDown(event, card, 'resize')} onPointerMove={pointerMove} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }}><MoveDiagonal2 size={16} strokeWidth={2.3} aria-hidden="true" /></button>}</div> })}</div></div></div></main>{selected && <aside className="inspector"><div className="inspector-head"><div><span className="eyebrow">CARD DETAILS</span><h2>Edit card</h2></div><button className="icon-button" aria-label="Close card details" onClick={() => setSelectedId(null)}><X size={16} aria-hidden="true" /></button></div><label className="field">Title<input ref={titleInput} value={selected.title} disabled={!owner} onChange={event => updateCard(selected.id, card => ({ ...card, title: event.target.value }))} onBlur={() => setEditingCardId(null)} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label><label className="field">Colour<div className="color-row">{colors.map(color => <button key={color.value} className={`color-choice ${selected.color === color.value ? 'selected' : ''}`} style={{ background: color.value }} aria-label={color.name} aria-pressed={selected.color === color.value} disabled={!owner} onClick={() => updateCard(selected.id, card => ({ ...card, color: color.value }))} />)}</div></label><label className="field">Description<textarea value={selected.description} disabled={!owner} onChange={event => updateCard(selected.id, card => ({ ...card, description: event.target.value }))} placeholder="Optional details" /></label><label className="field">Link<input value={selected.link} disabled={!owner} onChange={event => updateCard(selected.id, card => ({ ...card, link: event.target.value }))} placeholder="https://…" /></label>{safeUrl(selected.link) && <a className="open-link" href={safeUrl(selected.link) ?? undefined} target="_blank" rel="noreferrer"><Link2 size={13} aria-hidden="true" /> Open link <ArrowUpRight size={13} aria-hidden="true" /></a>}{owner && <><div className="inspector-divider" /><h3>Placement</h3>{!selected.placed ? <button className="button primary full" onClick={() => placeCard(selected.id)}>Place on grid</button> : <><div className="placement-grid">{([['Column', 'x', grid.columns], ['Row', 'y', grid.rows], ['Width', 'width', grid.columns], ['Height', 'height', grid.rows]] as const).map(([label, key, max]) => <label className="field" key={key}>{label}<input type="number" min={key === 'width' || key === 'height' ? Math.min(1, grid.snap) : 0} max={max} step={grid.snap} value={selected[key]} onChange={event => updateCard(selected.id, card => { const maximum = key === 'x' ? grid.columns - card.width : key === 'y' ? grid.rows - card.height : key === 'width' ? grid.columns - card.x : grid.rows - card.y; const minimum = key === 'width' || key === 'height' ? Math.min(1, grid.snap, Math.max(0, maximum)) : 0; return { ...card, [key]: clamp(snapTo(Number(event.target.value), grid.snap), minimum, Math.max(minimum, maximum)) } })} /></label>)}</div><button className="button full" onClick={() => updateCard(selected.id, card => ({ ...card, placed: false }))}>Remove from grid</button></>}<button className="delete-button" onClick={() => { updateGrid(old => ({ ...old, cards: old.cards.filter(card => card.id !== selected.id) })); setSelectedId(null) }}>Delete card</button></>}</aside>}{settingsOpen && owner && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeSettings() }}><section className="settings-modal" role="dialog" aria-modal="true" aria-label="Grid settings"><div className="modal-head"><div><span className="eyebrow">CONFIGURATION</span><h2>Grid settings</h2></div><button className="icon-button" onClick={closeSettings} aria-label="Close settings"><X size={16} aria-hidden="true" /></button></div><div className="form-grid"><label className="field wide">Name<input value={grid.name} onChange={event => updateGrid(old => ({ ...old, name: event.target.value }))} /></label><label className="field">Rows<input type="number" min="1" step="1" value={grid.rows} onChange={event => updateGrid(old => ({ ...old, rows: Math.max(1, Number(event.target.value) || 1) }))} /></label><label className="field">Columns<input type="number" min="1" step="1" value={grid.columns} onChange={event => updateGrid(old => ({ ...old, columns: Math.max(1, Number(event.target.value) || 1) }))} /></label><label className="field">Snap increment<input value={snapInput} onChange={event => setSnapInput(event.target.value)} onBlur={() => { const value = parseSnap(snapInput); if (value) updateGrid(old => ({ ...old, snap: value })) }} /></label><label className="field">Visible line every<input type="number" min="1" step="1" value={grid.lineEvery} onChange={event => updateGrid(old => ({ ...old, lineEvery: Math.max(1, Number(event.target.value) || 1) }))} /></label><label className="field">Row labels<input value={rowLabelsText} onChange={event => setRowLabelsText(event.target.value)} onBlur={commitRowLabels} /></label><label className="field">Column labels<input value={columnLabelsText} onChange={event => setColumnLabelsText(event.target.value)} onBlur={commitColumnLabels} /></label><label className="alignment-switch"><span>Row labels on borders</span><input type="checkbox" role="switch" checked={rowsOnBorders} onChange={event => updateGrid(old => ({ ...old, rowHeaderOnBorder: event.target.checked }))} /><span className="switch-track" aria-hidden="true" /></label><label className="alignment-switch"><span>Column labels on borders</span><input type="checkbox" role="switch" checked={columnsOnBorders} onChange={event => updateGrid(old => ({ ...old, columnHeaderOnBorder: event.target.checked }))} /><span className="switch-track" aria-hidden="true" /></label><p className="helper label-helper">Border labels can include one extra name for the far edge.</p></div><p className="helper">Cards outside a smaller grid remain saved; expand the grid to see them again.</p><button className="button primary full" onClick={() => { const value = parseSnap(snapInput); if (value) updateGrid(old => ({ ...old, snap: value })); closeSettings() }}>Done</button></section></div>}</div>
}
