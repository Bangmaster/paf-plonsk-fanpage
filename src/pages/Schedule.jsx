import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

const emptyForm = {
  match_date: '', match_time: '', opponent: '',
  is_home: true, competition: 'liga', status: 'planned',
}

function validate(form) {
  const errors = {}
  if (!form.opponent?.trim()) errors.opponent = 'Nazwa rywala jest wymagana'
  if (!form.match_date) errors.match_date = 'Data jest wymagana'
  return errors
}

export default function Schedule() {
  const { isAdmin } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState({})
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')
  const [quickEditId, setQuickEditId] = useState(null)
  const [quickScore, setQuickScore] = useState({ us: '', them: '' })
  const [copiedLink, setCopiedLink] = useState(null)

  async function loadMatches() {
    const { data } = await supabase
      .from('matches').select('*')
      .is('season_id', null)
      .order('match_date', { ascending: true })
    setMatches(data || [])
    setLoading(false)
  }

  useEffect(() => { loadMatches() }, [])

  async function handleSave() {
    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setSaving(true)
    if (editId) {
      await supabase.from('matches').update(form).eq('id', editId)
    } else {
      await supabase.from('matches').insert({ ...form, season_id: null })
    }
    await loadMatches()
    setForm(emptyForm); setErrors({}); setEditId(null); setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Usunąć ten mecz?')) return
    await supabase.from('matches').delete().eq('id', id)
    await loadMatches()
  }

  async function saveQuickScore(match) {
    const us = parseInt(quickScore.us)
    const them = parseInt(quickScore.them)
    if (isNaN(us) || isNaN(them) || us < 0 || them < 0) return
    await supabase.from('matches').update({
      score_us: us, score_them: them, status: 'played'
    }).eq('id', match.id)
    setQuickEditId(null)
    await loadMatches()
  }

  function copyMatchLink(matchId) {
    const url = `${window.location.origin}/mecz/${matchId}`
    navigator.clipboard.writeText(url)
    setCopiedLink(matchId)
    setTimeout(() => setCopiedLink(null), 2000)
  }

  function startEdit(match) {
    setForm({
      match_date: match.match_date, match_time: match.match_time || '',
      opponent: match.opponent, is_home: match.is_home,
      competition: match.competition, status: match.status,
    })
    setErrors({})
    setEditId(match.id); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = filter === 'all' ? matches : matches.filter(m => m.competition === filter)

  const inputStyle = (hasErr) => ({
    background: '#222', border: `1px solid ${hasErr ? 'var(--red)' : 'var(--black-border)'}`,
    color: 'var(--white)', padding: '10px 14px', fontSize: 15,
    width: '100%', outline: 'none', fontFamily: 'var(--font-body)',
    boxShadow: hasErr ? '0 0 0 2px rgba(192,57,43,0.2)' : 'none',
    transition: 'all 0.2s',
  })

  const labelStyle = {
    fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2,
    color: 'var(--white-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 className="section-title">Terminarz</h1>
          <div className="gold-line" />
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm); setErrors({}) }}>
            {showForm ? 'Anuluj' : '+ Dodaj mecz'}
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 32, borderLeft: '4px solid var(--red)' }}>
          <h3 style={{ fontFamily: 'var(--font-condensed)', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>
            {editId ? 'Edytuj mecz' : 'Nowy mecz'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>Rywal *</label>
              <input style={inputStyle(!!errors.opponent)} value={form.opponent}
                onChange={e => { setForm({ ...form, opponent: e.target.value }); setErrors({ ...errors, opponent: null }) }}
                placeholder="Nazwa drużyny" />
              {errors.opponent && <div style={{ fontSize: 12, color: 'var(--red-light)', marginTop: 4 }}>⚠️ {errors.opponent}</div>}
            </div>
            <div>
              <label style={labelStyle}>Data *</label>
              <input style={inputStyle(!!errors.match_date)} type="date" value={form.match_date}
                onChange={e => { setForm({ ...form, match_date: e.target.value }); setErrors({ ...errors, match_date: null }) }} />
              {errors.match_date && <div style={{ fontSize: 12, color: 'var(--red-light)', marginTop: 4 }}>⚠️ {errors.match_date}</div>}
            </div>
            <div>
              <label style={labelStyle}>Godzina</label>
              <input style={inputStyle(false)} type="time" value={form.match_time}
                onChange={e => setForm({ ...form, match_time: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Lokalizacja</label>
              <select style={inputStyle(false)} value={form.is_home ? 'home' : 'away'}
                onChange={e => setForm({ ...form, is_home: e.target.value === 'home' })}>
                <option value="home">Dom</option>
                <option value="away">Wyjazd</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Rozgrywki</label>
              <select style={inputStyle(false)} value={form.competition}
                onChange={e => setForm({ ...form, competition: e.target.value })}>
                <option value="liga">Liga</option>
                <option value="puchar">Puchar Polski</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle(false)} value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="planned">Zaplanowany</option>
                <option value="played">Rozegrany</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisuję...' : editId ? 'Zapisz zmiany' : 'Dodaj mecz'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); setErrors({}) }}>Anuluj</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['all', 'Wszystkie'], ['liga', 'Liga'], ['puchar', 'Puchar']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{
            fontFamily: 'var(--font-condensed)', fontSize: 13, fontWeight: 700,
            letterSpacing: 1, textTransform: 'uppercase', padding: '6px 16px',
            border: 'none', cursor: 'pointer',
            background: filter === val ? 'var(--red)' : 'var(--black-card)',
            color: filter === val ? 'var(--white)' : 'var(--white-muted)',
            transition: 'all 0.2s',
          }}>{label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Brak meczów</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((match, i) => {
            const date = match.match_date ? format(parseISO(match.match_date), 'd MMM yyyy', { locale: pl }) : '—'
            const time = match.match_time ? match.match_time.slice(0, 5) : ''
            const isPlayed = match.status === 'played'
            const usF = match.score_us_extra ?? match.score_us
            const themF = match.score_them_extra ?? match.score_them
            const win = usF > themF
            const draw = usF === themF
            // Kolor paska — główna zmiana wizualna
            const barColor = !isPlayed ? 'var(--black-border)'
              : win ? '#4ade80' : draw ? 'var(--gold)' : 'var(--red-light)'
            const isQuickEditing = quickEditId === match.id

            return (
              <div key={match.id} className="card" style={{
                padding: '16px 20px', display: 'flex', alignItems: 'center',
                gap: 12, flexWrap: 'wrap',
                borderLeft: `4px solid ${barColor}`,
                animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
                transition: 'border-color 0.3s',
              }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--white-muted)', minWidth: 28, textAlign: 'center' }}>
                  {i + 1}
                </div>
                <div style={{ minWidth: 95 }}>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 14, fontWeight: 600 }}>{date}</div>
                  {time && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)' }}>{time}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={match.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>
                    {match.competition === 'puchar' ? 'Puchar' : 'Liga'}
                  </span>
                  <span className={match.is_home ? 'badge-home' : 'badge-away'}>
                    {match.is_home ? 'Dom' : 'Wyjazd'}
                  </span>
                </div>
                <div style={{ flex: 1, fontFamily: 'var(--font-condensed)', fontSize: 16, fontWeight: 700 }}>
                  PAF Płońsk <span style={{ color: 'var(--white-muted)', fontWeight: 400 }}>vs</span> {match.opponent}
                </div>

                {/* Wynik — klikalny dla admina */}
                {isPlayed && match.score_us !== null && !isQuickEditing && (
                  <div
                    onClick={() => isAdmin ? (setQuickEditId(match.id), setQuickScore({ us: match.score_us, them: match.score_them })) : null}
                    style={{
                      fontFamily: 'var(--font-display)', fontSize: 24, letterSpacing: 2,
                      color: win ? '#4ade80' : draw ? 'var(--gold)' : 'var(--red-light)',
                      cursor: isAdmin ? 'pointer' : 'default',
                      padding: isAdmin ? '2px 8px' : '0',
                      border: isAdmin ? '1px solid transparent' : 'none',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (isAdmin) { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = '#1a1200' }}}
                    onMouseLeave={e => { if (isAdmin) { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}}
                    title={isAdmin ? 'Kliknij żeby edytować wynik' : ''}
                  >
                    {match.score_us}:{match.score_them}
                    {match.score_us_extra !== null && match.score_us_extra !== undefined && (
                      <span style={{ fontSize: 13, color: 'var(--gold)', marginLeft: 6 }}>
                        ({match.extra_type === 'penalties' ? 'k' : 'd'}: {match.score_us_extra}:{match.score_them_extra})
                      </span>
                    )}
                    {isAdmin && <span style={{ fontSize: 12, marginLeft: 6, opacity: 0.5 }}>✏️</span>}
                  </div>
                )}

                {/* Quick edit wynik */}
                {isPlayed && isQuickEditing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input type="number" min="0" value={quickScore.us}
                      onChange={e => setQuickScore({ ...quickScore, us: e.target.value })}
                      style={{ width: 52, background: '#222', border: `1px solid var(--gold)`, color: 'var(--white)', padding: '4px', fontSize: 20, textAlign: 'center', fontFamily: 'var(--font-display)', outline: 'none' }} />
                    <span style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-display)', fontSize: 20 }}>:</span>
                    <input type="number" min="0" value={quickScore.them}
                      onChange={e => setQuickScore({ ...quickScore, them: e.target.value })}
                      style={{ width: 52, background: '#222', border: `1px solid var(--gold)`, color: 'var(--white)', padding: '4px', fontSize: 20, textAlign: 'center', fontFamily: 'var(--font-display)', outline: 'none' }} />
                    <button className="btn-gold" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => saveQuickScore(match)}>✓</button>
                    <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setQuickEditId(null)}>✕</button>
                  </div>
                )}

                {!isPlayed && (
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--red)', textTransform: 'uppercase' }}>
                    Zaplanowany
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6 }}>
                  {/* Udostępnij */}
                  <button
                    onClick={() => copyMatchLink(match.id)}
                    title="Kopiuj link do meczu"
                    style={{
                      fontFamily: 'var(--font-condensed)', fontSize: 12, fontWeight: 700,
                      letterSpacing: 1, padding: '6px 10px',
                      background: copiedLink === match.id ? '#0f2a0f' : 'var(--black-soft)',
                      border: `1px solid ${copiedLink === match.id ? '#4ade80' : 'var(--black-border)'}`,
                      color: copiedLink === match.id ? '#4ade80' : 'var(--white-muted)',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {copiedLink === match.id ? '✓' : '🔗'}
                  </button>
                  <Link to={`/mecz/${match.id}`} style={{
                    fontFamily: 'var(--font-condensed)', fontSize: 13, fontWeight: 700,
                    letterSpacing: 1, textTransform: 'uppercase', padding: '6px 12px',
                    background: 'var(--black-soft)', border: '1px solid var(--black-border)',
                    color: 'var(--white-dim)', transition: 'all 0.2s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--white-muted)'; e.currentTarget.style.color = 'var(--white)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--black-border)'; e.currentTarget.style.color = 'var(--white-dim)' }}
                  >
                    Szczegóły
                  </Link>
                  {isAdmin && (
                    <>
                      <button className="btn-ghost" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => startEdit(match)}>✏️</button>
                      <button className="btn-danger" style={{ padding: '6px 10px', fontSize: 13 }} onClick={() => handleDelete(match.id)}>🗑️</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
