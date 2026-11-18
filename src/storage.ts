import { initializeApp, getApps } from 'firebase/app'
import { getAuth, onAuthStateChanged, signInAnonymously, type User } from 'firebase/auth'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import type { Grid } from './model'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseReady = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId)
const app = firebaseReady ? (getApps()[0] ?? initializeApp(config)) : null
const auth = app ? getAuth(app) : null
const db = app ? getFirestore(app) : null
const localKey = (id: string) => `gridly:grid:${id}`

export async function getUser(): Promise<User | null> {
  if (!auth) return null
  if (auth.currentUser) return auth.currentUser
  const existing = await new Promise<User | null>(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => { unsubscribe(); resolve(user) }, () => { unsubscribe(); resolve(null) })
  })
  return existing ?? (await signInAnonymously(auth)).user
}

export async function loadGrid(id: string): Promise<Grid | null> {
  if (db) {
    const snapshot = await getDoc(doc(db, 'grids', id))
    return snapshot.exists() ? snapshot.data() as Grid : null
  }
  const raw = localStorage.getItem(localKey(id))
  return raw ? JSON.parse(raw) as Grid : null
}

export async function saveGrid(grid: Grid): Promise<void> {
  if (db) {
    await setDoc(doc(db, 'grids', grid.id), grid)
  } else {
    localStorage.setItem(localKey(grid.id), JSON.stringify(grid))
  }
}

export function rememberGrid(id: string): void {
  const current = JSON.parse(localStorage.getItem('gridly:recent') ?? '[]') as string[]
  localStorage.setItem('gridly:recent', JSON.stringify([id, ...current.filter(value => value !== id)].slice(0, 8)))
}

export function recentGrids(): string[] {
  return JSON.parse(localStorage.getItem('gridly:recent') ?? '[]') as string[]
}
