import { supabase } from './supabase.js'

const MAX_BACKUPS = 3
const STORAGE_KEY = 'paf_auto_backups'

export async function createAutoBackup(trigger = 'manual') {
  try {
    const [
      { data: players },
      { data: matches },
      { data: match_players },
      { data: goals },
      { data: cards },
      { data: league_table },
    ] = await Promise.all([
      supabase.from('players').select('*'),
      supabase.from('matches').select('*'),
      supabase.from('match_players').select('*'),
      supabase.from('goals').select('*'),
      supabase.from('cards').select('*'),
      supabase.from('league_table').select('*').is('season_id', null),
    ])

    const backup = {
      created_at: new Date().toISOString(),
      trigger,
      data: { players, matches, match_players, goals, cards, league_table }
    }

    let backups = []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) backups = JSON.parse(stored)
    } catch {}

    backups.unshift(backup)
    if (backups.length > MAX_BACKUPS) backups = backups.slice(0, MAX_BACKUPS)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(backups))
    return true
  } catch (err) {
    console.error('Auto backup failed:', err)
    return false
  }
}

export function getAutoBackups() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function downloadAutoBackup(backup) {
  const date = new Date(backup.created_at)
  const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `paf-autobackup-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
}
