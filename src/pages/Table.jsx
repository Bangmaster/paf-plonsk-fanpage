import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const emptyForm = { team_name: '', played: 0, goals_for: 0, goals_against: 0, points: 0 }

export default function Table() {
  const { isAdmin } = useAuth()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)

  async function loadTeams() {
    const { data } = await supabase
      .from('league_table')
      .select('*')
      .is('season_id', null)
      .order('points', { ascending: false })
      .order('goals_for', { ascending: false })
    setTeams(data || [])
    setLoading(false)
  }

  useEffect(() => { loadTeams() }, [])

  async function handleSave() {
    if (!form.team_name.trim()) return
    setSaving(true)
    if (editId) {
      await supabase.from('league_table').update({
        team_name: form.team_name.trim(),
        played: parseInt(form.played) || 0,
        goals_for: parseInt(form.goals_for) || 0,
        goals_against: parseInt(form.goals_against) || 0,
        points: parseInt(form.points) || 0,
      }).eq('id', editId)
    } else {
      await supabase.from('league_table').insert({
        team_name: form.team_name.trim(),
        played: parseInt(form.played) || 0,
        goals_for: parseInt(form.goals_for) || 0,
        goals_against: parseInt(form.goals_against) || 0,
        points: parseInt(form.points) || 0,
        season_id: null,
      })
    }
    await loadTeams()
    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Usunąć drużynę z tabeli?')) return
    await supabase.from('league_table').delete().eq('id', id)
    await loadTeams()
  }

  function startEdit(team) {
    setForm({
      team_name: team.team_name,
      played: team.played,
      goals_for: team.goals_for,
      goals_against: team.goals_against,
      points: team.points,
    })
    setEditId(team.id)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const labelStyle = {
    fontFamily: 'var(--font-condensed)',
    fontSize: 11,
    letterSpacing: 2,
    color: 'var(--white-muted)',
    textTransform: 'uppercase',
    display: 'block',
    marginBottom: 6,
  }

  const pafIndex = teams.findIndex(t => t.team_name.toLowerCase().includes('paf'))

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 20px' }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
        <div>
          <h1 className="section-title">Tabela ligowa</h1>
          <div className="gold-line" />
        </div>
        {isAdmin && (
          <button className="btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm) }}>
            {showForm ? 'Anuluj' : '+ Dodaj drużynę'}
          </button>
        )}
      </div>

      {/* Form */}
      {isAdmin && showForm && (
        <div className="card" style={{ padding: 24, marginBottom: 28, borderLeft: '4px solid var(--red)' }}>
          <h3 style={{ fontFamily: 'var(--font-condensed)', fontSize: 16, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            {editId ? 'Edytuj drużynę' : 'Nowa drużyna'}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Nazwa drużyny *</label>
              <input className="input-field" value={form.team_name} onChange={e => setForm({ ...form, team_name: e.target.value })} placeholder="np. PAF Płońsk" />
            </div>
            <div>
              <label style={labelStyle}>Mecze</label>
              <input className="input-field" type="number" min="0" value={form.played} onChange={e => setForm({ ...form, played: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Bramki zdobyte</label>
              <input className="input-field" type="number" min="0" value={form.goals_for} onChange={e => setForm({ ...form, goals_for: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Bramki stracone</label>
              <input className="input-field" type="number" min="0" value={form.goals_against} onChange={e => setForm({ ...form, goals_against: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Punkty</label>
              <input className="input-field" type="number" min="0" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button className="btn-gold" onClick={handleSave} disabled={saving}>
              {saving ? 'Zapisuję...' : editId ? 'Zapisz zmiany' : 'Dodaj drużynę'}
            </button>
            <button className="btn-ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm) }}>Anuluj</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Ładowanie...</div>
      ) : teams.length === 0 ? (
        <div style={{ color: 'var(--white-muted)', fontFamily: 'var(--font-condensed)', letterSpacing: 2 }}>Brak drużyn w tabeli</div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isAdmin ? '44px 1fr 60px 60px 80px 60px 60px' : '44px 1fr 60px 60px 80px 60px',
            padding: '10px 16px',
            borderBottom: '2px solid var(--red)',
            gap: 4,
          }}>
            {['#', 'Drużyna', 'M', 'G+', 'G-', 'Pkt', ...(isAdmin ? [''] : [])].map((h, i) => (
              <div key={i} style={{
                fontFamily: 'var(--font-condensed)',
                fontSize: 11,
                letterSpacing: 2,
                color: 'var(--white-muted)',
                textTransform: 'uppercase',
                textAlign: i > 1 ? 'center' : 'left',
              }}>{h}</div>
            ))}
          </div>

          {teams.map((team, i) => {
            const isPAF = i === pafIndex
            const goalDiff = team.goals_for - team.goals_against
            return (
              <div
                key={team.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isAdmin ? '44px 1fr 60px 60px 80px 60px 60px' : '44px 1fr 60px 60px 80px 60px',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--black-border)',
                  background: isPAF ? '#1a0f00' : i % 2 === 0 ? 'transparent' : '#161616',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isPAF) e.currentTarget.style.background = '#1e1e1e' }}
                onMouseLeave={e => { if (!isPAF) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#161616' }}
              >
                {/* Pozycja */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 18,
                  color: i === 0 ? 'var(--gold)' : i <= 2 ? '#4ade80' : 'var(--white-muted)',
                  textAlign: 'center',
                }}>
                  {i + 1}
                </div>

                {/* Nazwa */}
                <div style={{
                  fontFamily: 'var(--font-condensed)',
                  fontSize: 16,
                  fontWeight: isPAF ? 800 : 500,
                  color: isPAF ? 'var(--gold)' : 'var(--white)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  {isPAF && <span style={{ fontSize: 12 }}>⭐</span>}
                  {team.team_name}
                </div>

                {/* Mecze */}
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, textAlign: 'center', color: 'var(--white-dim)' }}>
                  {team.played}
                </div>

                {/* G+ */}
                <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, textAlign: 'center', color: '#4ade80' }}>
                  {team.goals_for}
                </div>

                {/* G- z bilansem */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 15, color: 'var(--red-light)' }}>{team.goals_against}</span>
                  <span style={{
                    marginLeft: 6,
                    fontFamily: 'var(--font-condensed)',
                    fontSize: 12,
                    color: goalDiff > 0 ? '#4ade80' : goalDiff < 0 ? 'var(--red-light)' : 'var(--white-muted)',
                  }}>
                    ({goalDiff > 0 ? '+' : ''}{goalDiff})
                  </span>
                </div>

                {/* Punkty */}
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  textAlign: 'center',
                  color: isPAF ? 'var(--gold)' : 'var(--white)',
                }}>
                  {team.points}
                </div>

                {/* Admin actions */}
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => startEdit(team)}>✏️</button>
                    <button className="btn-danger" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => handleDelete(team.id)}>🗑️</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <LegendItem color="var(--gold)" label="Lider" />
        <LegendItem color="#4ade80" label="Strefa awansu" />
        <LegendItem color="#1a0f00" label="PAF Płońsk" border="var(--gold)" />
      </div>
      <div style={{ marginTop: 8, fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', letterSpacing: 1 }}>
        M = mecze • G+ = bramki zdobyte • G- = bramki stracone • Pkt = punkty
      </div>
    </div>
  )
}

function LegendItem({ color, label, border }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 14, height: 14, background: color, border: border ? `1px solid ${border}` : 'none' }} />
      <span style={{ fontFamily: 'var(--font-condensed)', fontSize: 12, color: 'var(--white-muted)', letterSpacing: 1 }}>{label}</span>
    </div>
  )
}
