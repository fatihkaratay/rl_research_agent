import { Link } from 'react-router-dom';

function Home() {
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
        .home-page-wrapper {
          position: fixed;
          inset: 0;
          overflow-y: auto;
          background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Georgia', serif;
        }
        .home-dot-bg {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
          background-size: 28px 28px;
          opacity: 0.5;
          z-index: 0;
        }
        .home-inner {
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 36px;
          position: relative;
          z-index: 1;
          padding: 60px 24px;
          box-sizing: border-box;
          text-align: center;
        }
        .home-badge {
          display: inline-flex;
          align-items: center;
          background: rgba(99,102,241,0.1);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 100px;
          padding: 5px 14px;
          margin-bottom: 4px;
        }
        .home-badge span {
          font-size: 11px;
          color: #6366f1;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: monospace;
          font-weight: 600;
        }
        .home-title {
          font-size: clamp(2.2rem, 5vw, 3.2rem);
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 12px;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }
        .home-subtitle {
          font-size: 1rem;
          color: #64748b;
          max-width: 360px;
          line-height: 1.7;
          margin: 0 auto;
          font-family: sans-serif;
        }
        .home-divider {
          width: 60px;
          height: 3px;
          border-radius: 99px;
          background: linear-gradient(90deg, #6366f1, #10b981);
        }
        .home-cards {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .home-card {
          background: #ffffff;
          border: 1px solid rgba(203,213,225,0.8);
          border-radius: 18px;
          padding: 24px 28px;
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.22s ease;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          cursor: pointer;
          text-align: left;
        }
        .home-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(99,102,241,0.12);
          border-color: rgba(99,102,241,0.4);
        }
        .home-card.green:hover {
          box-shadow: 0 12px 32px rgba(16,185,129,0.1);
          border-color: rgba(16,185,129,0.4);
        }
        .home-card-icon {
          width: 52px;
          height: 52px;
          flex-shrink: 0;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .home-card-icon.indigo {
          background: linear-gradient(135deg, #6366f1, #818cf8);
          box-shadow: 0 4px 10px rgba(99,102,241,0.3);
        }
        .home-card-icon.green {
          background: linear-gradient(135deg, #059669, #10b981);
          box-shadow: 0 4px 10px rgba(16,185,129,0.3);
        }
        .home-card-title {
          margin: 0 0 5px;
          font-size: 1.05rem;
          font-weight: 700;
          color: #1e293b;
          font-family: sans-serif;
        }
        .home-card-desc {
          margin: 0;
          font-size: 0.845rem;
          color: #94a3b8;
          font-family: sans-serif;
          line-height: 1.5;
        }
        .home-card-arrow {
          font-size: 1.1rem;
          flex-shrink: 0;
          margin-left: auto;
        }
        .home-footer {
          font-size: 0.7rem;
          color: #cbd5e1;
          font-family: monospace;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
      `}</style>

      <div className="home-dot-bg" />

      <div className="home-page-wrapper">
        <div className="home-inner">

          {/* Header */}
          <div>
            <div className="home-badge">
              <span>AI Research Pipeline</span>
            </div>
            <h1 className="home-title">RL Research Hub</h1>
            <p className="home-subtitle">
              Select a research pipeline to view the latest automated AI analysis and paper tracking.
            </p>
          </div>

          <div className="home-divider" />

          {/* Cards */}
          <div className="home-cards">
            <Link to="/latest" style={{ textDecoration: 'none' }}>
              <div className="home-card">
                <div className="home-card-icon indigo">🌍</div>
                <div>
                  <h2 className="home-card-title">Global Trends</h2>
                  <p className="home-card-desc">View the highest-signal RL papers curated by the community today.</p>
                </div>
                <span className="home-card-arrow" style={{ color: '#6366f1' }}>→</span>
              </div>
            </Link>

            <Link to="/authors" style={{ textDecoration: 'none' }}>
              <div className="home-card green">
                <div className="home-card-icon green">👨‍🔬</div>
                <div>
                  <h2 className="home-card-title">Author Watchlist</h2>
                  <p className="home-card-desc">Track the latest publications from your VIP list of AI researchers.</p>
                </div>
                <span className="home-card-arrow" style={{ color: '#10b981' }}>→</span>
              </div>
            </Link>
          </div>

          <p className="home-footer">Powered by Automated AI Analysis</p>
        </div>
      </div>
    </>
  );
}

export default Home;