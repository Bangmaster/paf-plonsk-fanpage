import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { format } from 'date-fns'

export default function Backup() {
  const { isAdmin } = useAuth()
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [message, setMessage] = useState(null)

  async function downloadBackup() {
    setLoading(true)
    setMessage(null)
    try {
      const [
        { data: players },
        { data: matches },
        { data: match_players },
        { data: goals },
        { data: cards },
      ] = await Promise.all([
        supabase.from('players').select('*'),
        supabase.from('matches').select('*'),
        supabase.from('match_players').select('*'),
        supabase.from('goals').select('*'),
        supabase.from('cards').select('*'),
      ])

      const backup = {
        exported_at: new Date().toISOString(),
        version: '1.0',
        data: { players, matches, match_players, goals, cards }
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `paf-backup-${format(new Date(), 'yyyy-MM-dd')}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage({ type: 'success', text: 'Backup pobrany pomyślnie!' })
    } catch (e) {
      setMessage({ type: 'error', text: 'Błąd podczas tworzenia backupu.' })
    }
    setLoading(false)
  }

  async function handleRestore(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!confirm('UWAGA: Przywrócenie backupu usunie wszystkie aktualne dane! Kontynuować?')) return

    setRestoring(true)
    setMessage(null)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      const { players, matches, match_players, goals, cards } = backup.data

      // Usuń wszystkie dane
      await supabase.from('cards').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('match_players').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000')

      // Wgraj dane z backupu
      if (players?.length) await supabase.from('players').insert(players)
      if (matches?.length) await supabase.from('matches').insert(matches)
      if (match_players?.length) await supabase.from('match_players').insert(match_players)
      if (goals?.length) await supabase.from('goals').insert(goals)
      if (cards?.length) await supabase.from('cards').insert(cards)

      setMessage({ type: 'success', text: 'Backup przywrócony pomyślnie! Odśwież stronę.' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Błąd podczas przywracania. Sprawdź czy plik jest poprawny.' })
    }
    setRestoring(false)
    e.target.value = ''
  }

  if (!isAdmin) {
    return (
      <div style={{ maxWidth: 600, margin: '80px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 18, color: 'var(--white-muted)', letterSpacing: 2 }}>
          Tylko admin ma dostęp do tej strony.
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <h1 className="section-title">Backup danych</h1>
      <div className="gold-line" />

      {message && (
        <div style={{
          padding: '14px 18px',
          marginBottom: 24,
          background: message.type === 'success' ? '#0f2a0f' : '#2a0f0f',
          border: `1px solid ${message.type === 'success' ? '#4ade80' : 'var(--red)'}`,
          color: message.type === 'success' ? '#4ade80' : 'var(--red-light)',
          fontFamily: 'var(--font-condensed)',
          fontSize: 15,
          letterSpacing: 1,
        }}>
          {message.text}
        </div>
      )}

      {/* Export */}
      <div className="card" style={{ padding: 28, marginBottom: 20, borderLeft: '4px solid var(--gold)' }}>
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10 }}>
          📥 Pobierz backup
        </div>
        <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--white-muted)', letterSpacing: 1, marginBottom: 20, lineHeight: 1.6 }}>
          Pobierz wszystkie dane aplikacji jako plik JSON. Zawodnicy, mecze, statystyki, gole i kartki — wszystko w jednym pliku. Rób backup regularnie!
        </p>
        <button className="btn-gold" onClick={downloadBackup} disabled={loading} style={{ padding: '12px 28px', fontSize: 16 }}>
          {loading ? 'Tworzę backup...' : '📥 Pobierz backup (.json)'}
        </button>
      </div>

      {/* Import */}
      <div className="card" style={{ padding: 28, borderLeft: '4px solid var(--red)' }}>
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--red-light)', marginBottom: 10 }}>
          📤 Przywróć backup
        </div>
        <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--white-muted)', letterSpacing: 1, marginBottom: 8, lineHeight: 1.6 }}>
          Wgraj plik backup JSON żeby przywrócić dane.
        </p>
        <div style={{
          padding: '10px 14px',
          background: '#2a0f0f',
          border: '1px solid var(--red-dark)',
          color: 'var(--red-light)',
          fontFamily: 'var(--font-condensed)',
          fontSize: 13,
          letterSpacing: 1,
          marginBottom: 20,
        }}>
          ⚠️ UWAGA: Przywrócenie backupu usunie wszystkie aktualne dane i zastąpi je danymi z pliku!
        </div>
        <label style={{
          display: 'inline-block',
          background: 'transparent',
          border: '1px solid var(--red)',
          color: 'var(--red-light)',
          fontFamily: 'var(--font-condensed)',
          fontWeight: 700,
          fontSize: 15,
          letterSpacing: 1,
          textTransform: 'uppercase',
          padding: '10px 20px',
          cursor: restoring ? 'not-allowed' : 'pointer',
          opacity: restoring ? 0.6 : 1,
          transition: 'all 0.2s',
        }}>
          {restoring ? 'Przywracam...' : '📤 Wybierz plik backup'}
          <input type="file" accept=".json" onChange={handleRestore} style={{ display: 'none' }} disabled={restoring} />
        </label>
      </div>
    </div>
  )
}
