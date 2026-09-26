import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useTeam } from '../context/TeamContext.jsx'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

function hashPin(nick, pin) {
  const str = `${nick.toLowerCase()}:${pin}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

function calcPoints(pred, match) {
  if (match.score_us === null || match.score_them === null) return null
  const usF = match.score_us_extra ?? match.score_us
  const themF = match.score_them_extra ?? match.score_them
  if (pred.score_us === match.score_us && pred.score_them === match.score_them) return 3
  const predResult = pred.score_us > pred.score_them ? 'W' : pred.score_us < pred.score_them ? 'P' : 'R'
  const matchResult = usF > themF ? 'W' : usF < themF ? 'P' : 'R'
  if (predResult === matchResult) return 1
  return 0
}

function isMatchLocked(match) {
  if (!match.match_date) return false
  const matchDateTime = new Date(`${match.match_date}T${match.match_time || '00:00'}`)
  return new Date() >= matchDateTime
}

export default function Predictions() {
  const { activeTeam, team } = useTeam()
  const [matches, setMatches] = useState([])
  const [predictions, setPredictions] = useState([])
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('typuj')
  const [nick, setNick] = useState(() => localStorage.getItem('paf_nick') || '')
  const [pin, setPin] = useState('')
  const [pinHash, setPinHash] = useState(() => localStorage.getItem('paf_pin_hash') || '')
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!(localStorage.getItem('paf_nick') && localStorage.getItem('paf_pin_hash'))
  })
  const [loginError, setLoginError] = useState('')
  const [registerMode, setRegisterMode] = useState(false)
  const [pinConfirm, setPinConfirm] = useState('')
  const [myPredictions, setMyPredictions] = useState([])
  const [saving, setSaving] = useState({})
  const [tempScores, setTempScores] = useState({})
  const [successMsg, setSuccessMsg] = useState({})
  const [now, setNow] = useState(new Date())

  // Odświeżaj czas co minutę żeby blokada była aktualna
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  async function load() {
    setLoading(true)
    const [{ data: m }, { data: p }] = await Promise.all([
      supabase.from('matches').select('*').eq('team', activeTeam).is('season_id', null).order('match_date', { ascending: true }),
      supabase.from('predictions').select('*').eq('team', activeTeam),
    ])
    setMatches(m || [])
    setPredictions(p || [])
    const matchMap = {}
    ;(m || []).forEach(match => { matchMap[match.id] = match })
    const nickPoints = {}
    ;(p || []).forEach(pred => {
      const match = matchMap[pred.match_id]
      if (!match || match.score_us === null) return
      const pts = calcPoints(pred, match)
      if (pts === null) return
      if (!nickPoints[pred.nick]) nickPoints[pred.nick] = { nick: pred.nick, points: 0, exact: 0, correct: 0, total: 0 }
      nickPoints[pred.nick].points += pts
      nickPoints[pred.nick].total++
      if (pts === 3) nickPoints[pred.nick].exact++
      if (pts === 1) nickPoints[pred.nick].correct++
    })
    setRanking(Object.values(nickPoints).sort((a, b) => b.points - a.points || b.exact - a.exact))
    setLoading(false)
  }

  useEffect(() => { load() }, [activeTeam])

  useEffect(() => {
    if (isLoggedIn && nick) {
      setMyPredictions(predictions.filter(p => p.nick.toLowerCase() === nick.toLowerCase()))
    }
  }, [predictions, isLoggedIn, nick])

  function handleLogin() {
    if (!nick.trim() || !pin.trim()) { setLoginError('Wpisz nick i PIN'); return }
    if (pin.length < 4) { setLoginError('PIN musi mieć minimum 4 cyfry'); return }
    const existingPreds = predictions.filter(p => p.nick.toLowerCase() === nick.toLowerCase())
    const inputHash = hashPin(nick.trim(), pin)
    if (existingPreds.length === 0) {
      if (!registerMode) { setRegisterMode(true); setLoginError(''); return }
      if (pin !== pinConfirm) { setLoginError('PINy się nie zgadzają'); return }
      localStorage.setItem('paf_nick', nick.trim())
      localStorage.setItem('paf_pin_hash', inputHash)
      setPinHash(inputHash)
    } else {
      const expectedHash = existingPreds[0].pin_hash
      if (inputHash !== expectedHash) { setLoginError('Błędny PIN'); return }
      localStorage.setItem('paf_nick', nick.trim())
      localStorage.setItem('paf_pin_hash', inputHash)
      setPinHash(inputHash)
    }
    setIsLoggedIn(true); setLoginError(''); setRegisterMode(false); setPin('')
  }

  function handleLogout() {
    localStorage.removeItem('paf_nick')
    localStorage.removeItem('paf_pin_hash')
    setIsLoggedIn(false); setNick(''); setPin(''); setPinHash(''); setRegisterMode(false); setMyPredictions([])
  }

  async function submitPrediction(match) {
    if (isMatchLocked(match)) return
    const temp = tempScores[match.id]
    if (!temp || temp.us === '' || temp.them === '') return
    const us = parseInt(temp.us); const them = parseInt(temp.them)
    if (isNaN(us) || isNaN(them) || us < 0 || them < 0) return
    setSaving(prev => ({ ...prev, [match.id]: true }))
    const storedHash = pinHash || localStorage.getItem('paf_pin_hash')
    const existing = myPredictions.find(p => p.match_id === match.id)
    if (existing) {
      await supabase.from('predictions').update({ score_us: us, score_them: them }).eq('id', existing.id)
    } else {
      await supabase.from('predictions').insert({
        match_id: match.id, nick: nick.trim(), pin_hash: storedHash,
        score_us: us, score_them: them, team: activeTeam,
      })
    }
    await load()
    setSuccessMsg(prev => ({ ...prev, [match.id]: true }))
    setTimeout(() => setSuccessMsg(prev => ({ ...prev, [match.id]: false })), 2000)
    setSaving(prev => ({ ...prev, [match.id]: false }))
  }

  const upcomingMatches = matches.filter(m => m.status === 'planned')
  const playedMatches = matches.filter(m => m.status === 'played')
  const iStyle = { background: '#222', border: '1px solid var(--black-border)', color: 'var(--white)', padding: '10px 14px', fontSize: 15, outline: 'none', fontFamily: 'var(--font-body)', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' }
  const tabStyle = (t) => ({ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 18px', border: 'none', cursor: 'pointer', background: tab === t ? team.color : 'var(--black-card)', color: tab === t ? 'var(--white)' : 'var(--white-muted)', transition: 'all 0.2s' })

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <div style={{ marginBottom: 8 }}>
        <h1 className="section-title">Typowanie</h1>
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2, color: team.color, textTransform: 'uppercase', marginTop: 4 }}>{team.name}</div>
        <div className="gold-line" />
      </div>

      {!isLoggedIn ? (
        <div className="card" style={{ padding: 28, maxWidth: 420, marginBottom: 32, borderLeft: `4px solid ${team.color}` }}>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            {registerMode ? '📝 Nowy nick — ustaw PIN' : '🎯 Zaloguj się żeby typować'}
          </div>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', marginBottom: 20 }}>
            {registerMode ? `Nick "${nick}" jest nowy — ustaw PIN żeby go zabezpieczyć` : 'Wpisz nick i PIN. Zostaniesz zapamiętany na tym urządzeniu.'}
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Nick</div>
            <input style={iStyle} value={nick} onChange={e => { setNick(e.target.value); setRegisterMode(false); setLoginError('') }}
              placeholder="Twój nick" disabled={registerMode}
              onFocus={e => e.target.style.borderColor = team.color}
              onBlur={e => e.target.style.borderColor = 'var(--black-border)'} />
          </div>
          <div style={{ marginBottom: registerMode ? 12 : 20 }}>
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 6 }}>PIN (min. 4 cyfry)</div>
            <input style={iStyle} type="password" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="••••" maxLength={8} onKeyDown={e => e.key === 'Enter' && handleLogin()}
              onFocus={e => e.target.style.borderColor = team.color}
              onBlur={e => e.target.style.borderColor = 'var(--black-border)'} />
          </div>
          {registerMode && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Potwierdź PIN</div>
              <input style={iStyle} type="password" value={pinConfirm} onChange={e => setPinConfirm(e.target.value)}
                placeholder="••••" maxLength={8} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                onFocus={e => e.target.style.borderColor = team.color}
                onBlur={e => e.target.style.borderColor = 'var(--black-border)'} />
            </div>
          )}
          {loginError && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--red-light)', marginBottom: 16 }}>⚠️ {loginError}</div>}
          <button onClick={handleLogin} style={{ background: team.color, color: 'var(--white)', border: 'none', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 14, letterSpacing: 1, textTransform: 'uppercase', padding: '12px 24px', cursor: 'pointer', width: '100%' }}>
            {registerMode ? 'Zarejestruj i typuj!' : 'Wejdź i typuj!'}
          </button>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', marginTop: 12, textAlign: 'center' }}>
            Ranking i historia widoczne dla wszystkich bez logowania
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '10px 16px', background: '#0f2a0f', border: '1px solid #4ade80', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 20 }}>👤</span>
          <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, fontWeight: 700, color: '#4ade80' }}>{nick}</span>
          <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)' }}>
            {myPredictions.length} {myPredictions.length === 1 ? 'typ' : myPredictions.length < 5 ? 'typy' : 'typów'} • {ranking.find(r => r.nick.toLowerCase() === nick.toLowerCase())?.points || 0} pkt
          </span>
          <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-condensed)', fontSize: 11, color: 'var(--white-muted)', letterSpacing: 1 }}>✓ Zapamiętany na tym urządzeniu</div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid #333', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 12, padding: '4px 10px', cursor: 'pointer' }}>Wyloguj</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        <button style={tabStyle('typuj')} onClick={() => setTab('typuj')}>🎯 Typuj</button>
        <button style={tabStyle('ranking')} onClick={() => setTab('ranking')}>🏆 Ranking</button>
        <button style={tabStyle('historia')} onClick={() => setTab('historia')}>📋 Historia</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : (
        <>
          {tab === 'typuj' && (
            <div>
              {upcomingMatches.length === 0 ? (
                <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak nadchodzących meczów do typowania.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {upcomingMatches.map((match, i) => {
                    const date = match.match_date ? format(parseISO(match.match_date), 'd MMMM yyyy', { locale: pl }) : '—'
                    const time = match.match_time ? match.match_time.slice(0, 5) : ''
                    const myPred = myPredictions.find(p => p.match_id === match.id)
                    const temp = tempScores[match.id] || { us: myPred?.score_us ?? '', them: myPred?.score_them ?? '' }
                    const allPreds = predictions.filter(p => p.match_id === match.id)
                    const locked = isMatchLocked(match)

                    return (
                      <div key={match.id} className="card" style={{ padding: 20, borderLeft: `4px solid ${locked ? '#444' : i === 0 ? team.color : 'var(--black-border)'}`, opacity: locked ? 0.85 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                          <div>
                            {i === 0 && !locked && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: 2, color: team.color, textTransform: 'uppercase', marginBottom: 4 }}>Następny mecz</div>}
                            {locked && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 10, letterSpacing: 2, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>🔒 Typowanie zakończone</div>}
                            <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 16 }}>{team.name} vs {match.opponent}</div>
                            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', marginTop: 2 }}>{date}{time && ` • ${time}`}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span className={match.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>{match.competition === 'puchar' ? 'Puchar' : 'Liga'}</span>
                            <span className={match.is_home ? 'badge-home' : 'badge-away'}>{match.is_home ? 'Dom' : 'Wyjazd'}</span>
                          </div>
                        </div>

                        {locked ? (
                          <div>
                            {myPred ? (
                              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: '#4ade80' }}>
                                ✓ Twój typ: <strong style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{myPred.score_us}:{myPred.score_them}</strong>
                                <span style={{ marginLeft: 10, color: 'var(--white-muted)', fontSize: 12 }}>Czekamy na wynik meczu...</span>
                              </div>
                            ) : (
                              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: '#666' }}>
                                🔒 Nie wytypowałeś tego meczu
                              </div>
                            )}
                          </div>
                        ) : isLoggedIn ? (
                          <div>
                            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                              {myPred ? 'Twój typ (możesz zmienić):' : 'Wpisz swój typ:'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="number" min="0" max="20" value={temp.us}
                                  onChange={e => setTempScores(prev => ({ ...prev, [match.id]: { ...temp, us: e.target.value } }))}
                                  style={{ width: 60, background: '#222', border: `1px solid ${team.color}`, color: 'var(--white)', padding: '8px', fontSize: 22, textAlign: 'center', fontFamily: 'var(--font-display)', outline: 'none' }} />
                                <span style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--white-muted)' }}>:</span>
                                <input type="number" min="0" max="20" value={temp.them}
                                  onChange={e => setTempScores(prev => ({ ...prev, [match.id]: { ...temp, them: e.target.value } }))}
                                  style={{ width: 60, background: '#222', border: `1px solid ${team.color}`, color: 'var(--white)', padding: '8px', fontSize: 22, textAlign: 'center', fontFamily: 'var(--font-display)', outline: 'none' }} />
                              </div>
                              <button onClick={() => submitPrediction(match)} disabled={saving[match.id]}
                                style={{ background: successMsg[match.id] ? '#166534' : team.color, border: 'none', color: 'var(--white)', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', padding: '10px 20px', cursor: 'pointer', transition: 'all 0.2s' }}>
                                {saving[match.id] ? '...' : successMsg[match.id] ? '✓ Zapisano!' : myPred ? 'Zmień typ' : 'Typuj!'}
                              </button>
                            </div>
                            {myPred && (
                              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: '#4ade80', marginTop: 8 }}>
                                ✓ Aktualny typ: <strong>{myPred.score_us}:{myPred.score_them}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)', fontStyle: 'italic' }}>
                            Zaloguj się powyżej żeby wytypować wynik
                          </div>
                        )}

                        <div style={{ marginTop: 12, fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)' }}>
                          {allPreds.length} {allPreds.length === 1 ? 'kibic wytypował' : 'kibiców wytypowało'}
                          {!locked && match.match_time && (
                            <span style={{ marginLeft: 8, color: '#555' }}>• Typowanie do {time}</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'ranking' && (
            <div>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 16 }}>
                Punktacja: dokładny wynik = 3 pkt • dobry wynik (W/R/P) = 1 pkt
              </div>
              {ranking.length === 0 ? (
                <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak typowań — bądź pierwszy!</div>
              ) : (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 70px 70px 70px 70px', padding: '10px 16px', borderBottom: `2px solid ${team.color}`, background: '#161616' }}>
                    {['#', 'Nick', 'Pkt', 'Dokł.', 'Trafione', 'Typy'].map((h, i) => (
                      <div key={i} style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 1, color: 'var(--white-muted)', textTransform: 'uppercase', textAlign: i > 1 ? 'center' : 'left' }}>{h}</div>
                    ))}
                  </div>
                  {ranking.map((r, i) => {
                    const isMe = isLoggedIn && r.nick.toLowerCase() === nick.toLowerCase()
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                    return (
                      <div key={r.nick} style={{ display: 'grid', gridTemplateColumns: '44px 1fr 70px 70px 70px 70px', padding: '12px 16px', borderBottom: '1px solid var(--black-border)', background: isMe ? '#1a0f00' : i % 2 === 0 ? 'transparent' : '#141414', alignItems: 'center' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: i === 0 ? 'var(--gold)' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : 'var(--white-muted)', textAlign: 'center' }}>{medal || i + 1}</div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, fontWeight: isMe ? 700 : 500, color: isMe ? 'var(--gold)' : 'var(--white)' }}>{r.nick}{isMe && ' (Ty)'}</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: i === 0 ? 24 : 20, color: i === 0 ? 'var(--gold)' : 'var(--white)', textAlign: 'center' }}>{r.points}</div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: '#4ade80', textAlign: 'center' }}>{r.exact}</div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--white-dim)', textAlign: 'center' }}>{r.correct}</div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, color: 'var(--white-muted)', textAlign: 'center' }}>{r.total}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'historia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {playedMatches.length === 0 ? (
                <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)' }}>Brak rozegranych meczów.</div>
              ) : [...playedMatches].reverse().map(match => {
                const date = match.match_date ? format(parseISO(match.match_date), 'd MMM yyyy', { locale: pl }) : '—'
                const usF = match.score_us_extra ?? match.score_us
                const themF = match.score_them_extra ?? match.score_them
                const result = usF > themF ? 'W' : usF < themF ? 'P' : 'R'
                const rc = result === 'W' ? '#4ade80' : result === 'P' ? 'var(--red-light)' : 'var(--gold)'
                const matchPreds = predictions.filter(p => p.match_id === match.id)
                const myPred = isLoggedIn ? matchPreds.find(p => p.nick.toLowerCase() === nick.toLowerCase()) : null
                const myPts = myPred ? calcPoints(myPred, match) : null
                return (
                  <div key={match.id} className="card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 15 }}>{team.name} vs {match.opponent}</div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)' }}>{date}</div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: rc }}>{match.score_us}:{match.score_them}</div>
                    </div>
                    {myPred && (
                      <div style={{ padding: '8px 14px', background: myPts === 3 ? '#0f2a0f' : myPts === 1 ? '#1a1200' : '#1a0a0a', border: `1px solid ${myPts === 3 ? '#4ade80' : myPts === 1 ? 'var(--gold)' : '#333'}`, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)' }}>Twój typ:</span>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>{myPred.score_us}:{myPred.score_them}</span>
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: 20, color: myPts === 3 ? '#4ade80' : myPts === 1 ? 'var(--gold)' : 'var(--red-light)' }}>
                          {myPts === 3 ? '+3 🎯' : myPts === 1 ? '+1 ✓' : '0'}
                        </span>
                      </div>
                    )}
                    {matchPreds.length > 0 ? (
                      <div>
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                          Typy kibiców ({matchPreds.length})
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {matchPreds.map(pred => {
                            const pts = calcPoints(pred, match)
                            return (
                              <div key={pred.id} style={{ padding: '4px 10px', background: pts === 3 ? '#0f2a0f' : pts === 1 ? '#1a1200' : '#161616', border: `1px solid ${pts === 3 ? '#4ade80' : pts === 1 ? 'var(--gold)' : 'var(--black-border)'}`, display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)' }}>{pred.nick}</span>
                                <span style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{pred.score_us}:{pred.score_them}</span>
                                <span style={{ fontSize: 11, color: pts === 3 ? '#4ade80' : pts === 1 ? 'var(--gold)' : 'var(--white-muted)' }}>{pts === 3 ? '🎯' : pts === 1 ? '✓' : '✗'}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)' }}>Brak typowań na ten mecz</div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
