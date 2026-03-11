/**
 * Feature 9: Paper comparison view.
 */
import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API = 'http://127.0.0.1:8000';

const ROWS = [
  { key: 'novelty_score', label: 'Novelty Score' },
  { key: 'rl_category', label: 'RL Category' },
  { key: 'key_innovation', label: 'Key Innovation' },
  { key: 'problem_addressed', label: 'Problem Addressed' },
  { key: 'institutions', label: 'Institutions' },
  { key: 'trend_prediction', label: 'Trend Prediction' },
  { key: 'published_date', label: 'Published Date' },
  { key: 'authors', label: 'Authors' },
];

function renderCell(key, value) {
  if (Array.isArray(value)) return value.join(', ') || '—';
  if (value == null || value === '') return '—';
  if (key === 'novelty_score') {
    const color = value >= 8 ? '#10b981' : value >= 6 ? '#6366f1' : '#94a3b8';
    return (
      <span style={{ fontWeight: 800, fontSize: '1.1rem', color }}>{value}/10</span>
    );
  }
  return String(value);
}

export default function Compare() {
  const [searchParams] = useSearchParams();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const ids = searchParams.get('ids') || '';

  useEffect(() => {
    if (!ids) { setLoading(false); return; }
    fetch(`${API}/api/compare?ids=${encodeURIComponent(ids)}`)
      .then(r => r.json())
      .then(data => { setPapers(data.papers || []); setLoading(false); })
      .catch(e => { setError('Failed to load papers.'); setLoading(false); });
  }, [ids]);

  return (
    <>
      <style>{`
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background: #eef1f7 !important; }
        .compare-wrapper { min-height: 100vh; background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%); padding: 40px 24px 80px; box-sizing: border-box; font-family: 'Georgia', serif; }
        .compare-inner { max-width: 1100px; margin: 0 auto; }
        .compare-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        .compare-table th { background: #f8fafc; padding: 14px 18px; font-family: monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .compare-table td { padding: 14px 18px; font-family: sans-serif; font-size: 0.84rem; color: #475569; border-bottom: 1px solid #f1f5f9; vertical-align: top; line-height: 1.55; }
        .compare-table td:first-child { font-weight: 700; color: #1e293b; font-family: monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; background: #fafbfc; width: 140px; }
        .compare-table tr:last-child td { border-bottom: none; }
      `}</style>

      <div className="compare-wrapper">
        <div className="compare-inner">
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6366f1', fontFamily: 'sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
            ← Back to Hub
          </Link>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
              Paper Comparison
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>
              Side-by-side analysis of {papers.length} paper{papers.length !== 1 ? 's' : ''}.
            </p>
          </div>

          {loading && <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontFamily: 'sans-serif' }}>Loading…</div>}
          {error && <div style={{ color: '#ef4444', fontFamily: 'sans-serif' }}>{error}</div>}

          {!loading && papers.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    {papers.map(p => (
                      <th key={p.arxiv_id}>
                        <a href={p.pdf_url} target="_blank" rel="noreferrer" style={{ color: '#6366f1', textDecoration: 'none', fontFamily: 'sans-serif', fontSize: 12 }}>
                          {p.title?.slice(0, 60)}{p.title?.length > 60 ? '…' : ''}
                        </a>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(row => (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      {papers.map(p => (
                        <td key={p.arxiv_id}>{renderCell(row.key, p[row.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && papers.length === 0 && !error && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '60px 32px', textAlign: 'center', color: '#94a3b8', fontFamily: 'sans-serif' }}>
              No papers selected. Go to a feed and select papers to compare.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
