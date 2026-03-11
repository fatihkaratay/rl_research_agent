/**
 * Feature 11: Author profile page.
 */
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';

const API = 'http://127.0.0.1:8000';

function StatCard({ label, value }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      border: '1px solid rgba(203,213,225,0.8)',
      padding: '18px 24px',
      textAlign: 'center',
      flex: 1,
      minWidth: 100,
    }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e293b', fontFamily: 'sans-serif' }}>
        {value ?? '—'}
      </div>
      <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

export default function AuthorProfile() {
  const { authorName } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authorName) return;
    fetch(`${API}/api/author/${encodeURIComponent(authorName)}`)
      .then(r => r.json())
      .then(data => { setProfile(data); setLoading(false); })
      .catch(() => { setError('Failed to load author profile.'); setLoading(false); });
  }, [authorName]);

  return (
    <>
      <style>{`
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background: #eef1f7 !important; }
        .author-wrapper { min-height: 100vh; background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%); padding: 40px 24px 80px; box-sizing: border-box; font-family: 'Georgia', serif; }
        .author-inner { max-width: 780px; margin: 0 auto; display: flex; flex-direction: column; gap: 24px; }
        .paper-card-sm { background: #fff; border: 1px solid rgba(203,213,225,0.8); border-radius: 14px; padding: 18px 22px; box-shadow: 0 1px 6px rgba(0,0,0,0.04); }
        .paper-card-sm:hover { box-shadow: 0 6px 20px rgba(99,102,241,0.1); }
      `}</style>

      <div className="author-wrapper">
        <div className="author-inner">
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6366f1', fontFamily: 'sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
            ← Back to Hub
          </Link>

          {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontFamily: 'sans-serif' }}>Loading author profile…</div>}
          {error && <div style={{ color: '#ef4444', fontFamily: 'sans-serif' }}>{error}</div>}

          {profile && (
            <>
              {/* Author header */}
              <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(203,213,225,0.8)', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, color: '#fff', fontWeight: 800, flexShrink: 0,
                  }}>
                    {(profile.display_name || authorName || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#1e293b' }}>
                      {profile.display_name || authorName}
                    </h1>
                    {profile.affiliations?.length > 0 && (
                      <p style={{ margin: '4px 0 0', color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.85rem' }}>
                        {profile.affiliations.slice(0, 3).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <StatCard label="h-index" value={profile.hIndex} />
                  <StatCard label="Citations" value={profile.citationCount?.toLocaleString()} />
                  <StatCard label="Papers" value={profile.paperCount} />
                  <StatCard label="In Our DB" value={profile.papers?.length} />
                </div>
              </div>

              {/* Papers in DB */}
              {profile.papers?.length > 0 && (
                <div>
                  <h2 style={{ margin: '0 0 14px', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', fontFamily: 'sans-serif' }}>
                    Papers in Database ({profile.papers.length})
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {profile.papers.map(p => (
                      <div key={p.arxiv_id} className="paper-card-sm">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{
                            fontSize: 10, fontFamily: 'monospace', fontWeight: 700, padding: '2px 10px',
                            borderRadius: 100, background: 'rgba(99,102,241,0.08)', color: '#6366f1',
                            border: '1px solid rgba(99,102,241,0.2)',
                          }}>
                            Novelty {p.novelty_score}/10
                          </span>
                          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                            {p.published_date}
                          </span>
                        </div>
                        <a href={p.pdf_url} target="_blank" rel="noreferrer" style={{
                          display: 'block', fontSize: '0.9rem', fontWeight: 700,
                          color: '#1e293b', textDecoration: 'none', marginBottom: 6, lineHeight: 1.4,
                        }}>
                          {p.title}
                        </a>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontFamily: 'sans-serif' }}>
                          {p.key_innovation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile.papers?.length === 0 && (
                <div style={{ background: '#fff', borderRadius: 16, padding: '40px 32px', textAlign: 'center', color: '#94a3b8', fontFamily: 'sans-serif', border: '1px dashed rgba(203,213,225,0.9)' }}>
                  No papers by this author in the database yet.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
