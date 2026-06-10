import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

const CARD_LABELS = { yellow: '🟡 Żółta', red: '🔴 Czerwona', double_yellow: '🟡🔴 2x Żółta' }

export default function PlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [matchPlayers, setMatchPlayers] = useState([])
  const [goals, setGoals] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: mp }, { data: g }, { data: c }] = await Promise.all([
        supabase.from('players').select('*').eq('id', id).single(),
        supabase.from('match_players').select('*, matches(id, match_date, opponent, score_us, score_them, score_us_extra, score_them_extra, competition, is_home, status)').eq('player_id', id).order('matches(match_date)', { ascending: false }),
        supabase.from('goals').select('*, matches(id, match_date, opponent, competition)').eq('player_id', id).order('matches(match_date)', { ascending: false }),
        supabase.from('cards').select('*, matches(id, match_date, opponent, competition)').eq('player_id', id).order('matches(match_date)', { ascending: false }),
      ])
      setPlayer(p)
      setMatchPlayers((mp || []).filter(m => m.matches?.status === 'played'))
      setGoals(g || [])
      setCards(c || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
  )

  if (!player) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--red-light)', fontFamily: 'var(--font-condensed)' }}>
      Nie znaleziono zawodnika. <Link to="/zawodnicy" style={{ color: 'var(--gold)' }}>Wróć do zawodników</Link>
    </div>
  )

  const totalMinutes = matchPlayers.reduce((s, m) => s + (m.minutes_played || 0), 0)
  const totalGoals = goals.length
  const goalsLiga = goals.filter(g => g.matches?.competition !== 'puchar').length
  const goalsPuchar = goals.filter(g => g.matches?.competition === 'puchar').length
  const yellowCards = cards.filter(c => c.card_type === 'yellow' || c.card_type === 'double_yellow').length
  const redCards = cards.filter(c => c.card_type === 'red' || c.card_type === 'double_yellow').length

  const sectionStyle = { background: 'var(--black-card)', border: '1px solid var(--black-border)', padding: 24, marginBottom: 20 }
  const sectionTitleStyle = { fontFamily: 'var(--font-condensed)', fontSize: 18, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 18, color: 'var(--gold)' }

  // Wszystkie mecze posortowane po dacie
  const allMatchDates = [...new Set([
    ...matchPlayers.map(m => m.matches?.id),
  ])].filter(Boolean)

  const matchMap = {}
  matchPlayers.forEach(m => { if (m.matches?.id) matchMap[m.matches.id] = m })

  const goalsByMatch = {}
  goals.forEach(g => {
    if (!g.matches?.id) return
    if (!goalsByMatch[g.matches.id]) goalsByMatch[g.matches.id] = 0
    goalsByMatch[g.matches.id]++
  })

  const cardsByMatch = {}
  cards.forEach(c => {
    if (!c.matches?.id) return
    if (!cardsByMatch[c.matches.id]) cardsByMatch[c.matches.id] = []
    cardsByMatch[c.matches.id].push(c.card_type)
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <Link to="/zawodnicy" style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', display: 'inline-block', marginBottom: 24 }}>
        ← Zawodnicy
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={{
          width: 80, height: 80, background: player.active ? 'var(--red)' : 'var(--black-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: player.shirt_number ? 32 : 24, color: 'var(--white)', flexShrink: 0,
        }}>
          {player.shirt_number || `${player.first_name[0]}${player.last_name[0]}`}
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 6vw, 48px)', letterSpacing: 3, lineHeight: 1 }}>
            {player.last_name} {player.first_name}
          </h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {player.shirt_number && (
              <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--gold)', letterSpacing: 1 }}>
                #{player.shirt_number}
              </span>
            )}
            {!player.active && (
              <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>
                Nieaktywny
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats overview */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatBox label="Mecze" value={matchPlayers.length} />
        <StatBox label="Minuty" value={`${totalMinutes}'`} />
        <StatBox label="Gole" value={totalGoals} color="var(--gold)" />
        {goalsLiga > 0 && <StatBox label="Gole liga" value={goalsLiga} color="var(--red-light)" />}
        {goalsPuchar > 0 && <StatBox label="Gole puchar" value={goalsPuchar} color="#facc15" />}
        {yellowCards > 0 && <StatBox label="Żółte" value={yellowCards} color="#facc15" />}
        {redCards > 0 && <StatBox label="Czerwone" value={redCards} color="var(--red-light)" />}
      </div>

      {/* Match history */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Historia meczów</div>
        {matchPlayers.length === 0 ? (
          <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak rozegranych meczów</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {matchPlayers.map(mp => {
              const m = mp.matches
              if (!m) return null
              const date = m.match_date ? format(parseISO(m.match_date), 'd MMM yyyy', { locale: pl }) : '—'
              const usF = m.score_us_extra ?? m.score_us
              const themF = m.score_them_extra ?? m.score_them
              const result = usF > themF ? 'W' : usF < themF ? 'P' : 'R'
              const resultColor = result === 'W' ? '#4ade80' : result === 'P' ? 'var(--red-light)' : 'var(--gold)'
              const matchGoals = goalsByMatch[m.id] || 0
              const matchCards = cardsByMatch[m.id] || []

              return (
                <Link key={mp.id} to={`/mecz/${m.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    background: '#161616', border: '1px solid var(--black-border)',
                    transition: 'border-color 0.15s', flexWrap: 'wrap',
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--white-muted)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--black-border)'}
                  >
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', minWidth: 85 }}>{date}</span>
                    <span className={m.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>{m.competition === 'puchar' ? 'Puchar' : 'Liga'}</span>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, flex: 1 }}>
                      PAF Płońsk vs {m.opponent}
                    </span>
                    {m.score_us !== null && (
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{m.score_us}:{m.score_them}</span>
                    )}
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: resultColor, minWidth: 16 }}>{result}</span>
                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', minWidth: 32 }}>
                      {mp.minutes_played}'
                    </span>
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {matchGoals > 0 && (
                        <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--gold)' }}>
                          ⚽{matchGoals > 1 ? ` x${matchGoals}` : ''}
                        </span>
                      )}
                      {matchCards.map((ct, i) => (
                        <span key={i} style={{ fontSize: 13 }}>
                          {ct === 'yellow' ? '🟡' : ct === 'red' ? '🔴' : '🟡🔴'}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatBox({ label, value, color = 'var(--white)' }) {
  return (
    <div style={{ background: 'var(--black-card)', border: '1px solid var(--black-border)', padding: '14px 20px', textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, color, letterSpacing: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
    </div>
  )
}
