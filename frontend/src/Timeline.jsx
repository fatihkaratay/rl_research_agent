/**
 * Feature 10: Timeline view with recharts.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line,
} from 'recharts';

const API = 'http://127.0.0.1:8000';

// Generate distinct colors for categories
const COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6',
  '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
];

function getCategoryColor(cat, index) {
  return COLORS[index % COLORS.length];
}

export default function Timeline() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('count'); // 'count' | 'novelty'
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API}/api/analytics/timeline`)
      .then(r => r.json())
      .then(rawData => {
        // Collect all unique categories
        const catSet = new Set();
        rawData.forEach(w => Object.keys(w.by_category || {}).forEach(c => catSet.add(c)));
        setCategories([...catSet]);
        setData(rawData.slice(-20)); // Show last 20 weeks
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <style>{`
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background: #eef1f7 !important; }
        .timeline-wrapper { min-height: 100vh; background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%); padding: 40px 24px 80px; box-sizing: border-box; font-family: 'Georgia', serif; }
        .timeline-inner { max-width: 1000px; margin: 0 auto; }
        .toggle-btn { padding: 8px 20px; border-radius: 100px; border: 1px solid #e2e8f0; cursor: pointer; font-family: sans-serif; font-size: 0.85rem; font-weight: 600; transition: all 0.2s; }
        .toggle-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }
        .toggle-btn:not(.active) { background: #fff; color: #64748b; }
      `}</style>

      <div className="timeline-wrapper">
        <div className="timeline-inner">
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#6366f1', fontFamily: 'sans-serif', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
            ← Back to Hub
          </Link>

          <div style={{ marginBottom: 28 }}>
            <h1 style={{ margin: '0 0 6px', fontSize: '2rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.02em' }}>
              Research Timeline
            </h1>
            <p style={{ margin: 0, color: '#64748b', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>
              Weekly paper activity and novelty trends.
            </p>
          </div>

          {/* Toggle */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
            <button className={`toggle-btn ${mode === 'count' ? 'active' : ''}`} onClick={() => setMode('count')}>
              Papers per Week
            </button>
            <button className={`toggle-btn ${mode === 'novelty' ? 'active' : ''}`} onClick={() => setMode('novelty')}>
              Avg Novelty per Week
            </button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontFamily: 'sans-serif' }}>Loading timeline…</div>
          ) : data.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 16, padding: '60px 32px', textAlign: 'center', color: '#94a3b8', fontFamily: 'sans-serif' }}>
              No data yet. Run the research agent to collect papers.
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 20, border: '1px solid rgba(203,213,225,0.8)', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
              {mode === 'count' ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94a3b8' }} angle={-35} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'sans-serif', fontSize: 13 }}
                    />
                    <Legend wrapperStyle={{ fontFamily: 'sans-serif', fontSize: 12 }} />
                    {categories.slice(0, 10).map((cat, i) => (
                      <Bar
                        key={cat}
                        dataKey={d => (d.by_category || {})[cat] || 0}
                        name={cat}
                        stackId="a"
                        fill={getCategoryColor(cat, i)}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94a3b8' }} angle={-35} textAnchor="end" height={60} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fontFamily: 'monospace', fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontFamily: 'sans-serif', fontSize: 13 }}
                      formatter={(v) => [`${v}/10`, 'Avg Novelty']}
                    />
                    <Line
                      type="monotone"
                      dataKey="avg_novelty"
                      stroke="#6366f1"
                      strokeWidth={2.5}
                      dot={{ fill: '#6366f1', r: 4 }}
                      name="Avg Novelty"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
