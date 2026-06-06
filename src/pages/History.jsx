import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

export default function History() {
  const [seasons, setSeasons] = useState([])
  const [loading, setLoading] = useState(true)
  const [openSeason, setOpenSeason] = useState(null)
  const [seasonData, setSeasonData] = useState({})

  async function loadSeasons() {
    const { data } = await supabase.from('seasons').select('*').order('created_at', { ascending: false })
    setSeasons(data || [])
    setLoading(false)
  }

  useEffect(() => { loadSeasons() }, [])

  async function openSeasonDetail(season) {
    if (openSeason === season.id) { setOpenSeason(null); return }
    setOpenSeason(season.id)
    if (seasonData[season.id]) return

    const [{ data: matches }, { data: table }] = await Promise.all([
      supabase.from('matches').select('*').eq('season_id', season.id).order('match_date', { ascending: true }),
      supabase.from('league_table').select('*').eq('season_id', season.id).order('points', { ascending: false }),
    ])
    setSeasonData(prev => ({ ...prev, [season.id]: { matches: matches || [], table: table || [] } }))
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <h1 className="section-title">Historia sezonów</h1>
      <div className="gold-line" />

      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : seasons.length === 0 ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>
          Brak zapisanych sezonów. Zakończ sezon w Panelu Admina żeby go tutaj zapisać.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {seasons.map(season => {
            const isOpen = openSeason === season.id
            const data = seasonData[season.id]
            const wins = data?.matches?.filter(m => m.score_us > m.score_them).length || 0
            const draws = data?.matches?.filter(m => m.score_us === m.score_them && m.score_us !== null).length || 0
            const losses = data?.matches?.filter(m => m.score_us < m.score_them).length || 0
            const goalsFor = data?.matches?.reduce((s, m) => s + (m.score_us || 0), 0) || 0
            const goalsAgainst = data?.matches?.reduce((s, m) => s + (m.score_them || 0), 0) || 0
            const pafPosition = data?.table?.findIndex(t => t.team_name.toLowerCase().includes('paf')) + 1

            return (
              <div key={season.id} className="card" style={{ overflow: 'hidden' }}>
                {/* Season header */}
                <div
                  style={{
                    padding: '20px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    borderLeft: '4px solid var(--gold)',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                  onClick={() => openSeasonDetail(season)}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 3, color: 'var(--gold)' }}>
                      Sezon {season.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', letterSpacing: 1, marginTop: 4 }}>
                      Zapisano: {format(parseISO(season.created_at), 'd MMMM yyyy', { locale: pl })}
                      {pafPosition > 0 && ` • Pozycja PAF: ${pafPosition}. miejsce`}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--white-muted)' }}>
                    {isOpen ? '▲' : '▼'}
                  </div>
                </div>

                {/* Season detail */}
                {isOpen && (
                  <div style={{ padding: '0 24px 24px', borderTop: '1px solid var(--black-border)' }}>
                    {!data ? (
                      <div style={{ padding: '24px 0', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Ładowanie...</div>
                    ) : (
                      <>
                        {/* Team stats */}
                        <div style={{ margin: '20px 0 24px' }}>
                          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12 }}>
                            Wyniki PAF Płońsk
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <StatBox label="Mecze" value={data.matches.length} />
                            <StatBox label="Wygrane" value={wins} color="#4ade80" />
                            <StatBox label="Remisy" value={draws} color="var(--gold)" />
                            <StatBox label="Przegrane" value={losses} color="var(--red-light)" />
                            <StatBox label="Bramki +" value={goalsFor} color="#4ade80" />
                            <StatBox label="Bramki -" value={goalsAgainst} color="var(--red-light)" />
                          </div>
                        </div>

                        {/* Matches */}
                        {data.matches.length > 0 && (
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12 }}>
                              Mecze
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {data.matches.map(m => {
                                const date = m.match_date ? format(parseISO(m.match_date), 'd MMM yyyy', { locale: pl }) : '—'
                                const result = m.score_us > m.score_them ? 'W' : m.score_us < m.score_them ? 'P' : 'R'
                                const resultColor = result === 'W' ? '#4ade80' : result === 'P' ? 'var(--red-light)' : 'var(--gold)'
                                return (
                                  <div key={m.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
                                    background: '#161616', border: '1px solid var(--black-border)', flexWrap: 'wrap',
                                  }}>
                                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', minWidth: 90 }}>{date}</span>
                                    <span className={m.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>{m.competition === 'puchar' ? 'Puchar' : 'Liga'}</span>
                                    <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, flex: 1 }}>PAF Płońsk vs {m.opponent}</span>
                                    {m.score_us !== null && (
                                      <>
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{m.score_us}:{m.score_them}</span>
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: resultColor, minWidth: 16 }}>{result}</span>
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Table */}
                        {data.table.length > 0 && (
                          <div>
                            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 3, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 12 }}>
                              Tabela ligowa
                            </div>
                            <div style={{ overflow: 'auto' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 50px 50px 70px 50px', padding: '8px 12px', borderBottom: '1px solid var(--red)', gap: 4, minWidth: 400 }}>
                                {['#', 'Drużyna', 'M', 'G+', 'G-', 'Pkt'].map((h, i) => (
                                  <div key={i} style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', textAlign: i > 1 ? 'center' : 'left' }}>{h}</div>
                                ))}
                              </div>
                              {data.table.map((team, i) => {
                                const isPAF = team.team_name.toLowerCase().includes('paf')
                                return (
                                  <div key={team.id} style={{
                                    display: 'grid', gridTemplateColumns: '36px 1fr 50px 50px 70px 50px',
                                    padding: '10px 12px', borderBottom: '1px solid #1a1a1a',
                                    background: isPAF ? '#1a0f00' : 'transparent', alignItems: 'center', gap: 4, minWidth: 400,
                                  }}>
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
                          </div>
                        )}
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

function StatBox({ label, value, color = 'var(--white)' }) {
  return (
    <div style={{ background: '#161616', border: '1px solid var(--black-border)', padding: '12px 16px', textAlign: 'center', minWidth: 70 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, color, letterSpacing: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
    </div>
  )
}
