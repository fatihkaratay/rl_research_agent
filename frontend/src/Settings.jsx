/**
 * Feature 12: Watchlist management UI + Feature 14: Schedule status.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://127.0.0.1:8000';

function TagList({ items, onRemove, onAdd, placeholder, addLabel }) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const val = input.trim();
    if (val && !items.includes(val)) {
      onAdd(val);
      setInput('');
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {items.map(item => (
          <span key={item} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(99,102,241,0.08)', color: '#4f46e5',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 100, padding: '4px 12px',
            fontSize: 13, fontFamily: 'sans-serif',
          }}>
            {item}
            <button
              onClick={() => onRemove(item)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#6366f1', fontSize: 14, lineHeight: 1, padding: 0,
              }}
            >
              ×
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span style={{ color: '#94a3b8', fontFamily: 'sans-serif', fontSize: 13 }}>
            None added yet.
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '8px 14px', borderRadius: 10,
            border: '1px solid #e2e8f0', fontFamily: 'sans-serif', fontSize: '0.85rem',
            outline: 'none', background: '#f8fafc',
          }}
        />
        <button
          onClick={handleAdd}
          style={{
            padding: '8px 18px', borderRadius: 10, border: 'none',
            background: '#6366f1', color: '#fff', fontFamily: 'sans-serif',
            fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          {addLabel || 'Add'}
        </button>
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState({
    target_authors: [],
    research_topics: [],
    arxiv_categories: [],
  });
  const [schedule, setSchedule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [cronInput, setCronInput] = useState('');
  const [scheduleSaving, setScheduleSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings`).then(r => r.json()).then(setSettings).catch(console.error);
    fetch(`${API}/api/schedule`).then(r => r.json()).then(data => {
      setSchedule(data);
      setCronInput(data.cron || '0 8 * * *');
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      await res.json();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Save failed:', e);
    } finally {
      setSaving(false);
    }
  };

  const handleScheduleSave = async () => {
    setScheduleSaving(true);
    try {
      const res = await fetch(`${API}/api/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cron: cronInput, enabled: schedule?.enabled ?? true }),
      });
      const data = await res.json();
      setSchedule(data);
    } catch (e) {
      console.error('Schedule save failed:', e);
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleToggleSchedule = async () => {
    const newEnabled = !(schedule?.enabled ?? true);
    try {
      const res = await fetch(`${API}/api/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newEnabled }),
      });
      const data = await res.json();
      setSchedule(data);
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const mutate = (key) => ({
    onAdd: (val) => setSettings(s => ({ ...s, [key]: [...s[key], val] })),
    onRemove: (val) => setSettings(s => ({ ...s, [key]: s[key].filter(x => x !== val) })),
  });

  const cardStyle = {
    background: '#fff',
    borderRadius: 20,
    border: '1px solid rgba(203,213,225,0.8)',
    padding: '28px 32px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
    marginBottom: 20,
  };

  const sectionTitle = { margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', fontFamily: 'sans-serif' };

  return (
    <>
      <style>{`
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background: #eef1f7 !important; }
        .settings-wrapper { min-height: 100vh; background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%); padding: 40px 24px 80px; box-sizing: border-box; font-family: 'Georgia', serif; }
        .settings-inner { max-width: 680px; margin: 0 auto; }
      `}</style>

      <div className="settings-wrapper">
        <div className="settings-inner">
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6366f1', fontFamily: 'sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
            ← Back to Hub
          </Link>

          <h1 style={{ margin: '0 0 28px', fontSize: '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
            Settings
          </h1>

          {/* Author watchlist */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Watched Authors</h2>
            <TagList
              items={settings.target_authors}
              placeholder="Add author name…"
              addLabel="Add Author"
              {...mutate('target_authors')}
            />
          </div>

          {/* Research topics */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>Research Topics / Keywords</h2>
            <TagList
              items={settings.research_topics}
              placeholder="Add keyword…"
              addLabel="Add Topic"
              {...mutate('research_topics')}
            />
          </div>

          {/* ArXiv categories */}
          <div style={cardStyle}>
            <h2 style={sectionTitle}>ArXiv Categories</h2>
            <TagList
              items={settings.arxiv_categories}
              placeholder="e.g. cs.LG"
              addLabel="Add Category"
              {...mutate('arxiv_categories')}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '12px 32px', borderRadius: 100, border: 'none',
              background: saved ? '#10b981' : '#6366f1', color: '#fff',
              fontFamily: 'sans-serif', fontWeight: 700, fontSize: '0.9rem',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.3s', marginBottom: 28,
            }}
          >
            {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Settings'}
          </button>

          {/* Schedule status */}
          {schedule && (
            <div style={cardStyle}>
              <h2 style={sectionTitle}>Auto-Run Schedule</h2>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</p>
                  <span style={{
                    display: 'inline-block', fontSize: 12, fontFamily: 'monospace', fontWeight: 700,
                    padding: '3px 12px', borderRadius: 100,
                    background: schedule.enabled ? 'rgba(16,185,129,0.1)' : 'rgba(148,163,184,0.1)',
                    color: schedule.enabled ? '#10b981' : '#94a3b8',
                    border: `1px solid ${schedule.enabled ? 'rgba(16,185,129,0.3)' : 'rgba(148,163,184,0.3)'}`,
                  }}>
                    {schedule.enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                {schedule.next_run && (
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Next Run</p>
                    <p style={{ margin: 0, fontSize: 13, fontFamily: 'sans-serif', color: '#475569' }}>
                      {new Date(schedule.next_run).toLocaleString()}
                    </p>
                  </div>
                )}
                {schedule.last_run && (
                  <div>
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Last Run</p>
                    <p style={{ margin: 0, fontSize: 13, fontFamily: 'sans-serif', color: '#475569' }}>
                      {new Date(schedule.last_run).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Cron input */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <label style={{ display: 'block', fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    Cron Expression
                  </label>
                  <input
                    value={cronInput}
                    onChange={e => setCronInput(e.target.value)}
                    placeholder="0 8 * * *"
                    style={{
                      width: '100%', padding: '8px 14px', borderRadius: 10,
                      border: '1px solid #e2e8f0', fontFamily: 'monospace', fontSize: '0.85rem',
                      outline: 'none', background: '#f8fafc', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                  <button
                    onClick={handleScheduleSave}
                    disabled={scheduleSaving}
                    style={{
                      padding: '8px 18px', borderRadius: 10, border: 'none',
                      background: '#6366f1', color: '#fff', fontFamily: 'sans-serif',
                      fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {scheduleSaving ? 'Saving…' : 'Update Cron'}
                  </button>
                  <button
                    onClick={handleToggleSchedule}
                    style={{
                      padding: '8px 18px', borderRadius: 10,
                      border: `1px solid ${schedule.enabled ? '#ef4444' : '#10b981'}`,
                      background: 'transparent',
                      color: schedule.enabled ? '#ef4444' : '#10b981',
                      fontFamily: 'sans-serif', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {schedule.enabled ? 'Disable' : 'Enable'}
                  </button>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', fontFamily: 'sans-serif' }}>
                Default: <code>0 8 * * *</code> (daily at 8am UTC). Citation updates and digest run every Sunday.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
