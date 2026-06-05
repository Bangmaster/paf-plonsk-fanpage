import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

const CARD_LABELS = { yellow: '🟡 Żółta', red: '🔴 Czerwona', double_yellow: '🟡🔴 2x Żółta' }

export default function MatchDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const [match, setMatch] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [matchPlayers, setMatchPlayers] = useState([])
  const [goals, setGoals] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit states
  const [score_us, setScoreUs] = useState('')
  const [score_them, setScoreThem] = useState('')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [playerMinutes, setPlayerMinutes] = useState({})
  const [newGoalPlayerId, setNewGoalPlayerId] = useState('')
  const [newCardPlayerId, setNewCardPlayerId] = useState('')
  const [newCardType, setNewCardType] = useState('yellow')
  const [editingScore, setEditingScore] = useState(false)

  async function loadAll() {
    const [{ data: m }, { data: ap }, { data: mp }, { data: g }, { data: c }] = await Promise.all([
      supabase.from('matches').select('*').eq('id', id).single(),
      supabase.from('players').select('*').eq('active', true).order('last_name'),
      supabase.from('match_players').select('*, players(first_name, last_name)').eq('match_id', id),
      supabase.from('goals').select('*, players(first_name, last_name)').eq('match_id', id),
      supabase.from('cards').select('*, players(first_name, last_name)').eq('match_id', id),
    ])
    setMatch(m)
    setAllPlayers(ap || [])
    setMatchPlayers(mp || [])
    setGoals(g || [])
    setCards(c || [])
    setScoreUs(m?.score_us ?? '')
    setScoreThem(m?.score_them ?? '')
    const sel = (mp || []).map(p => p.player_id)
    setSelectedPlayers(sel)
    const mins = {}
    ;(mp || []).forEach(p => { mins[p.player_id] = p.minutes_played })
    setPlayerMinutes(mins)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  async function saveScore() {
    setSaving(true)
    await supabase.from('matches').update({
      score_us: score_us === '' ? null : parseInt(score_us),
      score_them: score_them === '' ? null : parseInt(score_them),
      status: score_us !== '' ? 'played' : 'planned',
    }).eq('id', id)
    await loadAll()
    setEditingScore(false)
    setSaving(false)
  }

  async function saveSquad() {
    setSaving(true)
    await supabase.from('match_players').delete().eq('match_id', id)
    if (selectedPlayers.length > 0) {
      const rows = selectedPlayers.map(pid => ({
        match_id: id,
        player_id: pid,
        minutes_played: parseInt(playerMinutes[pid]) || 0,
      }))
      await supabase.from('match_players').insert(rows)
    }
    await loadAll()
    setSaving(false)
  }

  async function addGoal() {
    if (!newGoalPlayerId) return
    await supabase.from('goals').insert({ match_id: id, player_id: newGoalPlayerId })
    setNewGoalPlayerId('')
    await loadAll()
  }

  async function removeGoal(gid) {
    await supabase.from('goals').delete().eq('id', gid)
    await loadAll()
  }

  async function addCard() {
    if (!newCardPlayerId) return
    await supabase.from('cards').insert({ match_id: id, player_id: newCardPlayerId, card_type: newCardType })
    setNewCardPlayerId('')
    await loadAll()
  }

  async function removeCard(cid) {
    await supabase.from('cards').delete().eq('id', cid)
    await loadAll()
  }

  function togglePlayer(pid) {
    setSelectedPlayers(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid]
    )
  }

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>
      Ładowanie...
    </div>
  )

  if (!match) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--red-light)', fontFamily: 'var(--font-condensed)' }}>
      Nie znaleziono meczu. <Link to="/terminarz" style={{ color: 'var(--gold)' }}>Wróć do terminarza</Link>
    </div>
  )

  const date = match.match_date ? format(parseISO(match.match_date), 'd MMMM yyyy', { locale: pl }) : '—'
  const time = match.match_time ? match.match_time.slice(0, 5) : ''

  const labelStyle = {
    fontFamily: 'var(--font-condensed)',
    fontSize: 11,
    letterSpacing: 2,
    color: 'var(--white-muted)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 6,
  }

  const sectionStyle = {
    background: 'var(--black-card)',
    border: '1px solid var(--black-border)',
    padding: 24,
    marginBottom: 20,
  }

  const sectionTitleStyle = {
    fontFamily: 'var(--font-condensed)',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 18,
    color: 'var(--gold)',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      {/* Back */}
      <Link to="/terminarz" style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', display: 'inline-block', marginBottom: 24 }}>
        ← Terminarz
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span className={match.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>
            {match.competition === 'puchar' ? 'Puchar Polski' : 'Liga'}
          </span>
          <span className={match.is_home ? 'badge-home' : 'badge-away'}>
            {match.is_home ? 'Dom' : 'Wyjazd'}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 6vw, 52px)', letterSpacing: 3, marginBottom: 4 }}>
          PAF Płońsk <span style={{ color: 'var(--gold)' }}>vs</span> {match.opponent}
        </h1>
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, color: 'var(--white-muted)', letterSpacing: 1 }}>
          {date}{time && ` • ${time}`}
        </div>
      </div>

      {/* Score */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Wynik</div>
        {editingScore ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <input
              className="input-field"
              type="number"
              min="0"
              value={score_us}
              onChange={e => setScoreUs(e.target.value)}
              style={{ width: 80, fontSize: 28, textAlign: 'center', fontFamily: 'var(--font-display)' }}
            />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--white-muted)' }}>:</span>
            <input
              className="input-field"
              type="number"
              min="0"
              value={score_them}
              onChange={e => setScoreThem(e.target.value)}
              style={{ width: 80, fontSize: 28, textAlign: 'center', fontFamily: 'var(--font-display)' }}
            />
            <button className="btn-gold" onClick={saveScore} disabled={saving}>Zapisz</button>
            <button className="btn-ghost" onClick={() => setEditingScore(false)}>Anuluj</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {match.score_us !== null ? (
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 64,
                letterSpacing: 4,
              }}>
                <span style={{ color: match.score_us > match.score_them ? '#4ade80' : match.score_us < match.score_them ? 'var(--red-light)' : 'var(--white-dim)' }}>
                  {match.score_us}
                </span>
                <span style={{ color: 'var(--white-muted)', margin: '0 12px', fontSize: 40 }}>:</span>
                <span>{match.score_them}</span>
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 20, color: 'var(--white-muted)', letterSpacing: 2 }}>
                Mecz nie rozegrany
              </div>
            )}
            {isAdmin && (
              <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setEditingScore(true)}>
                ✏️ Edytuj wynik
              </button>
            )}
          </div>
        )}
      </div>

      {/* Squad */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Skład</div>
        {isAdmin ? (
          <>
            <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', letterSpacing: 1, marginBottom: 16 }}>
              Zaznacz zawodników którzy grali i wpisz minuty. Kliknij "Zapisz skład" gdy skończysz.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 16 }}>
              {allPlayers.map(p => {
                const selected = selectedPlayers.includes(p.id)
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      background: selected ? '#1a1a2e' : '#161616',
                      border: selected ? '1px solid var(--red)' : '1px solid var(--black-border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => togglePlayer(p.id)}
                  >
                    <div style={{
                      width: 20, height: 20,
                      background: selected ? 'var(--red)' : 'transparent',
                      border: '2px solid ' + (selected ? 'var(--red)' : 'var(--black-border)'),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, flexShrink: 0,
                    }}>
                      {selected && '✓'}
                    </div>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, flex: 1 }}>
                      {p.first_name} {p.last_name}
                    </span>
                    {selected && (
                      <input
                        className="input-field"
                        type="number"
                        min="0"
                        max="120"
                        value={playerMinutes[p.id] || ''}
                        onChange={e => { e.stopPropagation(); setPlayerMinutes({ ...playerMinutes, [p.id]: e.target.value }) }}
                        onClick={e => e.stopPropagation()}
                        placeholder="min"
                        style={{ width: 60, padding: '4px 8px', fontSize: 13 }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <button className="btn-gold" onClick={saveSquad} disabled={saving}>
              {saving ? 'Zapisuję...' : 'Zapisz skład'}
            </button>
          </>
        ) : (
          <div>
            {matchPlayers.length === 0 ? (
              <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak danych o składzie</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {matchPlayers.map(mp => (
                  <div key={mp.id} style={{ padding: '10px 14px', background: '#161616', border: '1px solid var(--black-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15 }}>
                      {mp.players?.first_name} {mp.players?.last_name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)' }}>
                      {mp.minutes_played}'
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goals */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>⚽ Gole ({goals.length})</div>
        {goals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: isAdmin ? 16 : 0 }}>
            {goals.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#161616', border: '1px solid var(--black-border)' }}>
                <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15 }}>
                  ⚽ {g.players?.first_name} {g.players?.last_name}
                </span>
                {isAdmin && (
                  <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => removeGoal(g.id)}>Usuń</button>
                )}
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="input-field"
              style={{ flex: 1, minWidth: 200 }}
              value={newGoalPlayerId}
              onChange={e => setNewGoalPlayerId(e.target.value)}
            >
              <option value="">Wybierz strzelca...</option>
              {allPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={addGoal}>+ Dodaj gol</button>
          </div>
        )}
        {!isAdmin && goals.length === 0 && (
          <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak danych o golach</div>
        )}
      </div>

      {/* Cards */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>🟡 Kartki ({cards.length})</div>
        {cards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: isAdmin ? 16 : 0 }}>
            {cards.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#161616', border: '1px solid var(--black-border)' }}>
                <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15 }}>
                  {CARD_LABELS[c.card_type]} — {c.players?.first_name} {c.players?.last_name}
                </span>
                {isAdmin && (
                  <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => removeCard(c.id)}>Usuń</button>
                )}
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              className="input-field"
              style={{ flex: 1, minWidth: 200 }}
              value={newCardPlayerId}
              onChange={e => setNewCardPlayerId(e.target.value)}
            >
              <option value="">Wybierz zawodnika...</option>
              {allPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
            <select className="input-field" style={{ width: 180 }} value={newCardType} onChange={e => setNewCardType(e.target.value)}>
              <option value="yellow">🟡 Żółta</option>
              <option value="red">🔴 Czerwona</option>
              <option value="double_yellow">🟡🔴 2x Żółta</option>
            </select>
            <button className="btn-primary" onClick={addCard}>+ Dodaj kartkę</button>
          </div>
        )}
        {!isAdmin && cards.length === 0 && (
          <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak kartek</div>
        )}
      </div>
    </div>
  )
}
