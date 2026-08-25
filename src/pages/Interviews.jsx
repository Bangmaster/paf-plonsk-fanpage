import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useTeam } from '../context/TeamContext.jsx'
import { format, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

const emptyForm = { player_name: '', player_id: null, title: '', tag: '', intro: '', qa: [{ q: '', a: '' }] }

export default function Interviews() {
  const { isAdmin } = useAuth()
  const { activeTeam, team } = useTeam()
  const [interviews, setInterviews] = useState([])
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // list | detail | form
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: iv }, { data: pl }] = await Promise.all([
      supabase.from('interviews').select('*').eq('team', activeTeam).order('created_at', { ascending: false }),
      supabase.from('players').select('id, first_name, last_name, shirt_number').eq('team', activeTeam).eq('active', true).order('last_name'),
    ])
    setInterviews(iv || [])
    setPlayers(pl || [])
    setLoading(false)
  }

  useEffect(() => { setView('list'); setSelected(null); load() }, [activeTeam])

  async function handleSave() {
    if (!form.player_name.trim() || !form.title.trim()) return
    const validQa = form.qa.filter(q => q.q.trim() && q.a.trim())
    if (validQa.length === 0) { alert('Dodaj przynajmniej jedno pytanie i odpowiedź!'); return }
    setSaving(true)
    const payload = {
      team: activeTeam,
      player_name: form.player_name.trim(),
      player_id: form.player_id || null,
      title: form.title.trim(),
      tag: form.tag.trim(),
      intro: form.intro.trim(),
      qa: validQa,
    }
    if (editId) {
      await supabase.from('interviews').update(payload).eq('id', editId)
    } else {
      await supabase.from('interviews').insert(payload)
    }
    await load()
    setForm(emptyForm); setEditId(null); setView('list')
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Usunąć ten wywiad?')) return
    await supabase.from('interviews').delete().eq('id', id)
    await load()
    setView('list'); setSelected(null)
  }

  function startEdit(interview) {
    setForm({
      player_name: interview.player_name,
      player_id: interview.player_id,
      title: interview.title,
      tag: interview.tag || '',
      intro: interview.intro || '',
      qa: interview.qa?.length > 0 ? interview.qa : [{ q: '', a: '' }],
    })
    setEditId(interview.id)
    setView('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function addQa() { setForm({ ...form, qa: [...form.qa, { q: '', a: '' }] }) }
  function removeQa(i) { const qa = form.qa.filter((_, idx) => idx !== i); setForm({ ...form, qa: qa.length > 0 ? qa : [{ q: '', a: '' }] }) }
  function updateQa(i, field, value) { const qa = [...form.qa]; qa[i][field] = value; setForm({ ...form, qa }) }

  const iStyle = { width: '100%', background: '#222', border: '1px solid var(--black-border)', color: 'var(--white)', padding: '10px 14px', fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }
  const lStyle = { fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px' }} className="fade-in">

      {/* LISTA */}
      {view === 'list' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
            <div>
              <h1 className="section-title">Wywiady</h1>
              <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2, color: team.color, textTransform: 'uppercase', marginTop: 4 }}>{team.name}</div>
              <div className="gold-line" />
            </div>
            {isAdmin && (
              <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditId(null); setView('form') }}>
                + Nowy wywiad
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
          ) : interviews.length === 0 ? (
            <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>
              Brak wywiadów dla {team.name}. {isAdmin && 'Kliknij "+ Nowy wywiad" żeby dodać pierwszy.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {interviews.map((iv, i) => {
                const date = iv.created_at ? format(parseISO(iv.created_at), 'd MMMM yyyy', { locale: pl }) : '—'
                const qaCount = iv.qa?.length || 0
                return (
                  <div key={iv.id}
                    style={{
                      background: 'var(--black-card)', border: '1px solid var(--black-border)',
                      borderLeft: `4px solid var(--gold)`,
                      padding: 24, cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap',
                      animation: `fadeIn 0.3s ease ${i * 0.07}s both`,
                    }}
                    onClick={() => { setSelected(iv); setView('detail') }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 64, height: 64, background: team.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 24, flexShrink: 0, border: '2px solid var(--gold)', color: 'var(--white)' }}>
                      {iv.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        {iv.tag && (
                          <span style={{ background: 'var(--gold)', color: 'var(--black)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 8px' }}>
                            {iv.tag}
                          </span>
                        )}
                        <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)' }}>{date}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 3, color: team.color, textTransform: 'uppercase', marginBottom: 4 }}>
                        Wywiad z {iv.player_name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 18, lineHeight: 1.4, marginBottom: 8, fontStyle: 'italic' }}>
                        {iv.title}
                      </div>
                      {iv.intro && (
                        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, color: 'var(--white-dim)', lineHeight: 1.7, marginBottom: 10 }}>
                          {iv.intro.length > 150 ? iv.intro.slice(0, 150) + '...' : iv.intro}
                        </div>
                      )}
                      <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--gold)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                        {qaCount} {qaCount === 1 ? 'pytanie' : qaCount < 5 ? 'pytania' : 'pytań'} → Czytaj całość
                      </div>
                    </div>

                    {isAdmin && (
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => startEdit(iv)}>✏️</button>
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => handleDelete(iv.id)}>🗑️</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SZCZEGÓŁY WYWIADU */}
      {view === 'detail' && selected && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
            <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}>
              ← Wszystkie wywiady
            </button>
            {isAdmin && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                <button className="btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => startEdit(selected)}>✏️ Edytuj</button>
                <button className="btn-danger" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => handleDelete(selected.id)}>🗑️ Usuń</button>
              </div>
            )}
          </div>

          {/* Header wywiadu */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              {selected.tag && (
                <span style={{ background: 'var(--gold)', color: 'var(--black)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 10px' }}>
                  {selected.tag}
                </span>
              )}
              <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', letterSpacing: 1 }}>
                {selected.created_at ? format(parseISO(selected.created_at), 'd MMMM yyyy', { locale: pl }) : ''}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 72, height: 72, background: team.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 28, border: '2px solid var(--gold)', color: 'var(--white)', flexShrink: 0 }}>
                {selected.player_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 3, color: team.color, textTransform: 'uppercase', marginBottom: 4 }}>Wywiad z</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px, 5vw, 40px)', letterSpacing: 2, lineHeight: 1 }}>{selected.player_name}</div>
              </div>
            </div>

            {/* Tytuł w cudzysłowie */}
            <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 18, marginTop: 20 }}>
              <div style={{ fontFamily: 'var(--font-condensed)', fontStyle: 'italic', fontSize: 'clamp(17px, 3vw, 24px)', color: 'var(--gold)', lineHeight: 1.5 }}>
                {selected.title}
              </div>
            </div>
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: 'linear-gradient(to right, var(--gold), transparent)', marginBottom: 28 }} />

          {/* Intro / Lead */}
          {selected.intro && (
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, color: 'var(--white-dim)', lineHeight: 1.9, marginBottom: 36, fontStyle: 'italic', padding: '16px 20px', background: '#161616', borderLeft: '3px solid var(--black-border)' }}>
              {selected.intro}
            </div>
          )}

          {/* Q&A */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(selected.qa || []).map((item, i) => (
              <div key={i} style={{ marginBottom: 32 }}>
                {/* Pytanie */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, background: 'var(--red)', color: 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                    P
                  </div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, fontWeight: 700, lineHeight: 1.6, color: 'var(--white)', paddingTop: 6 }}>
                    {item.q}
                  </div>
                </div>
                {/* Odpowiedź */}
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, background: 'var(--gold)', color: 'var(--black)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 18, flexShrink: 0, marginTop: 2 }}>
                    O
                  </div>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, color: 'var(--white-dim)', lineHeight: 1.9, paddingTop: 6 }}>
                    {item.a}
                  </div>
                </div>
                {i < (selected.qa || []).length - 1 && (
                  <div style={{ height: 1, background: 'var(--black-border)', margin: '28px 0 0' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORMULARZ */}
      {view === 'form' && (
        <div>
          <button onClick={() => { setView('list'); setEditId(null); setForm(emptyForm) }} style={{ background: 'none', border: 'none', color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', padding: 0, marginBottom: 24 }}>
            ← Anuluj
          </button>

          <h1 className="section-title">{editId ? 'Edytuj wywiad' : 'Nowy wywiad'}</h1>
          <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, letterSpacing: 2, color: team.color, textTransform: 'uppercase', marginTop: 4 }}>{team.name}</div>
          <div className="gold-line" />

          <div className="card" style={{ padding: 28, borderLeft: '4px solid var(--red)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={lStyle}>Zawodnik *</label>
                <select style={iStyle} value={form.player_id || ''} onChange={e => {
                  const pid = e.target.value
                  const player = players.find(p => p.id === pid)
                  setForm({ ...form, player_id: pid || null, player_name: player ? `${player.last_name} ${player.first_name}` : form.player_name })
                }}>
                  <option value="">Wybierz z listy lub wpisz ręcznie...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.last_name} {p.first_name}{p.shirt_number ? ` #${p.shirt_number}` : ''}</option>)}
                </select>
                <input style={{ ...iStyle, marginTop: 6 }} value={form.player_name} onChange={e => setForm({ ...form, player_name: e.target.value, player_id: null })} placeholder="lub wpisz imię i nazwisko ręcznie" />
              </div>
              <div>
                <label style={lStyle}>Etykieta</label>
                <input style={iStyle} value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} placeholder="np. Wywiad sezonu, MVP meczu..." />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lStyle}>Tytuł wywiadu *</label>
              <input style={iStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder='np. „Chcemy awansować — mamy na to siłę"' />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lStyle}>Wstęp / Lead</label>
              <textarea style={{ ...iStyle, resize: 'vertical' }} rows={3} value={form.intro} onChange={e => setForm({ ...form, intro: e.target.value })} placeholder="Krótki opis wywiadu widoczny na liście..." />
            </div>

            {/* Q&A */}
            <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 13, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase', marginBottom: 14 }}>
              Pytania i odpowiedzi
            </div>

            {form.qa.map((qa, i) => (
              <div key={i} style={{ marginBottom: 12, padding: 18, background: '#161616', border: '1px solid var(--black-border)', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--gold)', textTransform: 'uppercase' }}>
                    Pytanie {i + 1}
                  </div>
                  {form.qa.length > 1 && (
                    <button onClick={() => removeQa(i)} style={{ background: 'none', border: 'none', color: 'var(--red-light)', cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-condensed)', letterSpacing: 1 }}>
                      Usuń ✕
                    </button>
                  )}
                </div>
                <input
                  style={{ ...iStyle, marginBottom: 8 }}
                  value={qa.q}
                  onChange={e => updateQa(i, 'q', e.target.value)}
                  placeholder="Wpisz pytanie..."
                  onFocus={e => e.target.style.borderColor = 'var(--red)'}
                  onBlur={e => e.target.style.borderColor = 'var(--black-border)'}
                />
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 11, letterSpacing: 2, color: 'var(--white-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Odpowiedź</div>
                <textarea
                  style={{ ...iStyle, resize: 'vertical' }}
                  rows={4}
                  value={qa.a}
                  onChange={e => updateQa(i, 'a', e.target.value)}
                  placeholder="Wpisz odpowiedź zawodnika..."
                  onFocus={e => e.target.style.borderColor = 'var(--gold)'}
                  onBlur={e => e.target.style.borderColor = 'var(--black-border)'}
                />
              </div>
            ))}

            <button onClick={addQa} style={{ width: '100%', background: 'transparent', border: '1px dashed var(--black-border)', color: 'var(--white-muted)', padding: '10px', fontFamily: 'var(--font-condensed)', fontWeight: 700, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer', marginBottom: 24, transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--black-border)'; e.currentTarget.style.color = 'var(--white-muted)' }}
            >
              + Dodaj pytanie
            </button>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn-gold" onClick={handleSave} disabled={saving} style={{ padding: '12px 28px', fontSize: 15 }}>
                {saving ? 'Zapisuję...' : editId ? 'Zapisz zmiany' : 'Opublikuj wywiad'}
              </button>
              <button className="btn-ghost" onClick={() => { setView('list'); setEditId(null); setForm(emptyForm) }}>
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
