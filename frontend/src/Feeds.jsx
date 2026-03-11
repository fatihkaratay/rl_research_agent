/**
 * Feature 13: Multiple topic feeds management.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = 'http://127.0.0.1:8000';

const PRESET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899',
  '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316',
];

function FeedCard({ feed, onDelete, onRun }) {
  const [running, setRunning] = useState(false);

  const handleRun = async () => {
    if (!feed.feed_id) return;
    setRunning(true);
    try {
      await onRun(feed.feed_id);
    } finally {
      setTimeout(() => setRunning(false), 3000);
    }
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      border: `1px solid ${feed.color || '#6366f1'}40`,
      padding: '22px 26px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      display: 'flex',
      gap: 16,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: `linear-gradient(135deg, ${feed.color || '#6366f1'}, ${feed.color || '#6366f1'}aa)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontSize: 20,
      }}>
        📡
      </div>
      <div style={{ flex: 1 }}>
        <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', fontFamily: 'sans-serif' }}>
          {feed.name}
        </h3>
        {feed.keywords?.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {feed.keywords.map(kw => (
              <span key={kw} style={{
                fontSize: 11, fontFamily: 'monospace', padding: '2px 8px',
                borderRadius: 8, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0',
              }}>
                {kw}
              </span>
            ))}
          </div>
        )}
        {feed.arxiv_categories?.length > 0 && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#94a3b8', fontFamily: 'sans-serif' }}>
            ArXiv: {feed.arxiv_categories.join(', ')}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleRun}
            disabled={running}
            style={{
              padding: '6px 14px', borderRadius: 100, border: 'none',
              background: feed.color || '#6366f1', color: '#fff',
              fontFamily: 'sans-serif', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              opacity: running ? 0.7 : 1,
            }}
          >
            {running ? 'Running…' : '▶ Run Agent'}
          </button>
          <button
            onClick={() => onDelete(feed.feed_id)}
            style={{
              padding: '6px 14px', borderRadius: 100,
              border: '1px solid rgba(239,68,68,0.3)',
              background: 'transparent', color: '#ef4444',
              fontFamily: 'sans-serif', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Feeds() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', keywords: '', arxiv_categories: '', color: '#6366f1' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/feeds`)
      .then(r => r.json())
      .then(data => { setFeeds(data.feeds || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const body = {
        name: form.name.trim(),
        keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean),
        arxiv_categories: form.arxiv_categories.split(',').map(s => s.trim()).filter(Boolean),
        color: form.color,
      };
      const res = await fetch(`${API}/api/feeds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const newFeed = await res.json();
      setFeeds(prev => [...prev, newFeed]);
      setForm({ name: '', keywords: '', arxiv_categories: '', color: '#6366f1' });
      setShowForm(false);
    } catch (e) {
      console.error('Create feed failed:', e);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (feedId) => {
    try {
      await fetch(`${API}/api/feeds/${feedId}`, { method: 'DELETE' });
      setFeeds(prev => prev.filter(f => f.feed_id !== feedId));
    } catch (e) {
      console.error('Delete failed:', e);
    }
  };

  const handleRun = async (feedId) => {
    await fetch(`${API}/api/research/run/custom/${feedId}`, { method: 'POST' });
  };

  const inputStyle = {
    width: '100%', padding: '8px 14px', borderRadius: 10,
    border: '1px solid #e2e8f0', fontFamily: 'sans-serif', fontSize: '0.85rem',
    outline: 'none', background: '#f8fafc', boxSizing: 'border-box', marginBottom: 12,
  };

  return (
    <>
      <style>{`
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background: #eef1f7 !important; }
        .feeds-wrapper { min-height: 100vh; background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%); padding: 40px 24px 80px; box-sizing: border-box; font-family: 'Georgia', serif; }
        .feeds-inner { max-width: 780px; margin: 0 auto; }
      `}</style>

      <div className="feeds-wrapper">
        <div className="feeds-inner">
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6366f1', fontFamily: 'sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
            ← Back to Hub
          </Link>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <div>
              <h1 style={{ margin: '0 0 4px', fontSize: '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>Custom Feeds</h1>
              <p style={{ margin: 0, color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>Create and manage topic-specific research feeds.</p>
            </div>
            <button
              onClick={() => setShowForm(s => !s)}
              style={{
                padding: '10px 22px', borderRadius: 100, border: 'none',
                background: '#6366f1', color: '#fff', fontFamily: 'sans-serif',
                fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {showForm ? 'Cancel' : '+ Create Feed'}
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(203,213,225,0.8)', padding: '28px 32px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, color: '#1e293b', fontFamily: 'sans-serif' }}>New Feed</h2>
              <input style={inputStyle} placeholder="Feed name (e.g. MARL Papers)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <input style={inputStyle} placeholder="Keywords, comma-separated (e.g. multi-agent, MARL, cooperative)" value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
              <input style={inputStyle} placeholder="ArXiv categories, comma-separated (e.g. cs.LG, cs.MA)" value={form.arxiv_categories} onChange={e => setForm(f => ({ ...f, arxiv_categories: e.target.value }))} />
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b', fontFamily: 'sans-serif' }}>Accent color:</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', border: form.color === c ? '2px solid #1e293b' : '2px solid transparent',
                        background: c, cursor: 'pointer', outline: 'none',
                      }}
                    />
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                style={{
                  padding: '10px 24px', borderRadius: 100, border: 'none',
                  background: '#6366f1', color: '#fff', fontFamily: 'sans-serif',
                  fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                  opacity: creating || !form.name.trim() ? 0.6 : 1,
                }}
              >
                {creating ? 'Creating…' : 'Create Feed'}
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontFamily: 'sans-serif' }}>Loading feeds…</div>
          ) : feeds.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '60px 32px', textAlign: 'center', color: '#94a3b8', fontFamily: 'sans-serif', border: '1px dashed rgba(203,213,225,0.9)' }}>
              No custom feeds yet. Create one to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {feeds.map(feed => (
                <FeedCard key={feed.feed_id || feed.name} feed={feed} onDelete={handleDelete} onRun={handleRun} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
