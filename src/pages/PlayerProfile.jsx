import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

export default function PlayerProfile() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [tab, setTab] = useState('current')
  const [loading, setLoading] = useState(true)

  // Bieżący sezon
  const [currentMatches, setCurrentMatches] = useState([])
  const [currentGoals, setCurrentGoals] = useState([])
  const [currentCards, setCurrentCards] = useState([])

  // Poprzednie sezony
  const [seasonStats, setSeasonStats] = useState([])
  const [seasonMatches, setSeasonMatches] = useState([])
  const [seasonGoals, setSeasonGoals] = useState([])
  const [seasonCards, setSeasonCards] = useState([])
  const [seasons, setSeasons] = useState([])

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('players').select('*').eq('id', id).single()
      setPlayer(p)

      const [{ data: mp }, { data: g }, { data: c }, { data: ss }, { data: seasonsData }] = await Promise.all([
        supabase.from('match_players')
          .select('*, matches(id, match_date, opponent, score_us, score_them, score_us_extra, score_them_extra, competition, is_home, status, season_id)')
          .eq('player_id', id),
        supabase.from('goals')
          .select('*, matches(id, match_date, opponent, competition, season_id)')
          .eq('player_id', id),
        supabase.from('cards')
          .select('*, matches(id, match_date, opponent, competition, season_id)')
          .eq('player_id', id),
        supabase.from('season_player_stats')
          .select('*, seasons(id, name)')
          .eq('player_id', id)
          .order('created_at', { ascending: false }),
        supabase.from('seasons').select('*').order('created_at', { ascending: false }),
      ])

      // Bieżący sezon — season_id IS NULL
      setCurrentMatches((mp || []).filter(m => m.matches?.season_id === null && m.matches?.status === 'played'))
      setCurrentGoals((g || []).filter(g => g.matches?.season_id === null))
      setCurrentCards((c || []).filter(c => c.matches?.season_id === null))

      // Poprzednie sezony — wszystkie z season_id
      setSeasonMatches((mp || []).filter(m => m.matches?.season_id !== null && m.matches?.status === 'played'))
      setSeasonGoals((g || []).filter(g => g.matches?.season_id !== null))
      setSeasonCards((c || []).filter(c => c.matches?.season_id !== null))
      setSeasonStats(ss || [])
      setSeasons(seasonsData || [])

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
  )

  if (!player) return (
    <div style={{ padding: 48, textAlign: 'center', color: 'var(--red-light)', fontFamily: 'var(--font-condensed)' }}>
      Nie znaleziono zawodnika. <Link to="/zawodnicy" style={{ color: 'var(--gold)' }}>Wróć</Link>
    </div>
  )

  const tabStyle = (t) => ({
    fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14,
    letterSpacing: 1.5, textTransform: 'uppercase', padding: '10px 20px',
    border: 'none', cursor: 'pointer',
    background: tab === t ? 'var(--red)' : 'var(--black-card)',
    color: tab === t ? 'var(--white)' : 'var(--white-muted)',
    transition: 'all 0.2s',
  })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <Link to="/zawodnicy" style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', display: 'inline-block', marginBottom: 24 }}>
        ← Zawodnicy
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, flexWrap: 'wrap' }}>
        <div style={{
          width: 80, height: 80,
          background: player.active ? 'var(--red)' : 'var(--black-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: player.shirt_number ? 32 : 22,
          color: 'var(--white)', flexShrink: 0,
        }}>
          {player.shirt_number || `${player.last_name[0]}${player.first_name[0]}`}
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 6vw, 48px)', letterSpacing: 3, lineHeight: 1 }}>
            {player.last_name} {player.first_name}
          </h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            {player.shirt_number && <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--gold)', letterSpacing: 1 }}>#{player.shirt_number}</span>}
            {!player.active && <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--white-muted)', letterSpacing: 2, textTransform: 'uppercase' }}>Nieaktywny</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        <button style={tabStyle('current')} onClick={() => setTab('current')}>⚽ Bieżący sezon</button>
        <button style={tabStyle('history')} onClick={() => setTab('history')}>
          📋 Poprzednie sezony {seasons.length > 0 && `(${seasons.length})`}
        </button>
      </div>

      {tab === 'current' && (
        <SeasonView
          matches={currentMatches}
          goals={currentGoals}
          cards={currentCards}
          seasonLabel="Bieżący sezon"
        />
      )}

      {tab === 'history' && (
        seasons.length === 0 ? (
          <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 15, padding: '24px 0' }}>
            Brak danych z poprzednich sezonów.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {seasons.map(season => {
              const sMatches = seasonMatches.filter(m => m.matches?.season_id === season.id)
              const sGoals = seasonGoals.filter(g => g.matches?.season_id === season.id)
              const sCards = seasonCards.filter(c => c.matches?.season_id === season.id)
              if (sMatches.length === 0 && sGoals.length === 0) return null
              return (
                <div key={season.id}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 3, color: 'var(--gold)', marginBottom: 12 }}>
                    Sezon {season.name}
                  </div>
                  <SeasonView
                    matches={sMatches}
                    goals={sGoals}
                    cards={sCards}
                    seasonLabel={season.name}
                  />
                </div>
              )
            })}
          </div>
        )
      )}
    </div>
  )
}

function SeasonView({ matches, goals, cards, seasonLabel }) {
  const totalMinutes = matches.reduce((s, m) => s + (m.minutes_played || 0), 0)
  const totalGoals = goals.length
  const goalsLiga = goals.filter(g => g.matches?.competition !== 'puchar').length
  const goalsPuchar = goals.filter(g => g.matches?.competition === 'puchar').length
  const yellowCards = cards.filter(c => c.card_type === 'yellow' || c.card_type === 'double_yellow').length
  const redCards = cards.filter(c => c.card_type === 'red' || c.card_type === 'double_yellow').length

  const goalsByMatch = {}
  goals.forEach(g => {
    if (!g.matches?.id) return
    goalsByMatch[g.matches.id] = (goalsByMatch[g.matches.id] || 0) + 1
  })
  const cardsByMatch = {}
  cards.forEach(c => {
    if (!c.matches?.id) return
    if (!cardsByMatch[c.matches.id]) cardsByMatch[c.matches.id] = []
    cardsByMatch[c.matches.id].push(c.card_type)
  })

  if (matches.length === 0 && goals.length === 0) return (
    <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 15, padding: '16px 0' }}>
      Brak danych w tym sezonie.
    </div>
  )

  return (
    <div>
      {/* Statystyki */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatBox label="Mecze" value={matches.length} />
        <StatBox label="Minuty" value={`${totalMinutes}'`} />
        <StatBox label="Gole" value={totalGoals} color="var(--gold)" />
        {goalsLiga > 0 && <StatBox label="Liga" value={goalsLiga} color="var(--red-light)" />}
        {goalsPuchar > 0 && <StatBox label="Puchar" value={goalsPuchar} color="#facc15" />}
        {yellowCards > 0 && <StatBox label="Żółte" value={yellowCards} color="#facc15" />}
        {redCards > 0 && <StatBox label="Czerwone" value={redCards} color="var(--red-light)" />}
      </div>

      {/* Lista meczów */}
      {matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[...matches].sort((a, b) => new Date(b.matches?.match_date) - new Date(a.matches?.match_date)).map(mp => {
            const m = mp.matches
            if (!m) return null
            const date = m.match_date ? format(parseISO(m.match_date), 'd MMM yyyy', { locale: pl }) : '—'
            const usF = m.score_us_extra ?? m.score_us
            const themF = m.score_them_extra ?? m.score_them
            const result = usF > themF ? 'W' : usF < themF ? 'P' : 'R'
            const rc = result === 'W' ? '#4ade80' : result === 'P' ? 'var(--red-light)' : 'var(--gold)'
            const matchGoals = goalsByMatch[m.id] || 0
            const matchCards = cardsByMatch[m.id] || []

            return (
              <Link key={mp.id} to={`/mecz/${m.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  background: '#161616', border: '1px solid var(--black-border)',
                  transition: 'border-color 0.15s, background 0.15s', flexWrap: 'wrap',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = '#1a1200' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--black-border)'; e.currentTarget.style.background = '#161616' }}
                >
                  <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', minWidth: 85 }}>{date}</span>
                  <span className={m.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>{m.competition === 'puchar' ? 'Puchar' : 'Liga'}</span>
                  <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, flex: 1 }}>PAF Płońsk vs {m.opponent}</span>
                  {m.score_us !== null && (
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{m.score_us}:{m.score_them}</span>
                  )}
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: rc, minWidth: 14 }}>{result}</span>
                  <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', minWidth: 32 }}>{mp.minutes_played}'</span>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {matchGoals > 0 && <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--gold)' }}>⚽{matchGoals > 1 ? ` x${matchGoals}` : ''}</span>}
                    {matchCards.map((ct, i) => (
                      <span key={i}>{ct === 'yellow' ? '🟡' : ct === 'red' ? '🔴' : '🟡🔴'}</span>
                    ))}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
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
