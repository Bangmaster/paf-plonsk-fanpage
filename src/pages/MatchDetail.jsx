import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { createAutoBackup } from '../lib/autobackup.js'

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
  const [copiedLink, setCopiedLink] = useState(false)

  const [score_us, setScoreUs] = useState('')
  const [score_them, setScoreThem] = useState('')
  const [score_us_extra, setScoreUsExtra] = useState('')
  const [score_them_extra, setScoreThemExtra] = useState('')
  const [extra_type, setExtraType] = useState('penalties')
  const [selectedPlayers, setSelectedPlayers] = useState([])
  const [playerMinutes, setPlayerMinutes] = useState({})
  const [newGoalPlayerId, setNewGoalPlayerId] = useState('')
  const [newCardPlayerId, setNewCardPlayerId] = useState('')
  const [newCardType, setNewCardType] = useState('yellow')
  const [editingScore, setEditingScore] = useState(false)
  const [scoreErrors, setScoreErrors] = useState({})
  const [minuteErrors, setMinuteErrors] = useState({})

  const isPuchar = match?.competition === 'puchar'
  const isRemis = score_us !== '' && score_them !== '' && parseInt(score_us) === parseInt(score_them)

  const scoreUs = match?.score_us
  const scoreThem = match?.score_them
  const scoreUsE = match?.score_us_extra
  const scoreThemE = match?.score_them_extra
  const scoreExtraType = match?.extra_type
  const mainResult = scoreUs > scoreThem ? 'W' : scoreUs < scoreThem ? 'P' : 'R'
  const finalResult = scoreUsE !== null && scoreUsE !== undefined ? (scoreUsE > scoreThemE ? 'W' : 'P') : mainResult
  const resultColor = finalResult === 'W' ? '#4ade80' : finalResult === 'P' ? 'var(--red-light)' : 'var(--gold)'

  async function loadAll() {
    const [{ data: m }, { data: ap }, { data: mp }, { data: g }, { data: c }] = await Promise.all([
      supabase.from('matches').select('*').eq('id', id).single(),
      supabase.from('players').select('*').eq('active', true).order('last_name'),
      supabase.from('match_players').select('*, players(first_name, last_name, shirt_number)').eq('match_id', id),
      supabase.from('goals').select('*, players(first_name, last_name)').eq('match_id', id),
      supabase.from('cards').select('*, players(first_name, last_name)').eq('match_id', id),
    ])
    setMatch(m); setAllPlayers(ap || []); setMatchPlayers(mp || [])
    setGoals(g || []); setCards(c || [])
    setScoreUs(m?.score_us ?? ''); setScoreThem(m?.score_them ?? '')
    setScoreUsExtra(m?.score_us_extra ?? ''); setScoreThemExtra(m?.score_them_extra ?? '')
    setExtraType(m?.extra_type || 'penalties')
    const sel = (mp || []).map(p => p.player_id)
    setSelectedPlayers(sel)
    const mins = {}
    ;(mp || []).forEach(p => { mins[p.player_id] = p.minutes_played })
    setPlayerMinutes(mins)
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [id])

  function validateScore() {
    const errs = {}
    const us = parseInt(score_us)
    const them = parseInt(score_them)
    if (score_us !== '' && (isNaN(us) || us < 0)) errs.score_us = 'Wynik nie może być ujemny'
    if (score_them !== '' && (isNaN(them) || them < 0)) errs.score_them = 'Wynik nie może być ujemny'
    if (isPuchar && isRemis && score_us_extra !== '') {
      const usE = parseInt(score_us_extra)
      const themE = parseInt(score_them_extra)
      if (isNaN(usE) || usE < 0) errs.score_us_extra = 'Wynik nie może być ujemny'
      if (isNaN(themE) || themE < 0) errs.score_them_extra = 'Wynik nie może być ujemny'
    }
    return errs
  }

  async function saveScore() {
    const errs = validateScore()
    if (Object.keys(errs).length > 0) { setScoreErrors(errs); return }
    setSaving(true)
    const usInt = score_us === '' ? null : parseInt(score_us)
    const themInt = score_them === '' ? null : parseInt(score_them)
    const isDrawInPuchar = isPuchar && usInt !== null && usInt === themInt
    await supabase.from('matches').update({
      score_us: usInt, score_them: themInt,
      status: usInt !== null ? 'played' : 'planned',
      score_us_extra: isDrawInPuchar && score_us_extra !== '' ? parseInt(score_us_extra) : null,
      score_them_extra: isDrawInPuchar && score_them_extra !== '' ? parseInt(score_them_extra) : null,
      extra_type: isDrawInPuchar && score_us_extra !== '' ? extra_type : null,
    }).eq('id', id)
    await loadAll(); setEditingScore(false); setScoreErrors({})
    setSaving(false); createAutoBackup('wynik meczu')
  }

  async function saveSquad() {
    if (selectedPlayers.length === 0) {
      if (!confirm('Nie zaznaczono żadnego zawodnika. Czy na pewno chcesz zapisać pusty skład?')) return
    }
    const errs = {}
    selectedPlayers.forEach(pid => {
      const min = parseInt(playerMinutes[pid])
      if (playerMinutes[pid] !== undefined && playerMinutes[pid] !== '' && (isNaN(min) || min < 0 || min > 120)) {
        errs[pid] = 'Minuty muszą być 0-120'
      }
    })
    if (Object.keys(errs).length > 0) { setMinuteErrors(errs); return }
    setSaving(true)
    await supabase.from('match_players').delete().eq('match_id', id)
    if (selectedPlayers.length > 0) {
      const rows = selectedPlayers.map(pid => ({
        match_id: id, player_id: pid,
        minutes_played: parseInt(playerMinutes[pid]) || 0,
      }))
      await supabase.from('match_players').insert(rows)
    }
    await loadAll(); setSaving(false); setMinuteErrors({})
    createAutoBackup('skład meczu')
  }

  async function copyLastSquad() {
    const { data: lastMatch } = await supabase
      .from('matches')
      .select('id')
      .eq('status', 'played')
      .is('season_id', null)
      .neq('id', id)
      .order('match_date', { ascending: false })
      .limit(1)
      .single()
    if (!lastMatch) { alert('Brak poprzedniego meczu do skopiowania składu.'); return }
    const { data: lastSquad } = await supabase
      .from('match_players')
      .select('player_id, minutes_played')
      .eq('match_id', lastMatch.id)
    if (!lastSquad || lastSquad.length === 0) { alert('Poprzedni mecz nie ma zapisanego składu.'); return }
    const ids = lastSquad.map(p => p.player_id)
    const mins = {}
    lastSquad.forEach(p => { mins[p.player_id] = p.minutes_played })
    setSelectedPlayers(ids)
    setPlayerMinutes(mins)
  }

  async function addGoal() {
    if (!newGoalPlayerId) return
    await supabase.from('goals').insert({ match_id: id, player_id: newGoalPlayerId })
    setNewGoalPlayerId(''); await loadAll()
  }
  async function removeGoal(gid) { await supabase.from('goals').delete().eq('id', gid); await loadAll() }
  async function addCard() {
    if (!newCardPlayerId) return
    await supabase.from('cards').insert({ match_id: id, player_id: newCardPlayerId, card_type: newCardType })
    setNewCardPlayerId(''); await loadAll()
  }
  async function removeCard(cid) { await supabase.from('cards').delete().eq('id', cid); await loadAll() }
  function togglePlayer(pid) {
    setSelectedPlayers(prev => prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid])
    if (minuteErrors[pid]) { const errs = { ...minuteErrors }; delete errs[pid]; setMinuteErrors(errs) }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
  if (!match) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--red-light)', fontFamily: 'var(--font-condensed)' }}>Nie znaleziono meczu. <Link to="/terminarz" style={{ color: 'var(--gold)' }}>Wróć</Link></div>

  const date = match.match_date ? format(parseISO(match.match_date), 'd MMMM yyyy', { locale: pl }) : '—'
  const time = match.match_time ? match.match_time.slice(0, 5) : ''
  const sectionStyle = { background: 'var(--black-card)', border: '1px solid var(--black-border)', padding: 24, marginBottom: 20 }
  const sectionTitleStyle = { fontFamily: 'var(--font-condensed)', fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 18, color: 'var(--gold)' }
  const inputStyle = (hasErr) => ({
    background: '#222', border: `1px solid ${hasErr ? 'var(--red)' : 'var(--black-border)'}`,
    color: 'var(--white)', padding: '10px 14px', fontSize: 15, outline: 'none',
    fontFamily: 'var(--font-body)', boxShadow: hasErr ? '0 0 0 2px rgba(192,57,43,0.2)' : 'none',
    transition: 'all 0.2s',
  })

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Link to="/terminarz" style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>← Terminarz</Link>
        <button onClick={copyLink} style={{
          marginLeft: 'auto', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 12,
          letterSpacing: 1, textTransform: 'uppercase', padding: '6px 14px',
          background: copiedLink ? '#0f2a0f' : 'transparent',
          border: `1px solid ${copiedLink ? '#4ade80' : 'var(--black-border)'}`,
          color: copiedLink ? '#4ade80' : 'var(--white-muted)', cursor: 'pointer', transition: 'all 0.2s',
        }}>
          {copiedLink ? '✓ Skopiowano!' : '🔗 Udostępnij mecz'}
        </button>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <span className={match.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>
            {match.competition === 'puchar' ? 'Puchar Polski' : 'Liga'}
          </span>
          <span className={match.is_home ? 'badge-home' : 'badge-away'}>
            {match.is_home ? 'Dom' : 'Wyjazd'}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 48px)', letterSpacing: 3, marginBottom: 4 }}>
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Wynik główny</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <input style={{ ...inputStyle(!!scoreErrors.score_us), width: 72, fontSize: 28, textAlign: 'center', fontFamily: 'var(--font-display)' }}
                      type="number" min="0" value={score_us}
                      onChange={e => { setScoreUs(e.target.value); setScoreErrors({ ...scoreErrors, score_us: null }) }} />
                    {scoreErrors.score_us && <div style={{ fontSize: 11, color: 'var(--red-light)', marginTop: 3 }}>⚠️ {scoreErrors.score_us}</div>}
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--white-muted)' }}>:</span>
                  <div>
                    <input style={{ ...inputStyle(!!scoreErrors.score_them), width: 72, fontSize: 28, textAlign: 'center', fontFamily: 'var(--font-display)' }}
                      type="number" min="0" value={score_them}
                      onChange={e => { setScoreThem(e.target.value); setScoreErrors({ ...scoreErrors, score_them: null }) }} />
                    {scoreErrors.score_them && <div style={{ fontSize: 11, color: 'var(--red-light)', marginTop: 3 }}>⚠️ {scoreErrors.score_them}</div>}
                  </div>
                </div>
              </div>
            </div>
            {isPuchar && isRemis && (
              <div style={{ padding: 16, background: '#1a1200', border: '1px solid var(--gold)', marginBottom: 16 }}>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12 }}>
                  ⚠️ Remis w pucharze — podaj wynik rozstrzygnięcia
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <select style={{ ...inputStyle(false), width: 160 }} value={extra_type} onChange={e => setExtraType(e.target.value)}>
                    <option value="penalties">Po karnych</option>
                    <option value="overtime">Po dogrywce</option>
                  </select>
                  <input style={{ ...inputStyle(!!scoreErrors.score_us_extra), width: 72, fontSize: 24, textAlign: 'center', fontFamily: 'var(--font-display)' }}
                    type="number" min="0" value={score_us_extra} placeholder="My"
                    onChange={e => setScoreUsExtra(e.target.value)} />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--white-muted)' }}>:</span>
                  <input style={{ ...inputStyle(!!scoreErrors.score_them_extra), width: 72, fontSize: 24, textAlign: 'center', fontFamily: 'var(--font-display)' }}
                    type="number" min="0" value={score_them_extra} placeholder="Oni"
                    onChange={e => setScoreThemExtra(e.target.value)} />
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-gold" onClick={saveScore} disabled={saving}>{saving ? 'Zapisuję...' : 'Zapisz'}</button>
              <button className="btn-ghost" onClick={() => { setEditingScore(false); setScoreErrors({}) }}>Anuluj</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            {scoreUs === null ? (
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 20, color: 'var(--white-muted)', letterSpacing: 2 }}>Mecz nie rozegrany</div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 64, letterSpacing: 4 }}>
                    <span style={{ color: finalResult === 'W' ? '#4ade80' : finalResult === 'P' ? 'var(--red-light)' : 'var(--white-dim)' }}>{scoreUs}</span>
                    <span style={{ color: 'var(--white-muted)', margin: '0 8px', fontSize: 40 }}>:</span>
                    <span>{scoreThem}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: resultColor, marginLeft: 8 }}>
                    {finalResult === 'W' ? 'WYGRANA' : finalResult === 'P' ? 'PRZEGRANA' : 'REMIS'}
                  </div>
                </div>
                {scoreUsE !== null && scoreUsE !== undefined && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase' }}>
                      {scoreExtraType === 'penalties' ? 'Po karnych:' : 'Po dogrywce:'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: scoreUsE > scoreThemE ? '#4ade80' : 'var(--red-light)' }}>
                      {scoreUsE}:{scoreThemE}
                    </span>
                  </div>
                )}
              </div>
            )}
            {isAdmin && (
              <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => setEditingScore(true)}>✏️ Edytuj wynik</button>
            )}
          </div>
        )}
      </div>

      {/* Squad */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Skład</div>
        {isAdmin ? (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', letterSpacing: 1 }}>
                Zaznacz zawodników którzy grali i wpisz minuty.
              </p>
              <button onClick={copyLastSquad} style={{
                marginLeft: 'auto', fontFamily: 'var(--font-condensed)', fontWeight: 700,
                fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 14px',
                background: 'transparent', border: '1px solid #444', color: 'var(--white-muted)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = 'var(--white-muted)' }}
              >
                📋 Kopiuj skład z ostatniego meczu
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, marginBottom: 16 }}>
              {allPlayers.map(p => {
                const selected = selectedPlayers.includes(p.id)
                const hasErr = !!minuteErrors[p.id]
                return (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    background: selected ? '#1a1a2e' : '#161616',
                    border: `1px solid ${hasErr ? 'var(--red)' : selected ? 'var(--red)' : 'var(--black-border)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }} onClick={() => togglePlayer(p.id)}>
                    <div style={{ width: 20, height: 20, background: selected ? 'var(--red)' : 'transparent', border: `2px solid ${selected ? 'var(--red)' : 'var(--black-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                      {selected && '✓'}
                    </div>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, flex: 1 }}>
                      {p.shirt_number ? `#${p.shirt_number} ` : ''}{p.last_name} {p.first_name}
                    </span>
                    {selected && (
                      <div>
                        <input className="input-field" type="number" min="0" max="120"
                          value={playerMinutes[p.id] || ''} onClick={e => e.stopPropagation()}
                          onChange={e => {
                            e.stopPropagation()
                            setPlayerMinutes({ ...playerMinutes, [p.id]: e.target.value })
                            if (minuteErrors[p.id]) { const errs = { ...minuteErrors }; delete errs[p.id]; setMinuteErrors(errs) }
                          }}
                          placeholder="min"
                          style={{ width: 60, padding: '4px 8px', fontSize: 13, border: `1px solid ${hasErr ? 'var(--red)' : 'var(--black-border)'}` }} />
                        {hasErr && <div style={{ fontSize: 10, color: 'var(--red-light)', marginTop: 2 }}>0-120</div>}
                      </div>
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
          matchPlayers.length === 0 ? (
            <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak danych o składzie</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {matchPlayers.map(mp => (
                <div key={mp.id} style={{ padding: '10px 14px', background: '#161616', border: '1px solid var(--black-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15 }}>
                    {mp.players?.shirt_number ? `#${mp.players.shirt_number} ` : ''}{mp.players?.last_name} {mp.players?.first_name}
                  </span>
                  <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)' }}>{mp.minutes_played}'</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Goals */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>⚽ Gole ({goals.length})</div>
        {goals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: isAdmin ? 16 : 0 }}>
            {goals.map(g => (
              <div key={g.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#161616', border: '1px solid var(--black-border)' }}>
                <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15 }}>⚽ {g.players?.last_name} {g.players?.first_name}</span>
                {isAdmin && <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => removeGoal(g.id)}>Usuń</button>}
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input-field" style={{ flex: 1, minWidth: 200 }} value={newGoalPlayerId} onChange={e => setNewGoalPlayerId(e.target.value)}>
              <option value="">Wybierz strzelca...</option>
              {allPlayers.map(p => <option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>)}
            </select>
            <button className="btn-primary" onClick={addGoal}>+ Dodaj gol</button>
          </div>
        )}
        {!isAdmin && goals.length === 0 && <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak danych o golach</div>}
      </div>

      {/* Cards */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>🟡 Kartki ({cards.length})</div>
        {cards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: isAdmin ? 16 : 0 }}>
            {cards.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: '#161616', border: '1px solid var(--black-border)' }}>
                <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15 }}>{CARD_LABELS[c.card_type]} — {c.players?.last_name} {c.players?.first_name}</span>
                {isAdmin && <button className="btn-danger" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => removeCard(c.id)}>Usuń</button>}
              </div>
            ))}
          </div>
        )}
        {isAdmin && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input-field" style={{ flex: 1, minWidth: 200 }} value={newCardPlayerId} onChange={e => setNewCardPlayerId(e.target.value)}>
              <option value="">Wybierz zawodnika...</option>
              {allPlayers.map(p => <option key={p.id} value={p.id}>{p.last_name} {p.first_name}</option>)}
            </select>
            <select className="input-field" style={{ width: 180 }} value={newCardType} onChange={e => setNewCardType(e.target.value)}>
              <option value="yellow">🟡 Żółta</option>
              <option value="red">🔴 Czerwona</option>
              <option value="double_yellow">🟡🔴 2x Żółta</option>
            </select>
            <button className="btn-primary" onClick={addCard}>+ Dodaj kartkę</button>
          </div>
        )}
        {!isAdmin && cards.length === 0 && <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak kartek</div>}
      </div>
    </div>
  )
}
