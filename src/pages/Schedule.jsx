import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

const emptyForm = {
  match_date: '',
  match_time: '',
  opponent: '',
  is_home: true,
  competition: 'liga',
  status: 'planned',
}

export default function Schedule() {
  const { isAdmin } = useAuth()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  async function loadMatches() {
    const { data } = await supabase.from('matches').select('*').order('match_date', { ascending: true })
    setMatches(data || [])
    setLoading(false)
  }

  useEffect(() => { loadMatches() }, [])

  async function handleSave() {
    if (!form.match_date || !form.opponent) return
    setSaving(true)
    if (editId) {
      await supabase.from('matches').update(form).eq('id', editId)
    } else {
      await supabase.from('matches').insert(form)
    }
    await loadMatches()
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Usunąć ten mecz?')) return
    await supabase.from('matches').delete().eq('id', id)
    await loadMatches()
  }

  function startEdit(match) {
    setForm({
      match_date: match.match_date,
      match_time: match.match_time || '',
      opponent: match.opponent,
      is_home: match.is_home,
      competition: match.competition,
      status: match.status,
    })
    setEditId(match.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = filter === 'all' ? matches : matches.filter(m => m.competition === filter)

  const labelStyle = {
    fontFamily: 'var(--font-condensed)',
    fontSize: 12,
    letterSpacing: 2,
    color: 'var(--white-muted)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 6,
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 className="section-title">Terminarz</h1>
          <div className="gold-line" />
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm) }}>
            {showForm ? 'Anuluj' : '+ Dodaj mecz'}
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {isAdmin && showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 32, borderLeft: '4px solid var(--red)' }}>
          <h3 style={{ fontFamily: 'var(--font-condensed)', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>
            {editId ? 'Edytuj mecz' : 'Nowy mecz'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={labelStyle}>Rywal *</label>
              <input className="input-field" value={form.opponent} onChange={e => setForm({ ...form, opponent: e.target.value })} placeholder="Nazwa drużyny" />
            </div>
            <div>
              <label style={labelStyle}>Data *</label>
              <input className="input-field" type="date" value={form.match_date} onChange={e => setForm({ ...form, match_date: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Godzina</label>
              <input className="input-field" type="time" value={form.match_time} onChange={e => setForm({ ...form, match_time: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Lokalizacja</label>
              <select className="input-field" value={form.is_home ? 'home' : 'away'} onChange={e => setForm({ ...form, is_home: e.target.value === 'home' })}>
                <option value="home">Dom</option>
                <option value="away">Wyjazd</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Rozgrywki</label>
              <select className="input-field" value={form.competition} onChange={e => setForm({ ...form, competition: e.target.value })}>
                <option value="liga">Liga</option>
                <option value="puchar">Puchar Polski</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="planned">Zaplanowany</option>
                <option value="played">Rozegrany</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisuję...' : editId ? 'Zapisz zmiany' : 'Dodaj mecz'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['all', 'Wszystkie'], ['liga', 'Liga'], ['puchar', 'Puchar']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            style={{
              fontFamily: 'var(--font-condensed)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '6px 16px',
              border: 'none',
              cursor: 'pointer',
              background: filter === val ? 'var(--red)' : 'var(--black-card)',
              color: filter === val ? 'var(--white)' : 'var(--white-muted)',
              transition: 'all 0.2s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Matches list */}
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

            return (
              <div
                key={match.id}
                className="card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  flexWrap: 'wrap',
                  borderLeft: isPlayed ? '3px solid var(--black-border)' : '3px solid var(--red)',
                  animation: `fadeIn 0.3s ease ${i * 0.05}s both`,
                }}
              >
                {/* Round number */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  color: 'var(--white-muted)',
                  minWidth: 32,
                  textAlign: 'center',
                }}>
                  {i + 1}
                </div>

                {/* Date */}
                <div style={{ minWidth: 110 }}>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, fontWeight: 600 }}>{date}</div>
                  {time && <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-muted)' }}>{time}</div>}
                </div>

                {/* Badges */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className={match.competition === 'puchar' ? 'badge-puchar' : 'badge-liga'}>
                    {match.competition === 'puchar' ? 'Puchar' : 'Liga'}
                  </span>
                  <span className={match.is_home ? 'badge-home' : 'badge-away'}>
                    {match.is_home ? 'Dom' : 'Wyjazd'}
                  </span>
                </div>

                {/* Teams */}
                <div style={{ flex: 1, fontFamily: 'var(--font-condensed)', fontSize: 17, fontWeight: 700 }}>
                  PAF Płońsk <span style={{ color: 'var(--white-muted)', fontWeight: 400 }}>vs</span> {match.opponent}
                </div>

                {/* Score */}
                {isPlayed && match.score_us !== null && (
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 26,
                    letterSpacing: 2,
                    color: match.score_us > match.score_them ? '#4ade80' : match.score_us < match.score_them ? 'var(--red-light)' : 'var(--white-dim)',
                  }}>
                    {match.score_us}:{match.score_them}
                  </div>
                )}

                {!isPlayed && (
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2, color: 'var(--red)', textTransform: 'uppercase' }}>
                    Zaplanowany
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <Link
                    to={`/mecz/${match.id}`}
                    style={{
                      fontFamily: 'var(--font-condensed)',
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      padding: '6px 14px',
                      background: 'var(--black-soft)',
                      border: '1px solid var(--black-border)',
                      color: 'var(--white-dim)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--white-muted)'; e.currentTarget.style.color = 'var(--white)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--black-border)'; e.currentTarget.style.color = 'var(--white-dim)' }}
                  >
                    Szczegóły
                  </Link>
                  {isAdmin && (
                    <>
                      <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => startEdit(match)}>✏️</button>
                      <button className="btn-danger" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => handleDelete(match.id)}>🗑️</button>
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
