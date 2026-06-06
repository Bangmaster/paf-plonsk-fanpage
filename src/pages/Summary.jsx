import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Summary() {
  const [loading, setLoading] = useState(true)
  const [teamStats, setTeamStats] = useState(null)
  const [playerStats, setPlayerStats] = useState([])
  const [tab, setTab] = useState('goals')

  useEffect(() => {
    async function load() {
      const [{ data: matches }, { data: goals }, { data: cards }, { data: matchPlayers }] = await Promise.all([
        supabase.from('matches').select('*').eq('status', 'played'),
        supabase.from('goals').select('*, players(first_name, last_name), matches(competition)'),
        supabase.from('cards').select('*, players(first_name, last_name), matches(competition)'),
        supabase.from('match_players').select('*, players(first_name, last_name), matches(status)'),
      ])

      const played = matches || []
      let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0
      played.forEach(m => {
        if (m.score_us === null) return
        goalsFor += m.score_us
        goalsAgainst += m.score_them
        const usF = m.score_us_extra !== null && m.score_us_extra !== undefined ? m.score_us_extra : m.score_us
        const themF = m.score_them_extra !== null && m.score_them_extra !== undefined ? m.score_them_extra : m.score_them
        if (usF > themF) wins++
        else if (usF === themF) draws++
        else losses++
      })

      setTeamStats({ played: played.length, wins, draws, losses, goalsFor, goalsAgainst })

      const stats = {}

      ;(matchPlayers || []).filter(mp => mp.matches?.status === 'played').forEach(mp => {
        const pid = mp.player_id
        const name = mp.players ? `${mp.players.first_name} ${mp.players.last_name}` : '?'
        if (!stats[pid]) stats[pid] = { name, goals: 0, goals_liga: 0, goals_puchar: 0, minutes: 0, yellow: 0, yellow_liga: 0, yellow_puchar: 0, red: 0, red_liga: 0, red_puchar: 0 }
        stats[pid].minutes += mp.minutes_played || 0
      })

      ;(goals || []).forEach(g => {
        const pid = g.player_id
        const name = g.players ? `${g.players.first_name} ${g.players.last_name}` : '?'
        if (!stats[pid]) stats[pid] = { name, goals: 0, goals_liga: 0, goals_puchar: 0, minutes: 0, yellow: 0, yellow_liga: 0, yellow_puchar: 0, red: 0, red_liga: 0, red_puchar: 0 }
        stats[pid].goals++
        if (g.matches?.competition === 'puchar') stats[pid].goals_puchar++
        else stats[pid].goals_liga++
      })

      ;(cards || []).forEach(c => {
        const pid = c.player_id
        const name = c.players ? `${c.players.first_name} ${c.players.last_name}` : '?'
        if (!stats[pid]) stats[pid] = { name, goals: 0, goals_liga: 0, goals_puchar: 0, minutes: 0, yellow: 0, yellow_liga: 0, yellow_puchar: 0, red: 0, red_liga: 0, red_puchar: 0 }
        const isPuchar = c.matches?.competition === 'puchar'
        if (c.card_type === 'yellow' || c.card_type === 'double_yellow') {
          stats[pid].yellow++
          if (isPuchar) stats[pid].yellow_puchar++
          else stats[pid].yellow_liga++
        }
        if (c.card_type === 'red' || c.card_type === 'double_yellow') {
          stats[pid].red++
          if (isPuchar) stats[pid].red_puchar++
          else stats[pid].red_liga++
        }
      })

      setPlayerStats(Object.entries(stats).map(([id, s]) => ({ id, ...s })))
      setLoading(false)
    }
    load()
  }, [])

  const sorted = {
    goals: [...playerStats].sort((a, b) => b.goals - a.goals || b.minutes - a.minutes),
    minutes: [...playerStats].sort((a, b) => b.minutes - a.minutes),
    cards: [...playerStats].sort((a, b) => (b.yellow + b.red * 2) - (a.yellow + a.red * 2)),
  }

  const tabStyle = (t) => ({
    fontFamily: 'var(--font-condensed)', fontSize: 14, fontWeight: 700,
    letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 20px',
    border: 'none', cursor: 'pointer',
    background: tab === t ? 'var(--red)' : 'var(--black-card)',
    color: tab === t ? 'var(--white)' : 'var(--white-muted)',
    transition: 'all 0.2s',
  })

  const colHeader = (label, color) => (
    <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 1, color, textTransform: 'uppercase', textAlign: 'center' }}>{label}</div>
  )

  const gridCols = {
    goals: '44px 1fr 70px 70px 70px',
    minutes: '44px 1fr 80px',
    cards: '44px 1fr 65px 65px 65px 65px',
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <h1 className="section-title">Podsumowanie Sezonu</h1>
      <div className="gold-line" />

      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : (
        <>
          {teamStats && (
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
                Statystyki drużyny
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <TeamStat label="Mecze" value={teamStats.played} />
                <TeamStat label="Wygrane" value={teamStats.wins} color="#4ade80" />
                <TeamStat label="Remisy" value={teamStats.draws} color="var(--gold)" />
                <TeamStat label="Przegrane" value={teamStats.losses} color="var(--red-light)" />
                <TeamStat label="Bramki +" value={teamStats.goalsFor} color="var(--gold)" />
                <TeamStat label="Bramki -" value={teamStats.goalsAgainst} />
                <TeamStat
                  label="Bilans"
                  value={`${teamStats.goalsFor - teamStats.goalsAgainst > 0 ? '+' : ''}${teamStats.goalsFor - teamStats.goalsAgainst}`}
                  color={teamStats.goalsFor > teamStats.goalsAgainst ? '#4ade80' : teamStats.goalsFor < teamStats.goalsAgainst ? 'var(--red-light)' : 'var(--white)'}
                />
              </div>
            </div>
          )}

          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 16 }}>
            Rankingi zawodników
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
            <button style={tabStyle('goals')} onClick={() => setTab('goals')}>⚽ Gole</button>
            <button style={tabStyle('minutes')} onClick={() => setTab('minutes')}>⏱️ Minuty</button>
            <button style={tabStyle('cards')} onClick={() => setTab('cards')}>🟡 Kartki</button>
          </div>

          <div className="card" style={{ overflow: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: gridCols[tab], borderBottom: '1px solid var(--black-border)', padding: '10px 16px', gap: 4, minWidth: tab === 'cards' ? 500 : 'auto' }}>
              {colHeader('#', 'var(--white-muted)')}
              {colHeader('Zawodnik', 'var(--white-muted)')}
              {tab === 'goals' && <>
                {colHeader('Łącznie', 'var(--gold)')}
                {colHeader('Liga', 'var(--red-light)')}
                {colHeader('Puchar', '#facc15')}
              </>}
              {tab === 'minutes' && colHeader('Min', 'var(--gold)')}
              {tab === 'cards' && <>
                {colHeader('🟡 Łącznie', '#facc15')}
                {colHeader('🟡 Liga', '#facc15')}
                {colHeader('🟡 Puchar', '#facc15')}
                {colHeader('🔴 Łącznie', 'var(--red-light)')}
              </>}
            </div>

            {sorted[tab].length === 0 ? (
              <div style={{ padding: '24px 16px', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak danych</div>
            ) : sorted[tab].map((p, i) => {
              const isTop = i === 0
              return (
                <div key={p.id} style={{
                  display: 'grid', gridTemplateColumns: gridCols[tab],
                  padding: '12px 16px', borderBottom: '1px solid var(--black-border)',
                  background: isTop ? '#1a1200' : 'transparent',
                  alignItems: 'center', gap: 4,
                  minWidth: tab === 'cards' ? 500 : 'auto',
                  transition: 'background 0.2s',
                }}
                  onMouseEnter={e => { if (!isTop) e.currentTarget.style.background = '#161616' }}
                  onMouseLeave={e => { if (!isTop) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 22 : 18, color: isTop ? 'var(--gold)' : 'var(--white-muted)' }}>
                    {i + 1}
                  </div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, fontWeight: isTop ? 700 : 500 }}>
                    {p.name}
                    {isTop && tab !== 'cards' && <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--gold)' }}>👑</span>}
                  </div>

                  {tab === 'goals' && <>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 28 : 22, color: isTop ? 'var(--gold)' : 'var(--white)', textAlign: 'center' }}>{p.goals}</div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--white-dim)' }}>{p.goals_liga}</div>
                      {p.goals_liga > 0 && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, color: 'var(--red-light)', letterSpacing: 1 }}>liga</div>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: p.goals_puchar > 0 ? '#facc15' : 'var(--white-muted)' }}>{p.goals_puchar}</div>
                      {p.goals_puchar > 0 && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, color: '#facc15', letterSpacing: 1 }}>puchar</div>}
                    </div>
                  </>}

                  {tab === 'minutes' && (
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 28 : 22, color: isTop ? 'var(--gold)' : 'var(--white)', textAlign: 'center' }}>{p.minutes}'</div>
                  )}

                  {tab === 'cards' && <>
                    {/* Żółte łącznie */}
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 26 : 20, color: '#facc15', textAlign: 'center' }}>{p.yellow}</div>
                    {/* Żółte liga */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: p.yellow_liga > 0 ? '#facc15' : 'var(--white-muted)' }}>{p.yellow_liga}</div>
                      {p.yellow_liga > 0 && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, color: 'var(--white-muted)', letterSpacing: 1 }}>liga</div>}
                    </div>
                    {/* Żółte puchar */}
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: p.yellow_puchar > 0 ? '#facc15' : 'var(--white-muted)' }}>{p.yellow_puchar}</div>
                      {p.yellow_puchar > 0 && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, color: 'var(--white-muted)', letterSpacing: 1 }}>puchar</div>}
                    </div>
                    {/* Czerwone łącznie */}
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 26 : 20, color: p.red > 0 ? 'var(--red-light)' : 'var(--white-muted)', textAlign: 'center' }}>{p.red}</div>
                  </>}
                </div>
              )
            })}
          </div>

          {tab === 'cards' && (
            <div style={{ marginTop: 12, fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', letterSpacing: 1 }}>
              🔴 Czerwone kartki — podział liga/puchar dostępny po najechaniu na zawodnika
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TeamStat({ label, value, color = 'var(--white)' }) {
  return (
    <div style={{ background: 'var(--black-card)', border: '1px solid var(--black-border)', padding: '16px 20px', minWidth: 100, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color, letterSpacing: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
    </div>
  )
}
