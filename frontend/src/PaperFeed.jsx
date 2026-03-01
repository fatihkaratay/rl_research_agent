import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function PaperFeed({ feedType, title, subtitle }) {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAgentRunning, setIsAgentRunning] = useState(false);

  const isAuthor = feedType === 'author';
  const accent = isAuthor ? '#10b981' : '#6366f1';
  const accentLight = isAuthor ? 'rgba(16,185,129,0.1)' : 'rgba(99,102,241,0.1)';
  const accentBorder = isAuthor ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.25)';
  const accentShadow = isAuthor ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)';

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/papers/${feedType}`);
      const data = await response.json();
      setPapers(data.papers);
    } catch (error) {
      console.error("Failed to fetch papers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, [feedType]);

  const triggerAgent = async () => {
    setIsAgentRunning(true);
    try {
      await fetch(`http://127.0.0.1:8000/api/research/run/${feedType}`, { method: "POST" });
      setTimeout(() => {
        setIsAgentRunning(false);
        fetchPapers();
      }, 5000);
    } catch (error) {
      console.error("Error triggering agent.", error);
      setIsAgentRunning(false);
    }
  };

  return (
    <>
      <style>{`
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          min-height: 100vh !important;
          background: #eef1f7 !important;
        }
        .feed-dot-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.5;
          z-index: 0;
        }
        .feed-wrapper {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          width: 100%;
          background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%);
          display: flex;
          justify-content: center;
          padding: 40px 24px 80px;
          box-sizing: border-box;
          font-family: 'Georgia', serif;
        }
        .feed-inner {
          width: 100%;
          max-width: 780px;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .feed-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #6366f1;
          font-family: sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .feed-back-link:hover { opacity: 0.7; }

        /* Header card */
        .feed-header-card {
          background: #ffffff;
          border: 1px solid rgba(203,213,225,0.8);
          border-radius: 20px;
          padding: 36px 32px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
        }
        .feed-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 100px;
          padding: 5px 14px;
        }
        .feed-badge span {
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: monospace;
          font-weight: 600;
        }
        .feed-title {
          font-size: clamp(1.8rem, 4vw, 2.4rem);
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 8px;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .feed-subtitle {
          font-size: 0.9rem;
          color: #94a3b8;
          font-family: sans-serif;
          margin: 0;
        }
        .feed-run-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          border-radius: 100px;
          font-family: sans-serif;
          font-size: 0.875rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.22s ease;
        }
        .feed-run-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .feed-run-btn:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* Loading / empty */
        .feed-loading {
          text-align: center;
          padding: 60px 0;
          color: #94a3b8;
          font-family: sans-serif;
          font-size: 0.9rem;
        }
        .feed-empty {
          background: #ffffff;
          border: 1px dashed rgba(203,213,225,0.9);
          border-radius: 20px;
          padding: 60px 32px;
          text-align: center;
          color: #94a3b8;
          font-family: sans-serif;
        }

        /* Paper cards */
        .paper-card {
          background: #ffffff;
          border: 1px solid rgba(203,213,225,0.8);
          border-radius: 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.05);
          overflow: hidden;
          transition: all 0.22s ease;
        }
        .paper-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.09);
        }
        .paper-card-header {
          padding: 28px 32px;
          border-bottom: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
        }
        .paper-novelty {
          font-size: 11px;
          font-family: monospace;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 12px;
          border-radius: 100px;
        }
        .paper-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.4;
          margin: 0;
          font-family: sans-serif;
          text-decoration: none;
          transition: color 0.2s;
        }
        .paper-title:hover { color: #6366f1; }
        .paper-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .paper-tag {
          font-size: 11px;
          font-family: monospace;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 8px;
        }
        .paper-card-body {
          padding: 24px 32px;
          background: #fafbfc;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .paper-section-label {
          font-size: 10px;
          font-family: monospace;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #94a3b8;
          margin: 0 0 8px;
        }
        .paper-section-text {
          font-size: 0.855rem;
          color: #475569;
          font-family: sans-serif;
          line-height: 1.65;
          margin: 0;
        }
        .paper-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        @media (max-width: 600px) {
          .paper-grid { grid-template-columns: 1fr; }
          .paper-card-header, .paper-card-body { padding: 20px; }
        }
        .paper-trend-box {
          background: rgba(99,102,241,0.06);
          border: 1px solid rgba(99,102,241,0.15);
          border-radius: 12px;
          padding: 14px;
          font-size: 0.855rem;
          color: #4f46e5;
          font-family: sans-serif;
          line-height: 1.6;
          margin: 0;
        }
        .paper-turkish {
          border-top: 1px solid #f1f5f9;
          padding-top: 20px;
        }
      `}</style>

      <div className="feed-dot-bg" />

      <div className="feed-wrapper">
        <div className="feed-inner">

          {/* Back nav */}
          <Link to="/" className="feed-back-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Hub
          </Link>

          {/* Header card */}
          <div className="feed-header-card">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div className="feed-badge" style={{ background: accentLight, border: `1px solid ${accentBorder}` }}>
                <span style={{ color: accent }}>{isAuthor ? 'Author Watchlist' : 'Global Trends'}</span>
              </div>
              <div>
                <h1 className="feed-title">{title}</h1>
                <p className="feed-subtitle">{subtitle}</p>
              </div>
            </div>

            <button
              onClick={triggerAgent}
              disabled={isAgentRunning}
              className="feed-run-btn"
              style={!isAgentRunning ? {
                background: `linear-gradient(135deg, ${accent}, ${isAuthor ? '#059669' : '#818cf8'})`,
                color: '#fff',
                boxShadow: `0 4px 14px ${accentShadow}`,
              } : {}}
            >
              {isAgentRunning ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #cbd5e1', borderTopColor: '#94a3b8', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Agent is Researching…
                </>
              ) : (
                `Run ${isAuthor ? 'Watchlist' : 'Global'} Agent Now`
              )}
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="feed-loading">Loading database…</div>
          ) : papers.length === 0 ? (
            <div className="feed-empty">No papers found in this feed yet.</div>
          ) : (
            papers.map((paper) => (
              <div key={paper.arxiv_id} className="paper-card">

                {/* Card header */}
                <div className="paper-card-header">
                  <span
                    className="paper-novelty"
                    style={{ background: accentLight, color: accent, border: `1px solid ${accentBorder}` }}
                  >
                    Novelty {paper.novelty_score}/10
                  </span>

                  <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="paper-title">
                    {paper.title}
                  </a>

                  <div className="paper-tags">
                    <span className="paper-tag" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                      {paper.published_date}
                    </span>
                    <span className="paper-tag" style={{ background: 'rgba(99,102,241,0.07)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)' }}>
                      {paper.rl_category}
                    </span>
                    <span className="paper-tag" style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                      {paper.authors.slice(0, 3).join(', ')}
                    </span>
                    <span className="paper-tag" style={{ background: 'rgba(245,158,11,0.08)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>
                      🏛️ {paper.institutions?.length > 0 ? paper.institutions.join(', ') : 'Institute Unlisted'}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="paper-card-body">
                  <div className="paper-grid">
                    <div>
                      <p className="paper-section-label">Key Innovation & Problem</p>
                      <p className="paper-section-text"><strong style={{ color: '#1e293b' }}>Problem:</strong> {paper.problem_addressed}</p>
                      <p className="paper-section-text" style={{ marginTop: 8 }}><strong style={{ color: '#1e293b' }}>Innovation:</strong> {paper.key_innovation}</p>
                    </div>
                    <div>
                      <p className="paper-section-label">Trend Prediction</p>
                      <p className="paper-trend-box">{paper.trend_prediction}</p>
                    </div>
                  </div>

                  <div className="paper-turkish">
                    <p className="paper-section-label">🇹🇷 Türkçe Özet</p>
                    <p className="paper-section-text">{paper.turkish_summary}</p>
                  </div>
                </div>

              </div>
            ))
          )}

        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

export default PaperFeed;