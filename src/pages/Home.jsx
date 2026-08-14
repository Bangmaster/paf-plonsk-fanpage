import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { format, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns'
import { pl } from 'date-fns/locale'

async function incrementVisits() {
  try {
    const today = new Date().toDateString()
    const lastVisit = localStorage.getItem('paf_last_visit')
    const { data } = await supabase.from('page_visits').select('*').limit(1).single()
    if (!data) return 0
    if (lastVisit !== today) {
      localStorage.setItem('paf_last_visit', today)
      const { data: updated } = await supabase.from('page_visits').update({ count: (data.count || 0) + 1 }).eq('id', data.id).select().single()
      return updated?.count || data.count + 1
    }
    return data.count
  } catch { return 0 }
}

function Countdown({ match }) {
  const [timeLeft, setTimeLeft] = useState('')
  useEffect(() => {
    if (!match?.match_date) return
    function update() {
      const now = new Date()
      const matchDate = new Date(`${match.match_date}T${match.match_time || '00:00'}`)
      const diff = matchDate - now
      if (diff <= 0) { setTimeLeft('Trwa mecz!'); return }
      const days = differenceInDays(matchDate, now)
      const hours = differenceInHours(matchDate, now) % 24
      const minutes = differenceInMinutes(matchDate, now) % 60
      if (days > 0) setTimeLeft(`${days}d ${hours}h ${minutes}m`)
      else if (hours > 0) setTimeLeft(`${hours}h ${minutes}m`)
      else setTimeLeft(`${minutes} minut`)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [match])
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Do meczu</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--red)', letterSpacing: 2 }}>{timeLeft}</div>
    </div>
  )
}

function FormBadge({ result }) {
  const colors = { W: { bg: '#166534', color: '#4ade80' }, R: { bg: '#713f12', color: '#fbbf24' }, P: { bg: '#7f1d1d', color: '#f87171' } }
  const c = colors[result] || colors.R
  return (
    <div style={{ width: 28, height: 28, background: c.bg, color: c.color, fontFamily: 'var(--font-display)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 2, flexShrink: 0 }}>
      {result}
    </div>
  )
}

function MatchCard({ match, label, accent, goals }) {
  if (!match) return (
    <div className="card" style={{ padding: 28, flex: 1, minWidth: 280 }}>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2, color: accent, textTransform: 'uppercase', marginBottom: 16 }}>{label}</div>
      <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 16 }}>Brak danych</div>
    </div>
  )
  const date = match.match_date ? format(parseISO(match.match_date), 'd MMMM yyyy', { locale: pl }) : '—'
  const time = match.match_time ? match.match_time.slice(0, 5) : ''
  const isPlayed = match.status === 'played'
  const usF = match.score_us_extra ?? match.score_us
  const themF = match.score_them_extra ?? match.score_them
  const matchGoals = (goals || []).filter(g => g.match_id === match.id)
  const scorerCounts = {}
  matchGoals.forEach(g => {
    const name = g.players?.last_name || '?'
    scorerCounts[name] = (scorerCounts[name] || 0) + 1
  })
  const scorerDisplay = Object.entries(scorerCounts).map(([n, c]) => c > 1 ? `${n} (${c})` : n).join(', ')

  return (
    <Link to={`/mecz/${match.id}`} style={{ flex: 1, minWidth: 280 }}>
      <div className="card" style={{ padding: 28, borderLeft: `4px solid ${accent}`, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>{label}</div>
          <span className={match.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>{match.competition === 'puchar' ? 'Puchar' : 'Liga'}</span>
          <span className={match.is_home ? 'badge-home' : 'badge-away'}>{match.is_home ? 'Dom' : 'Wyjazd'}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(20px, 4vw, 28px)', letterSpacing: 2, marginBottom: 8 }}>
          PAF Płońsk <span style={{ color: accent, margin: '0 8px' }}>vs</span> {match.opponent}
        </div>
        {isPlayed && match.score_us !== null && (
          <>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, letterSpacing: 4, margin: '12px 0 4px' }}>
              <span style={{ color: usF > themF ? '#4ade80' : usF < themF ? 'var(--red-light)' : 'var(--white-dim)' }}>{match.score_us}</span>
              <span style={{ color: 'var(--white-muted)', margin: '0 8px', fontSize: 32 }}>:</span>
              <span>{match.score_them}</span>
              {match.score_us_extra !== null && match.score_us_extra !== undefined && (
                <span style={{ fontSize: 16, color: 'var(--gold)', marginLeft: 10 }}>
                  ({match.extra_type === 'penalties' ? 'k' : 'd'}: {match.score_us_extra}:{match.score_them_extra})
                </span>
              )}
            </div>
            {scorerDisplay && (
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--gold)', letterSpacing: 1, marginBottom: 4 }}>⚽ {scorerDisplay}</div>
            )}
          </>
        )}
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--white-muted)', letterSpacing: 1, marginTop: 4 }}>
          {date}{time && ` • ${time}`}
        </div>
        {!isPlayed && <Countdown match={match} />}
      </div>
    </Link>
  )
}

export default function Home() {
  const { isAdmin } = useAuth()
  const [lastMatch, setLastMatch] = useState(null)
  const [nextMatch, setNextMatch] = useState(null)
  const [recentMatches, setRecentMatches] = useState([])
  const [form, setForm] = useState([])
  const [streak, setStreak] = useState(null)
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [visits, setVisits] = useState(null)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [{ data: played }, { data: planned }, { data: goalsData }] = await Promise.all([
        supabase.from('matches').select('*').eq('status', 'played').is('season_id', null).order('match_date', { ascending: false }).limit(10),
        supabase.from('matches').select('*').eq('status', 'planned').is('season_id', null).gte('match_date', today).order('match_date', { ascending: true }).limit(1),
        supabase.from('goals').select('*, players(last_name)'),
      ])
      setLastMatch(played?.[0] || null)
      setNextMatch(planned?.[0] || null)
      setRecentMatches((played || []).slice(1, 4))
      setGoals(goalsData || [])
      const last5 = (played || []).slice(0, 5).map(m => {
        const usF = m.score_us_extra ?? m.score_us
        const themF = m.score_them_extra ?? m.score_them
        if (usF === null) return null
        return usF > themF ? 'W' : usF < themF ? 'P' : 'R'
      }).filter(Boolean)
      setForm(last5)
      let s = 0
      for (const m of (played || [])) {
        const usF = m.score_us_extra ?? m.score_us
        const themF = m.score_them_extra ?? m.score_them
        if (usF === null) break
        if (usF >= themF) s++
        else break
      }
      setStreak(s)
      setLoading(false)
      const count = await incrementVisits()
      setVisits(count)
    }
    load()
  }, [])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <img src="/logo.png" alt="PAF Płońsk" style={{ height: 110, marginBottom: 20 }} />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(32px, 8vw, 68px)', letterSpacing: 4, lineHeight: 1, marginBottom: 12 }}>
          FANPAGE PAF <span style={{ color: 'var(--gold)' }}>PŁOŃSK</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, letterSpacing: 3, color: 'var(--white-muted)', textTransform: 'uppercase' }}>
          Statystyki • Terminarz • Zawodnicy
        </p>
        <div style={{ width: 64, height: 3, background: 'var(--red)', margin: '16px auto 0' }} />
        {isAdmin && visits !== null && (
          <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--black-card)', border: '1px solid var(--black-border)', padding: '6px 16px' }}>
            <span style={{ fontSize: 14 }}>👁️</span>
            <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>Odwiedziny:</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--gold)', letterSpacing: 2 }}>{visits.toLocaleString('pl-PL')}</span>
          </div>
        )}
      </div>

      {/* Forma + seria */}
      {!loading && (form.length > 0 || streak !== null) && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28, alignItems: 'center' }}>
          {form.length > 0 && (
            <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>Forma</div>
              <div style={{ display: 'flex', gap: 4 }}>{[...form].reverse().map((r, i) => <FormBadge key={i} result={r} />)}</div>
            </div>
          )}
          {streak !== null && streak > 0 && (
            <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase' }}>Seria bez porażki</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: '#4ade80', letterSpacing: 1 }}>
                {streak} {streak === 1 ? 'mecz' : streak < 5 ? 'mecze' : 'meczów'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Główne karty */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 18, letterSpacing: 2 }}>Ładowanie...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
            <MatchCard match={lastMatch} label="Ostatni mecz" accent="var(--gold)" goals={goals} />
            <MatchCard match={nextMatch} label="Następny mecz" accent="var(--red)" goals={goals} />
          </div>

          {/* Ostatnie 3 mecze */}
          {recentMatches.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 3, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
                Poprzednie mecze
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {recentMatches.map(m => {
                  const usF = m.score_us_extra ?? m.score_us
                  const themF = m.score_them_extra ?? m.score_them
                  const win = usF > themF
                  const draw = usF === themF
                  const result = win ? 'W' : draw ? 'R' : 'P'
                  const color = win ? '#4ade80' : draw ? 'var(--gold)' : 'var(--red-light)'
                  return (
                    <Link key={m.id} to={`/mecz/${m.id}`} style={{ flex: 1, minWidth: 120, textDecoration: 'none' }}>
                      <div className="card" style={{
                        padding: '12px 14px', borderTop: `3px solid ${color}`,
                        transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 900, color, letterSpacing: 1 }}>{result}</div>
                          <div style={{ fontSize: 10, color: 'var(--white-muted)', letterSpacing: 1 }}>{m.is_home ? 'DOM' : 'WYJ'}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-dim)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.opponent}
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, color }}>{m.score_us}:{m.score_them}</div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick links */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/terminarz" className="btn-primary" style={{ padding: '12px 28px' }}>📅 Terminarz</Link>
        <Link to="/tabela" className="btn-ghost" style={{ padding: '12px 28px' }}>📊 Tabela</Link>
        <Link to="/zawodnicy" className="btn-ghost" style={{ padding: '12px 28px' }}>👥 Zawodnicy</Link>
        <Link to="/podsumowanie" className="btn-ghost" style={{ padding: '12px 28px' }}>📈 Podsumowanie</Link>
      </div>
    </div>
  )
}
