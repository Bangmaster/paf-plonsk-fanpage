import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function LoginPage() {
  const { isAdmin, login, logout, changePassword } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passMsg, setPassMsg] = useState('')
  const [showEndSeason, setShowEndSeason] = useState(false)
  const [seasonName, setSeasonName] = useState('')
  const [endingseason, setEndingSeason] = useState(false)
  const [endMsg, setEndMsg] = useState(null)

  function handleLogin() {
    const ok = login(username, password)
    if (ok) { navigate('/') } else { setError('Błędny login lub hasło.') }
  }

  function handleChangePassword() {
    if (newPass !== confirmPass) { setPassMsg('Hasła nie są identyczne.'); return }
    if (newPass.length < 4) { setPassMsg('Hasło za krótkie (min. 4 znaki).'); return }
    const ok = changePassword(oldPass, newPass)
    if (ok) { setPassMsg('Hasło zostało zmienione!'); setOldPass(''); setNewPass(''); setConfirmPass('') }
    else { setPassMsg('Stare hasło jest nieprawidłowe.') }
  }

  async function handleEndSeason() {
    if (!seasonName.trim()) { setEndMsg({ type: 'error', text: 'Wpisz nazwę sezonu!' }); return }
    if (!confirm(`Czy na pewno chcesz zakończyć sezon "${seasonName}"? Wszystkie mecze, tabela i statystyki graczy zostaną przeniesione do Historii.`)) return

    setEndingSeason(true)
    setEndMsg(null)

    try {
      // 1. Utwórz nowy sezon
      const { data: season, error: seasonError } = await supabase
        .from('seasons')
        .insert({ name: seasonName.trim() })
        .select()
        .single()
      if (seasonError) throw seasonError

      // 2. Pobierz wszystkie dane do statystyk
      const [{ data: goals }, { data: cards }, { data: matchPlayers }, { data: players }] = await Promise.all([
        supabase.from('goals').select('*, players(first_name, last_name), matches(competition, season_id)').is('matches.season_id', null),
        supabase.from('cards').select('*, players(first_name, last_name), matches(competition, season_id)').is('matches.season_id', null),
        supabase.from('match_players').select('*, players(first_name, last_name), matches(status, season_id)').is('matches.season_id', null),
        supabase.from('players').select('*'),
      ])

      // 3. Oblicz statystyki per gracz
      const stats = {}

      ;(matchPlayers || []).filter(mp => mp.matches?.status === 'played').forEach(mp => {
        const pid = mp.player_id
        const name = mp.players ? `${mp.players.first_name} ${mp.players.last_name}` : '?'
        if (!stats[pid]) stats[pid] = { player_id: pid, player_name: name, goals: 0, goals_liga: 0, goals_puchar: 0, minutes: 0, yellow_cards: 0, yellow_liga: 0, yellow_puchar: 0, red_cards: 0, red_liga: 0, red_puchar: 0, matches_played: 0 }
        stats[pid].minutes += mp.minutes_played || 0
        stats[pid].matches_played++
      })

      ;(goals || []).forEach(g => {
        const pid = g.player_id
        const name = g.players ? `${g.players.first_name} ${g.players.last_name}` : '?'
        if (!stats[pid]) stats[pid] = { player_id: pid, player_name: name, goals: 0, goals_liga: 0, goals_puchar: 0, minutes: 0, yellow_cards: 0, yellow_liga: 0, yellow_puchar: 0, red_cards: 0, red_liga: 0, red_puchar: 0, matches_played: 0 }
        stats[pid].goals++
        if (g.matches?.competition === 'puchar') stats[pid].goals_puchar++
        else stats[pid].goals_liga++
      })

      ;(cards || []).forEach(c => {
        const pid = c.player_id
        const name = c.players ? `${c.players.first_name} ${c.players.last_name}` : '?'
        if (!stats[pid]) stats[pid] = { player_id: pid, player_name: name, goals: 0, goals_liga: 0, goals_puchar: 0, minutes: 0, yellow_cards: 0, yellow_liga: 0, yellow_puchar: 0, red_cards: 0, red_liga: 0, red_puchar: 0, matches_played: 0 }
        const isPuchar = c.matches?.competition === 'puchar'
        if (c.card_type === 'yellow' || c.card_type === 'double_yellow') {
          stats[pid].yellow_cards++
          if (isPuchar) stats[pid].yellow_puchar++
          else stats[pid].yellow_liga++
        }
        if (c.card_type === 'red' || c.card_type === 'double_yellow') {
          stats[pid].red_cards++
          if (isPuchar) stats[pid].red_puchar++
          else stats[pid].red_liga++
        }
      })

      // 4. Zapisz statystyki do bazy
      const statsRows = Object.values(stats).map(s => ({ ...s, season_id: season.id }))
      if (statsRows.length > 0) {
        await supabase.from('season_player_stats').insert(statsRows)
      }

      // 5. Przypisz mecze do sezonu
      await supabase.from('matches').update({ season_id: season.id }).is('season_id', null)

      // 6. Skopiuj tabelę do historii i wyzeruj bieżące dane
      const { data: currentTable } = await supabase.from('league_table').select('*').is('season_id', null)
      if (currentTable && currentTable.length > 0) {
        const historyCopies = currentTable.map(t => ({
          team_name: t.team_name,
          played: t.played,
          goals_for: t.goals_for,
          goals_against: t.goals_against,
          points: t.points,
          season_id: season.id,
        }))
        await supabase.from('league_table').insert(historyCopies)
        // Wyzeruj bieżące dane drużyn
        const ids = currentTable.map(t => t.id)
        for (const id of ids) {
          await supabase.from('league_table').update({ played: 0, goals_for: 0, goals_against: 0, points: 0 }).eq('id', id)
        }
      }

      setEndMsg({ type: 'success', text: `Sezon "${seasonName}" został zapisany w Historii wraz ze statystykami graczy!` })
      setSeasonName('')
      setShowEndSeason(false)
    } catch (err) {
      console.error(err)
      setEndMsg({ type: 'error', text: 'Błąd podczas kończenia sezonu. Spróbuj ponownie.' })
    }
    setEndingSeason(false)
  }

  const inputStyle = {
    background: '#1e1e1e', border: '1px solid #2a2a2a', color: 'var(--white)',
    padding: '12px 16px', fontSize: 16, width: '100%', outline: 'none',
    fontFamily: 'var(--font-body)', transition: 'border-color 0.2s',
  }
  const labelStyle = {
    fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2,
    color: 'var(--white-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8,
  }
  const sectionTitle = {
    fontFamily: 'var(--font-condensed)', fontSize: 14, letterSpacing: 2,
    textTransform: 'uppercase', cursor: 'pointer', color: 'var(--white-muted)',
    display: 'flex', justifyContent: 'space-between',
  }

  if (isAdmin) {
    return (
      <div style={{ maxWidth: 520, margin: '48px auto', padding: '0 20px' }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.png" alt="PAF" style={{ height: 72, marginBottom: 12 }} />
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 3 }}>Panel Admina</h1>
        </div>

        {endMsg && (
          <div style={{
            padding: '14px 18px', marginBottom: 20,
            background: endMsg.type === 'success' ? '#0f2a0f' : '#2a0f0f',
            border: `1px solid ${endMsg.type === 'success' ? '#4ade80' : 'var(--red)'}`,
            color: endMsg.type === 'success' ? '#4ade80' : 'var(--red-light)',
            fontFamily: 'var(--font-condensed)', fontSize: 15, letterSpacing: 1,
          }}>
            {endMsg.text}
          </div>
        )}

        {/* Status */}
        <div className="card" style={{ padding: 24, marginBottom: 12, borderLeft: '4px solid #4ade80' }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, letterSpacing: 2, color: '#4ade80', textTransform: 'uppercase', marginBottom: 8 }}>
            ✓ Zalogowany jako Admin
          </div>
          <p style={{ fontFamily: 'var(--font-condensed)', color: 'var(--white-muted)', fontSize: 14, marginBottom: 16 }}>
            Masz dostęp do edycji danych w całej aplikacji.
          </p>
          <button className="btn-danger" onClick={logout}>Wyloguj się</button>
        </div>

        {/* Koniec sezonu */}
        <div className="card" style={{ padding: 24, marginBottom: 12, borderLeft: '4px solid var(--red)' }}>
          <div style={sectionTitle} onClick={() => setShowEndSeason(!showEndSeason)}>
            🏁 Koniec sezonu {showEndSeason ? '▲' : '▼'}
          </div>
          {showEndSeason && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', letterSpacing: 1, marginBottom: 16, lineHeight: 1.6 }}>
                Przeniesie wszystkie mecze, tabelę ligową i statystyki zawodników do zakładki Historia. Bieżący sezon zostanie wyczyszczony.
              </p>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Nazwa sezonu (np. 2025/2026)</label>
                <input style={inputStyle} value={seasonName} onChange={e => setSeasonName(e.target.value)}
                  placeholder="2025/2026"
                  onFocus={e => e.target.style.borderColor = 'var(--red)'}
                  onBlur={e => e.target.style.borderColor = '#2a2a2a'} />
              </div>
              <button style={{
                background: 'var(--red)', color: 'var(--white)', border: 'none',
                fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15,
                letterSpacing: 1, textTransform: 'uppercase', padding: '12px 24px',
                cursor: endingseason ? 'not-allowed' : 'pointer', opacity: endingseason ? 0.6 : 1,
              }} onClick={handleEndSeason} disabled={endingseason}>
                {endingseason ? 'Zapisuję...' : '🏁 Zakończ sezon'}
              </button>
            </div>
          )}
        </div>

        {/* Zmiana hasła */}
        <div className="card" style={{ padding: 24 }}>
          <div style={sectionTitle} onClick={() => setChangingPassword(!changingPassword)}>
            🔒 Zmień hasło {changingPassword ? '▲' : '▼'}
          </div>
          {changingPassword && (
            <div style={{ marginTop: 20 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Stare hasło</label>
                <input style={inputStyle} type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Nowe hasło</label>
                <input style={inputStyle} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Potwierdź nowe hasło</label>
                <input style={inputStyle} type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
              </div>
              {passMsg && (
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: passMsg.includes('zmienione') ? '#4ade80' : 'var(--red-light)', marginBottom: 14 }}>
                  {passMsg}
                </div>
              )}
              <button className="btn-gold" onClick={handleChangePassword}>Zmień hasło</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 420, margin: '80px auto', padding: '0 20px' }} className="fade-in">
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <img src="/logo.png" alt="PAF" style={{ height: 80, marginBottom: 16 }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 3 }}>Logowanie</h1>
        <div style={{ width: 40, height: 3, background: 'var(--red)', margin: '12px auto 0' }} />
      </div>
      <div className="card" style={{ padding: 32 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Login</label>
          <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--red)'}
            onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            placeholder="Login" autoComplete="username" />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Hasło</label>
          <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)}
            onFocus={e => e.target.style.borderColor = 'var(--red)'}
            onBlur={e => e.target.style.borderColor = '#2a2a2a'}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Hasło" autoComplete="current-password" />
        </div>
        {error && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--red-light)', marginBottom: 16 }}>{error}</div>}
        <button className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16 }} onClick={handleLogin}>
          Zaloguj się
        </button>
      </div>
    </div>
  )
}
