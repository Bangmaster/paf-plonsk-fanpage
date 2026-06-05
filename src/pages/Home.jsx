import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

function MatchCard({ match, label, accent }) {
  if (!match) return (
    <div className="card" style={{ padding: 32, flex: 1, minWidth: 280 }}>
      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2, color: accent, textTransform: 'uppercase', marginBottom: 16 }}>{label}</div>
      <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 16 }}>Brak danych</div>
    </div>
  )

  const date = match.match_date ? format(parseISO(match.match_date), 'd MMMM yyyy', { locale: pl }) : '—'
  const time = match.match_time ? match.match_time.slice(0, 5) : ''
  const isPlayed = match.status === 'played'

  return (
    <Link to={`/mecz/${match.id}`} style={{ flex: 1, minWidth: 280 }}>
      <div className="card" style={{
        padding: 28,
        borderLeft: `4px solid ${accent}`,
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.4)` }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: accent, textTransform: 'uppercase' }}>{label}</div>
          <span className={match.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>{match.competition === 'puchar' ? 'Puchar' : 'Liga'}</span>
          <span className={match.is_home ? 'badge-home' : 'badge-away'}>{match.is_home ? 'Dom' : 'Wyjazd'}</span>
        </div>

        <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, letterSpacing: 2, marginBottom: 8 }}>
          PAF Płońsk
          <span style={{ color: accent, margin: '0 12px' }}>vs</span>
          {match.opponent}
        </div>

        {isPlayed && match.score_us !== null && (
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 48,
            letterSpacing: 4,
            color: 'var(--white)',
            margin: '12px 0',
          }}>
            <span style={{ color: match.score_us > match.score_them ? '#4ade80' : match.score_us < match.score_them ? 'var(--red-light)' : 'var(--white-dim)' }}>
              {match.score_us}
            </span>
            <span style={{ color: 'var(--white-muted)', margin: '0 8px', fontSize: 32 }}>:</span>
            <span>{match.score_them}</span>
          </div>
        )}

        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--white-muted)', letterSpacing: 1 }}>
          {date}{time && ` • ${time}`}
        </div>
      </div>
    </Link>
  )
}

export default function Home() {
  const [lastMatch, setLastMatch] = useState(null)
  const [nextMatch, setNextMatch] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      const { data: played } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'played')
        .order('match_date', { ascending: false })
        .limit(1)

      const { data: planned } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'planned')
        .gte('match_date', today)
        .order('match_date', { ascending: true })
        .limit(1)

      setLastMatch(played?.[0] || null)
      setNextMatch(planned?.[0] || null)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <img src="/logo.png" alt="PAF Płońsk" style={{ height: 120, marginBottom: 24 }} />
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 8vw, 72px)',
          letterSpacing: 4,
          lineHeight: 1,
          marginBottom: 12,
        }}>
          FANPAGE PAF <span style={{ color: 'var(--gold)' }}>PŁOŃSK</span>
        </h1>
        <p style={{
          fontFamily: 'var(--font-condensed)',
          fontSize: 16,
          letterSpacing: 3,
          color: 'var(--white-muted)',
          textTransform: 'uppercase',
        }}>
          Statystyki • Terminarz • Zawodnicy
        </p>
        <div style={{ width: 64, height: 3, background: 'var(--red)', margin: '20px auto 0' }} />
      </div>

      {/* Match cards */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 18, letterSpacing: 2 }}>
          Ładowanie...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <MatchCard match={lastMatch} label="Ostatni mecz" accent="var(--gold)" />
          <MatchCard match={nextMatch} label="Następny mecz" accent="var(--red)" />
        </div>
      )}

      {/* Quick links */}
      <div style={{ marginTop: 48, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/terminarz" className="btn-primary" style={{ padding: '12px 28px' }}>
          📅 Terminarz
        </Link>
        <Link to="/zawodnicy" className="btn-ghost" style={{ padding: '12px 28px' }}>
          👥 Zawodnicy
        </Link>
        <Link to="/podsumowanie" className="btn-ghost" style={{ padding: '12px 28px' }}>
          📊 Podsumowanie sezonu
        </Link>
      </div>
    </div>
  )
}
