import { Link } from 'react-router-dom';

const NAV_ITEMS = [
  {
    to: '/latest',
    icon: '🌍',
    iconStyle: { background: 'linear-gradient(135deg, #6366f1, #818cf8)', boxShadow: '0 4px 10px rgba(99,102,241,0.3)' },
    cardClass: '',
    arrowColor: '#6366f1',
    title: 'Global Trends',
    desc: 'View the highest-signal RL papers curated by the community today.',
  },
  {
    to: '/authors',
    icon: '👨‍🔬',
    iconStyle: { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' },
    cardClass: 'green',
    arrowColor: '#10b981',
    title: 'Author Watchlist',
    desc: 'Track the latest publications from your VIP list of AI researchers.',
  },
  {
    to: '/arxiv',
    icon: '📡',
    iconStyle: { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 4px 10px rgba(6,182,212,0.3)' },
    cardClass: 'cyan',
    arrowColor: '#06b6d4',
    title: 'ArXiv Direct Feed',
    desc: 'Latest papers from cs.LG, cs.AI, cs.RO sorted by submission date.',
  },
  {
    to: '/discover',
    icon: '🕸️',
    iconStyle: { background: 'linear-gradient(135deg, #9333ea, #a855f7)', boxShadow: '0 4px 10px rgba(168,85,247,0.3)' },
    cardClass: 'purple',
    arrowColor: '#a855f7',
    title: 'Network Discovery',
    desc: 'Interactive physics graph mapping co-authors and citations.',
  },
  {
    to: '/kanban',
    icon: '📋',
    iconStyle: { background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 4px 10px rgba(245,158,11,0.3)' },
    cardClass: 'amber',
    arrowColor: '#f59e0b',
    title: 'Reading Board',
    desc: 'Drag-and-drop kanban to track your reading progress.',
  },
  {
    to: '/timeline',
    icon: '📈',
    iconStyle: { background: 'linear-gradient(135deg, #db2777, #ec4899)', boxShadow: '0 4px 10px rgba(236,72,153,0.3)' },
    cardClass: 'pink',
    arrowColor: '#ec4899',
    title: 'Research Timeline',
    desc: 'Weekly paper activity and novelty trends with charts.',
  },
  {
    to: '/feeds',
    icon: '📡',
    iconStyle: { background: 'linear-gradient(135deg, #0f766e, #14b8a6)', boxShadow: '0 4px 10px rgba(20,184,166,0.3)' },
    cardClass: 'teal',
    arrowColor: '#14b8a6',
    title: 'Custom Feeds',
    desc: 'Create and manage topic-specific research pipelines.',
  },
  {
    to: '/settings',
    icon: '⚙️',
    iconStyle: { background: 'linear-gradient(135deg, #475569, #64748b)', boxShadow: '0 4px 10px rgba(100,116,139,0.3)' },
    cardClass: 'slate',
    arrowColor: '#64748b',
    title: 'Settings',
    desc: 'Manage watched authors, topics, ArXiv categories, and schedule.',
  },
];

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
          align-items: flex-start;
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
          max-width: 560px;
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
          max-width: 380px;
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
          padding: 20px 24px;
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
        .home-card.green:hover { box-shadow: 0 12px 32px rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.4); }
        .home-card.cyan:hover { box-shadow: 0 12px 32px rgba(6,182,212,0.1); border-color: rgba(6,182,212,0.4); }
        .home-card.purple:hover { box-shadow: 0 12px 32px rgba(168,85,247,0.1); border-color: rgba(168,85,247,0.4); }
        .home-card.amber:hover { box-shadow: 0 12px 32px rgba(245,158,11,0.1); border-color: rgba(245,158,11,0.4); }
        .home-card.pink:hover { box-shadow: 0 12px 32px rgba(236,72,153,0.1); border-color: rgba(236,72,153,0.4); }
        .home-card.teal:hover { box-shadow: 0 12px 32px rgba(20,184,166,0.1); border-color: rgba(20,184,166,0.4); }
        .home-card.slate:hover { box-shadow: 0 12px 32px rgba(100,116,139,0.1); border-color: rgba(100,116,139,0.4); }
        .home-card-icon {
          width: 48px;
          height: 48px;
          flex-shrink: 0;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .home-card-title {
          margin: 0 0 4px;
          font-size: 1rem;
          font-weight: 700;
          color: #1e293b;
          font-family: sans-serif;
        }
        .home-card-desc {
          margin: 0;
          font-size: 0.82rem;
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

          {/* Navigation cards */}
          <div className="home-cards">
            {NAV_ITEMS.map(item => (
              <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                <div className={`home-card ${item.cardClass}`}>
                  <div className="home-card-icon" style={item.iconStyle}>{item.icon}</div>
                  <div>
                    <h2 className="home-card-title">{item.title}</h2>
                    <p className="home-card-desc">{item.desc}</p>
                  </div>
                  <span className="home-card-arrow" style={{ color: item.arrowColor }}>→</span>
                </div>
              </Link>
            ))}
          </div>

          <p className="home-footer">Powered by Automated AI Analysis</p>
        </div>
      </div>
    </>
  );
}

export default Home;
