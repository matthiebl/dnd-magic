import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Setup from './Setup'
import Board from './Board'
import { firebaseReady } from './storage'

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><header className="app-header"><Link className="logo" to="/"><span className="logo-mark">▦</span><span>Gridly</span></Link><span className="mode-badge">{firebaseReady ? 'Saved to Firebase' : 'Local preview'}</span></header>{children}</div>
}

export default function App() {
  return <BrowserRouter basename={import.meta.env.BASE_URL}><Shell><Routes><Route path="/" element={<Setup />} /><Route path="/g/:id" element={<Board />} /><Route path="*" element={<div className="state-page"><h1>Page not found</h1><Link className="button primary" to="/">Go home</Link></div>} /></Routes></Shell></BrowserRouter>
}
