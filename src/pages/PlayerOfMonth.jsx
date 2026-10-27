import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTeam } from '../context/TeamContext';
import { useAuth } from '../context/AuthContext';

export default function PlayerOfMonth() {
  const { activeTeam, teamColor } = useTeam();
  const { isAdmin } = useAuth();

  const [polls, setPolls] = useState([]);
  const [activePoll, setActivePoll] = useState(null);
  const [votes, setVotes] = useState({}); // pollId -> { playerName: count }
  const [loading, setLoading] = useState(true);
  const [votedToday, setVotedToday] = useState(false);
  const [myVote, setMyVote] = useState(null); // player name voted this poll

  // Admin form
  const [showForm, setShowForm] = useState(false);
  const [monthLabel, setMonthLabel] = useState('');
  const [playersInput, setPlayersInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedArchive, setSelectedArchive] = useState(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    loadPolls();
  }, [activeTeam]);

  async function loadPolls() {
    setLoading(true);
    const { data } = await supabase
      .from('player_of_month_polls')
      .select('*')
      .eq('team', activeTeam)
      .order('created_at', { ascending: false });
    if (data) {
      setPolls(data);
      const open = data.find(p => p.is_open);
      setActivePoll(open || null);

      // Load votes for all closed polls + active (for admin)
      const ids = data.map(p => p.id);
      if (ids.length > 0) {
        const { data: vData } = await supabase
          .from('player_of_month_votes')
          .select('poll_id, player_name')
          .in('poll_id', ids);
        if (vData) {
          const map = {};
          vData.forEach(v => {
            if (!map[v.poll_id]) map[v.poll_id] = {};
            map[v.poll_id][v.player_name] = (map[v.poll_id][v.player_name] || 0) + 1;
          });
          setVotes(map);
        }
      }

      // Check localStorage for today's vote on open poll
      if (open) {
        const stored = localStorage.getItem(`pom_vote_${open.id}`);
        if (stored) {
          const { date, player } = JSON.parse(stored);
          if (date === today) {
            setVotedToday(true);
            setMyVote(player);
          } else {
            setVotedToday(false);
            setMyVote(null);
          }
        } else {
          setVotedToday(false);
          setMyVote(null);
        }
      }
    }
    setLoading(false);
  }

  async function castVote(playerName) {
    if (!activePoll || votedToday) return;
    const { error } = await supabase
      .from('player_of_month_votes')
      .insert({ poll_id: activePoll.id, player_name: playerName });
    if (!error) {
      localStorage.setItem(`pom_vote_${activePoll.id}`, JSON.stringify({ date: today, player: playerName }));
      setVotedToday(true);
      setMyVote(playerName);
      // Update local count
      setVotes(prev => {
        const pollVotes = { ...(prev[activePoll.id] || {}) };
        pollVotes[playerName] = (pollVotes[playerName] || 0) + 1;
        return { ...prev, [activePoll.id]: pollVotes };
      });
    }
  }

  async function closePoll(pollId) {
    if (!window.confirm('Zamknąć głosowanie? Wyniki staną się widoczne dla kibiców.')) return;
    await supabase
      .from('player_of_month_polls')
      .update({ is_open: false, closed_at: new Date().toISOString() })
      .eq('id', pollId);
    loadPolls();
  }

  async function deletePoll(pollId) {
    if (!window.confirm('Usunąć głosowanie?')) return;
    await supabase.from('player_of_month_polls').delete().eq('id', pollId);
    loadPolls();
  }

  async function createPoll() {
    if (!monthLabel.trim() || !playersInput.trim()) return;
    const players = playersInput.split('\n').map(s => s.trim()).filter(Boolean);
    if (players.length < 2) { alert('Podaj co najmniej 2 zawodników.'); return; }
    setSaving(true);
    await supabase.from('player_of_month_polls').insert({
      team: activeTeam,
      month_label: monthLabel.trim(),
      players,
      is_open: true
    });
    setMonthLabel('');
    setPlayersInput('');
    setShowForm(false);
    setSaving(false);
    loadPolls();
  }

  function getWinner(pollId, players) {
    const pv = votes[pollId] || {};
    let winner = null, max = 0;
    players.forEach(p => {
      if ((pv[p] || 0) > max) { max = pv[p] || 0; winner = p; }
    });
    return { winner, max };
  }

  function totalVotes(pollId) {
    const pv = votes[pollId] || {};
    return Object.values(pv).reduce((a, b) => a + b, 0);
  }

  function BarChart({ pollId, players }) {
    const pv = votes[pollId] || {};
    const total = Object.values(pv).reduce((a, b) => a + b, 0);
    const max = Math.max(...players.map(p => pv[p] || 0), 1);
    const { winner } = getWinner(pollId, players);
    return (
      <div style={{ marginTop: 16 }}>
        {players.map(p => {
          const count = pv[p] || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const barW = Math.round((count / max) * 100);
          const isWinner = p === winner && count > 0;
          return (
            <div key={p} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 14, fontWeight: isWinner ? 700 : 400 }}>
                <span>{isWinner ? '🏆 ' : ''}{p}</span>
                <span style={{ color: '#888' }}>{count} głos{count === 1 ? '' : count < 5 ? 'y' : 'ów'} ({pct}%)</span>
              </div>
              <div style={{ background: '#222', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                <div style={{
                  width: `${barW}%`,
                  height: '100%',
                  background: isWinner ? '#F1C40F' : teamColor,
                  borderRadius: 4,
                  transition: 'width 0.5s'
                }} />
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 8, fontSize: 13, color: '#888', textAlign: 'right' }}>
          Łącznie: {total} głos{total === 1 ? '' : total < 5 ? 'y' : 'ów'}
        </div>
      </div>
    );
  }

  const closedPolls = polls.filter(p => !p.is_open);
  const archivePoll = selectedArchive ? polls.find(p => p.id === selectedArchive) : null;

  if (loading) return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px', textAlign: 'center', color: '#888' }}>
      Ładowanie…
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '24px 16px' }}>
      <h2 style={{ color: teamColor, marginBottom: 24, fontSize: 22, fontWeight: 700 }}>
        ⭐ Piłkarz Miesiąca
      </h2>

      {/* Admin: nowe głosowanie */}
      {isAdmin && (
        <div style={{ marginBottom: 28 }}>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              disabled={!!activePoll}
              style={{
                background: activePoll ? '#333' : teamColor,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: activePoll ? 'not-allowed' : 'pointer',
                fontSize: 14,
                opacity: activePoll ? 0.5 : 1
              }}
            >
              + Nowe głosowanie
            </button>
          ) : (
            <div style={{ background: '#1a1a1a', border: `1px solid ${teamColor}40`, borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: teamColor, margin: '0 0 16px', fontSize: 16 }}>Nowe głosowanie</h3>
              <input
                value={monthLabel}
                onChange={e => setMonthLabel(e.target.value)}
                placeholder="Miesiąc, np. Październik 2026"
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, marginBottom: 12 }}
              />
              <textarea
                value={playersInput}
                onChange={e => setPlayersInput(e.target.value)}
                placeholder={"Zawodnicy (każdy w nowej linii):\nJan Kowalski\nPiotr Nowak\nMarcin Wiśniewski"}
                rows={5}
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', background: '#111', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 14, resize: 'vertical', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={createPoll} disabled={saving}
                  style={{ background: teamColor, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14 }}>
                  {saving ? 'Tworzę…' : 'Utwórz głosowanie'}
                </button>
                <button onClick={() => setShowForm(false)}
                  style={{ background: '#333', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 14 }}>
                  Anuluj
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Aktywne głosowanie */}
      {activePoll ? (
        <div style={{ background: '#1a1a1a', border: `2px solid ${teamColor}60`, borderRadius: 14, padding: 22, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <span style={{ background: teamColor, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Głosowanie otwarte</span>
              <h3 style={{ margin: '8px 0 4px', fontSize: 18, color: '#fff' }}>{activePoll.month_label}</h3>
            </div>
            {isAdmin && (
              <button onClick={() => closePoll(activePoll.id)}
                style={{ background: '#333', color: '#F1C40F', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13 }}>
                🔒 Zamknij
              </button>
            )}
          </div>

          {votedToday ? (
            <div>
              <div style={{ background: '#1e2e1e', border: '1px solid #2ecc7160', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#2ecc71' }}>
                ✅ Twój głos na <strong>{myVote}</strong> został oddany. Dziękujemy!<br />
                <span style={{ color: '#888', fontSize: 13 }}>Możesz głosować ponownie jutro.</span>
              </div>
              {isAdmin && <BarChart pollId={activePoll.id} players={activePoll.players} />}
              {!isAdmin && (
                <p style={{ color: '#555', fontSize: 13, textAlign: 'center', marginTop: 16 }}>
                  Wyniki zostaną ujawnione po zamknięciu głosowania.
                </p>
              )}
            </div>
          ) : (
            <div>
              <p style={{ color: '#aaa', fontSize: 14, margin: '12px 0 16px' }}>
                Zagłosuj na piłkarza miesiąca — 1 głos dziennie. Raz oddanego głosu nie można zmienić.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activePoll.players.map(player => (
                  <button
                    key={player}
                    onClick={() => castVote(player)}
                    style={{
                      background: '#111',
                      border: `1px solid ${teamColor}50`,
                      borderRadius: 10,
                      padding: '13px 18px',
                      color: '#fff',
                      fontSize: 15,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s, border-color 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${teamColor}20`; e.currentTarget.style.borderColor = teamColor; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.borderColor = `${teamColor}50`; }}
                  >
                    <span style={{ fontSize: 20 }}>👤</span>
                    {player}
                  </button>
                ))}
              </div>
              {isAdmin && totalVotes(activePoll.id) > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Podgląd wyników (tylko admin):</div>
                  <BarChart pollId={activePoll.id} players={activePoll.players} />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #333', borderRadius: 12, padding: 22, marginBottom: 28, textAlign: 'center', color: '#666' }}>
          Brak aktywnego głosowania.
        </div>
      )}

      {/* Archiwum */}
      {closedPolls.length > 0 && (
        <div>
          <h3 style={{ color: '#aaa', fontSize: 16, fontWeight: 600, marginBottom: 14 }}>📁 Archiwum głosowań</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {closedPolls.map(poll => {
              const { winner, max } = getWinner(poll.id, poll.players);
              const total = totalVotes(poll.id);
              const isOpen = selectedArchive === poll.id;
              return (
                <div key={poll.id} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => setSelectedArchive(isOpen ? null : poll.id)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      padding: '14px 18px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 14
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 600 }}>{poll.month_label}</div>
                      {winner && max > 0 && (
                        <div style={{ color: '#F1C40F', fontSize: 13, marginTop: 2 }}>
                          🏆 {winner} · {total} głos{total === 1 ? '' : total < 5 ? 'y' : 'ów'}
                        </div>
                      )}
                      {(!winner || max === 0) && (
                        <div style={{ color: '#555', fontSize: 13 }}>Brak głosów</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isAdmin && (
                        <span
                          onClick={e => { e.stopPropagation(); deletePoll(poll.id); }}
                          style={{ color: '#e74c3c', fontSize: 13, padding: '4px 8px', cursor: 'pointer' }}
                        >🗑️</span>
                      )}
                      <span style={{ color: '#666', fontSize: 18 }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 18px 18px' }}>
                      <BarChart pollId={poll.id} players={poll.players} />
                      {poll.closed_at && (
                        <div style={{ color: '#555', fontSize: 12, marginTop: 8, textAlign: 'right' }}>
                          Zamknięto: {new Date(poll.closed_at).toLocaleDateString('pl-PL')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
