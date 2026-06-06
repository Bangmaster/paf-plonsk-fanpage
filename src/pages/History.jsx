import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

const TABS = ['mecze', 'tabela', 'statystyki']

export default function History() {
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [openSeason, setOpenSeason] = useState(null)
  const [seasonData, setSeasonData] = useState({})
  const [activeTab, setActiveTab] = useState({})
  const [allTimeStats, setAllTimeStats] = useState([])
  const [allTimeTab, setAllTimeTab] = useState('goals')
  const [allTimeLoading, setAllTimeLoading] = useState(false)
  const [showAllTime, setShowAllTime] = useState(false)

  async function loadSeasons() {
    const { data } = await supabase.from('seasons').select('*').order('created_at', { ascending: false })
    setSeasons(data || [])
    setLoading(false)
  }

  useEffect(() => { loadSeasons() }, [])

  async function loadAllTimeStats() {
    setAllTimeLoading(true)
    const { data } = await supabase.from('season_player_stats').select('*')
    const merged = {}
    ;(data || []).forEach(s => {
      const key = s.player_name
      if (!merged[key]) merged[key] = { name: key, goals: 0, goals_liga: 0, goals_puchar: 0, minutes: 0, yellow_cards: 0, yellow_liga: 0, yellow_puchar: 0, red_cards: 0, red_liga: 0, red_puchar: 0, matches_played: 0, seasons: 0 }
      merged[key].goals += s.goals || 0
      merged[key].goals_liga += s.goals_liga || 0
      merged[key].goals_puchar += s.goals_puchar || 0
      merged[key].minutes += s.minutes || 0
      merged[key].yellow_cards += s.yellow_cards || 0
      merged[key].yellow_liga += s.yellow_liga || 0
      merged[key].yellow_puchar += s.yellow_puchar || 0
      merged[key].red_cards += s.red_cards || 0
      merged[key].red_liga += s.red_liga || 0
      merged[key].red_puchar += s.red_puchar || 0
      merged[key].matches_played += s.matches_played || 0
      merged[key].seasons++
    })
    setAllTimeStats(Object.values(merged))
    setAllTimeLoading(false)
  }

  async function openSeasonDetail(season) {
    if (openSeason === season.id) { setOpenSeason(null); return }
    setOpenSeason(season.id)
    if (!activeTab[season.id]) setActiveTab(prev => ({ ...prev, [season.id]: 'mecze' }))
    if (seasonData[season.id]) return

    const [{ data: matches }, { data: table }, { data: playerStats }] = await Promise.all([
      supabase.from('matches').select('*').eq('season_id', season.id).order('match_date', { ascending: true }),
      supabase.from('league_table').select('*').eq('season_id', season.id).order('points', { ascending: false }),
      supabase.from('season_player_stats').select('*').eq('season_id', season.id),
    ])
    setSeasonData(prev => ({ ...prev, [season.id]: { matches: matches || [], table: table || [], playerStats: playerStats || [] } }))
  }

  function setTab(seasonId, tab) {
    setActiveTab(prev => ({ ...prev, [seasonId]: tab }))
  }

  const tabStyle = (current, tab) => ({
    fontFamily: 'var(--font-condensed)', fontSize: 13, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase', padding: '6px 16px',
    border: 'none', cursor: 'pointer',
    background: current === tab ? 'var(--red)' : '#1a1a1a',
    color: current === tab ? 'var(--white)' : 'var(--white-muted)',
    transition: 'all 0.2s',
  })

  const allTimeTabStyle = (tab) => ({
    fontFamily: 'var(--font-condensed)', fontSize: 13, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase', padding: '6px 16px',
    border: 'none', cursor: 'pointer',
    background: allTimeTab === tab ? 'var(--gold)' : '#1a1a1a',
    color: allTimeTab === tab ? 'var(--black)' : 'var(--white-muted)',
    transition: 'all 0.2s',
  })

  const sortedAllTime = {
    goals: [...allTimeStats].sort((a, b) => b.goals - a.goals),
    minutes: [...allTimeStats].sort((a, b) => b.minutes - a.minutes),
    cards: [...allTimeStats].sort((a, b) => (b.yellow_cards + b.red_cards * 2) - (a.yellow_cards + a.red_cards * 2)),
    matches: [...allTimeStats].sort((a, b) => b.matches_played - a.matches_played),
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <h1 className="section-title">Historia sezonów</h1>
      <div className="gold-line" />

      {/* All-time stats */}
      <div className="card" style={{ marginBottom: 32, borderLeft: '4px solid var(--gold)' }}>
        <div
          style={{ padding: '20px 24px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onClick={() => {
            setShowAllTime(!showAllTime)
            if (!showAllTime && allTimeStats.length === 0) loadAllTimeStats()
          }}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: 3, color: 'var(--gold)' }}>
              🏆 Statystyki wszech czasów
            </div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', letterSpacing: 1, marginTop: 4 }}>
              Suma statystyk ze wszystkich sezonów
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--white-muted)' }}>
            {showAllTime ? '▲' : '▼'}
          </div>
        </div>

        {showAllTime && (
          <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--black-border)' }}>
            {allTimeLoading ? (
              <div style={{ padding: '24px 0', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Ładowanie...</div>
            ) : allTimeStats.length === 0 ? (
              <div style={{ padding: '24px 0', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak danych — zakończ przynajmniej jeden sezon.</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 4, marginTop: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                  <button style={allTimeTabStyle('goals')} onClick={() => setAllTimeTab('goals')}>⚽ Gole</button>
                  <button style={allTimeTabStyle('minutes')} onClick={() => setAllTimeTab('minutes')}>⏱️ Minuty</button>
                  <button style={allTimeTabStyle('matches')} onClick={() => setAllTimeTab('matches')}>📋 Mecze</button>
                  <button style={allTimeTabStyle('cards')} onClick={() => setAllTimeTab('cards')}>🟡 Kartki</button>
                </div>
                <StatsTable players={sortedAllTime[allTimeTab]} tab={allTimeTab} />
              </>
            )}
          </div>
        )}
      </div>

      {/* Seasons list */}
      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : seasons.length === 0 ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>
          Brak zapisanych sezonów. Zakończ sezon w Panelu Admina.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {seasons.map(season => {
            const isOpen = openSeason === season.id
            const data = seasonData[season.id]
            const currentTab = activeTab[season.id] || 'mecze'
            const wins = data?.matches?.filter(m => {
              const usF = m.score_us_extra ?? m.score_us
              const themF = m.score_them_extra ?? m.score_them
              return usF > themF
            }).length || 0
            const losses = data?.matches?.filter(m => {
              const usF = m.score_us_extra ?? m.score_us
              const themF = m.score_them_extra ?? m.score_them
              return usF < themF
            }).length || 0
            const draws = (data?.matches?.filter(m => m.score_us !== null).length || 0) - wins - losses
            const pafPos = data?.table?.findIndex(t => t.team_name.toLowerCase().includes('paf')) + 1

            return (
              <div key={season.id} className="card" style={{ overflow: 'hidden' }}>
                {/* Header */}
                <div
                  style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderLeft: '4px solid var(--red)', flexWrap: 'wrap', gap: 12 }}
                  onClick={() => openSeasonDetail(season)}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: 3, color: 'var(--white)' }}>
                      Sezon <span style={{ color: 'var(--gold)' }}>{season.name}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', letterSpacing: 1, marginTop: 4 }}>
                      {format(parseISO(season.created_at), 'd MMMM yyyy', { locale: pl })}
                      {pafPos > 0 && ` • PAF: ${pafPos}. miejsce`}
                      {data && ` • ${wins}W ${draws}R ${losses}P`}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--white-muted)' }}>
                    {isOpen ? '▲' : '▼'}
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--black-border)' }}>
                    {!data ? (
                      <div style={{ padding: 24, color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Ładowanie...</div>
                    ) : (
                      <>
                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: 4, padding: '16px 24px 0', flexWrap: 'wrap' }}>
                          <button style={tabStyle(currentTab, 'mecze')} onClick={() => setTab(season.id, 'mecze')}>📅 Mecze</button>
                          <button style={tabStyle(currentTab, 'tabela')} onClick={() => setTab(season.id, 'tabela')}>📊 Tabela</button>
                          <button style={tabStyle(currentTab, 'statystyki')} onClick={() => setTab(season.id, 'statystyki')}>⚽ Statystyki</button>
                        </div>

                        <div style={{ padding: '16px 24px 24px' }}>
                          {/* Mecze */}
                          {currentTab === 'mecze' && (
                            data.matches.length === 0 ? (
                              <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak meczów</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {data.matches.map(m => {
                                  const date = m.match_date ? format(parseISO(m.match_date), 'd MMM yyyy', { locale: pl }) : '—'
                                  const usF = m.score_us_extra ?? m.score_us
                                  const themF = m.score_them_extra ?? m.score_them
                                  const result = usF > themF ? 'W' : usF < themF ? 'P' : 'R'
                                  const rc = result === 'W' ? '#4ade80' : result === 'P' ? 'var(--red-light)' : 'var(--gold)'
                                  return (
                                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#161616', border: '1px solid var(--black-border)', flexWrap: 'wrap' }}>
                                      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', minWidth: 85 }}>{date}</span>
                                      <span className={m.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>{m.competition === 'puchar' ? 'Puchar' : 'Liga'}</span>
                                      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, flex: 1 }}>PAF Płońsk vs {m.opponent}</span>
                                      {m.score_us !== null && (
                                        <>
                                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{m.score_us}:{m.score_them}</span>
                                          {m.score_us_extra !== null && m.score_us_extra !== undefined && (
                                            <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--gold)' }}>
                                              ({m.extra_type === 'penalties' ? 'k' : 'd'}: {m.score_us_extra}:{m.score_them_extra})
                                            </span>
                                          )}
                                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: rc, minWidth: 14 }}>{result}</span>
                                        </>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          )}

                          {/* Tabela */}
                          {currentTab === 'tabela' && (
                            data.table.length === 0 ? (
                              <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak danych tabeli</div>
                            ) : (
                              <div style={{ overflow: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 50px 50px 70px 50px', padding: '8px 12px', borderBottom: '1px solid var(--red)', gap: 4, minWidth: 380 }}>
                                  {['#', 'Drużyna', 'M', 'G+', 'G-', 'Pkt'].map((h, i) => (
                                    <div key={i} style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', textAlign: i > 1 ? 'center' : 'left' }}>{h}</div>
                                  ))}
                                </div>
                                {data.table.map((team, i) => {
                                  const isPAF = team.team_name.toLowerCase().includes('paf')
                                  return (
                                    <div key={team.id} style={{ display: 'grid', gridTemplateColumns: '36px 1fr 50px 50px 70px 50px', padding: '10px 12px', borderBottom: '1px solid #1a1a1a', background: isPAF ? '#1a0f00' : 'transparent', alignItems: 'center', gap: 4, minWidth: 380 }}>
                                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: i === 0 ? 'var(--gold)' : 'var(--white-muted)', textAlign: 'center' }}>{i + 1}</div>
                                      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, fontWeight: isPAF ? 700 : 400, color: isPAF ? 'var(--gold)' : 'var(--white)' }}>{team.team_name}</div>
                                      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, textAlign: 'center' }}>{team.played}</div>
                                      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, textAlign: 'center', color: '#4ade80' }}>{team.goals_for}</div>
                                      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, textAlign: 'center', color: 'var(--red-light)' }}>{team.goals_against}</div>
                                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, textAlign: 'center', color: isPAF ? 'var(--gold)' : 'var(--white)' }}>{team.points}</div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          )}

                          {/* Statystyki */}
                          {currentTab === 'statystyki' && (
                            data.playerStats.length === 0 ? (
                              <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak statystyk dla tego sezonu</div>
                            ) : (
                              <SeasonStats players={data.playerStats} />
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SeasonStats({ players }) {
  const [tab, setTab] = useState('goals')
  const sorted = {
    goals: [...players].sort((a, b) => b.goals - a.goals),
    minutes: [...players].sort((a, b) => b.minutes - a.minutes),
    matches: [...players].sort((a, b) => b.matches_played - a.matches_played),
    cards: [...players].sort((a, b) => (b.yellow_cards + b.red_cards * 2) - (a.yellow_cards + a.red_cards * 2)),
  }
  const tabStyle = (t) => ({
    fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 700,
    letterSpacing: 1, textTransform: 'uppercase', padding: '5px 12px',
    border: 'none', cursor: 'pointer',
    background: tab === t ? 'var(--red)' : '#111',
    color: tab === t ? 'var(--white)' : 'var(--white-muted)',
    transition: 'all 0.2s',
  })
  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        <button style={tabStyle('goals')} onClick={() => setTab('goals')}>⚽ Gole</button>
        <button style={tabStyle('minutes')} onClick={() => setTab('minutes')}>⏱️ Minuty</button>
        <button style={tabStyle('matches')} onClick={() => setTab('matches')}>📋 Mecze</button>
        <button style={tabStyle('cards')} onClick={() => setTab('cards')}>🟡 Kartki</button>
      </div>
      <StatsTable players={sorted[tab]} tab={tab} />
    </div>
  )
}

function StatsTable({ players, tab }) {
  if (!players || players.length === 0) return (
    <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak danych</div>
  )

  const cols = {
    goals: '36px 1fr 60px 60px 60px',
    minutes: '36px 1fr 80px',
    matches: '36px 1fr 80px',
    cards: '36px 1fr 60px 60px 60px 60px',
  }

  return (
    <div style={{ overflow: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: cols[tab], padding: '8px 12px', borderBottom: '1px solid var(--black-border)', gap: 4, minWidth: tab === 'cards' ? 420 : 300 }}>
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--white-muted)', textTransform: 'uppercase' }}>#</div>
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--white-muted)', textTransform: 'uppercase' }}>Zawodnik</div>
        {tab === 'goals' && <>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', textAlign: 'center' }}>Łącznie</div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--red-light)', textTransform: 'uppercase', textAlign: 'center' }}>Liga</div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: '#facc15', textTransform: 'uppercase', textAlign: 'center' }}>Puchar</div>
        </>}
        {tab === 'minutes' && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', textAlign: 'center' }}>Min</div>}
        {tab === 'matches' && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--gold)', textTransform: 'uppercase', textAlign: 'center' }}>Mecze</div>}
        {tab === 'cards' && <>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: '#facc15', textTransform: 'uppercase', textAlign: 'center' }}>🟡 Łącz.</div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: '#facc15', textTransform: 'uppercase', textAlign: 'center' }}>Liga</div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: '#facc15', textTransform: 'uppercase', textAlign: 'center' }}>Puchar</div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--red-light)', textTransform: 'uppercase', textAlign: 'center' }}>🔴</div>
        </>}
      </div>

      {players.map((p, i) => {
        const isTop = i === 0
        return (
          <div key={p.player_name + i} style={{
            display: 'grid', gridTemplateColumns: cols[tab],
            padding: '10px 12px', borderBottom: '1px solid #1a1a1a',
            background: isTop ? '#1a1200' : i % 2 === 0 ? 'transparent' : '#111',
            alignItems: 'center', gap: 4,
            minWidth: tab === 'cards' ? 420 : 300,
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 20 : 16, color: isTop ? 'var(--gold)' : 'var(--white-muted)' }}>{i + 1}</div>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, fontWeight: isTop ? 700 : 400 }}>
              {p.player_name || p.name}
              {isTop && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--gold)' }}>👑</span>}
              {p.seasons > 1 && <span style={{ marginLeft: 6, fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--white-muted)' }}>{p.seasons} sez.</span>}
            </div>
            {tab === 'goals' && <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 24 : 18, color: isTop ? 'var(--gold)' : 'var(--white)', textAlign: 'center' }}>{p.goals}</div>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, color: 'var(--white-dim)', textAlign: 'center' }}>{p.goals_liga}</div>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, color: p.goals_puchar > 0 ? '#facc15' : 'var(--white-muted)', textAlign: 'center' }}>{p.goals_puchar}</div>
            </>}
            {tab === 'minutes' && <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 24 : 18, color: isTop ? 'var(--gold)' : 'var(--white)', textAlign: 'center' }}>{p.minutes}'</div>}
            {tab === 'matches' && <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 24 : 18, color: isTop ? 'var(--gold)' : 'var(--white)', textAlign: 'center' }}>{p.matches_played}</div>}
            {tab === 'cards' && <>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 22 : 18, color: '#facc15', textAlign: 'center' }}>{p.yellow_cards}</div>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: p.yellow_liga > 0 ? '#facc15' : 'var(--white-muted)', textAlign: 'center' }}>{p.yellow_liga}</div>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: p.yellow_puchar > 0 ? '#facc15' : 'var(--white-muted)', textAlign: 'center' }}>{p.yellow_puchar}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: isTop ? 22 : 18, color: p.red_cards > 0 ? 'var(--red-light)' : 'var(--white-muted)', textAlign: 'center' }}>{p.red_cards}</div>
            </>}
          </div>
        )
      })}
    </div>
  )
}
