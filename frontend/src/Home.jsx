import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    label: 'Research Feeds',
    desc: 'Automated pipelines that fetch, deduplicate, and analyze new papers',
    items: [
      {
        to: '/latest',
        icon: '🌍',
        iconStyle: { background: 'linear-gradient(135deg, #6366f1, #818cf8)', boxShadow: '0 4px 10px rgba(99,102,241,0.3)' },
        cardClass: '',
        arrowColor: '#6366f1',
        title: 'Global Trends',
        desc: 'Highest-signal RL papers curated by the community daily.',
      },
      {
        to: '/authors',
        icon: '👨‍🔬',
        iconStyle: { background: 'linear-gradient(135deg, #059669, #10b981)', boxShadow: '0 4px 10px rgba(16,185,129,0.3)' },
        cardClass: 'green',
        arrowColor: '#10b981',
        title: 'Author Watchlist',
        desc: 'Latest publications from your tracked VIP researchers.',
      },
      {
        to: '/arxiv',
        icon: '📡',
        iconStyle: { background: 'linear-gradient(135deg, #0891b2, #06b6d4)', boxShadow: '0 4px 10px rgba(6,182,212,0.3)' },
        cardClass: 'cyan',
        arrowColor: '#06b6d4',
        title: 'ArXiv Direct',
        desc: 'Papers from cs.LG, cs.AI, cs.RO sorted by submission date.',
      },
      {
        to: '/feeds',
        icon: '⚗️',
        iconStyle: { background: 'linear-gradient(135deg, #0f766e, #14b8a6)', boxShadow: '0 4px 10px rgba(20,184,166,0.3)' },
        cardClass: 'teal',
        arrowColor: '#14b8a6',
        title: 'Custom Feeds',
        desc: 'Create topic-specific pipelines with your own keywords.',
      },
    ],
  },
  {
    label: 'Explore & Analyze',
    desc: 'Visualize networks, trends, and individual author impact',
    items: [
      {
        to: '/discover',
        icon: '🕸️',
        iconStyle: { background: 'linear-gradient(135deg, #9333ea, #a855f7)', boxShadow: '0 4px 10px rgba(168,85,247,0.3)' },
        cardClass: 'purple',
        arrowColor: '#a855f7',
        title: 'Network Discovery',
        desc: 'Physics graph mapping co-authorship and collaborations.',
      },
      {
        to: '/timeline',
        icon: '📈',
        iconStyle: { background: 'linear-gradient(135deg, #db2777, #ec4899)', boxShadow: '0 4px 10px rgba(236,72,153,0.3)' },
        cardClass: 'pink',
        arrowColor: '#ec4899',
        title: 'Research Timeline',
        desc: 'Weekly paper activity and novelty trends visualized.',
      },
    ],
  },
  {
    label: 'Organize',
    desc: 'Track your reading progress and compare papers side-by-side',
    items: [
      {
        to: '/kanban',
        icon: '📋',
        iconStyle: { background: 'linear-gradient(135deg, #d97706, #f59e0b)', boxShadow: '0 4px 10px rgba(245,158,11,0.3)' },
        cardClass: 'amber',
        arrowColor: '#f59e0b',
        title: 'Reading Board',
        desc: 'Drag-and-drop kanban to track New → Reading → Done.',
      },
      {
        to: '/compare',
        icon: '⚖️',
        iconStyle: { background: 'linear-gradient(135deg, #b45309, #d97706)', boxShadow: '0 4px 10px rgba(180,83,9,0.3)' },
        cardClass: 'orange',
        arrowColor: '#d97706',
        title: 'Compare Papers',
        desc: 'Select papers in any feed to view them side-by-side.',
      },
    ],
  },
  {
    label: 'Configure',
    desc: 'Manage your watched authors, topics, and automation schedule',
    items: [
      {
        to: '/settings',
        icon: '⚙️',
        iconStyle: { background: 'linear-gradient(135deg, #475569, #64748b)', boxShadow: '0 4px 10px rgba(100,116,139,0.3)' },
        cardClass: 'slate',
        arrowColor: '#64748b',
        title: 'Settings',
        desc: 'Authors, topics, ArXiv categories, and run schedule.',
      },
    ],
  },
];

function Home() {
  return (
    <>
      <style>{`
        html, body, #root {
          margin: 0 !important; padding: 0 !important;
          width: 100% !important; min-height: 100vh !important;
          background: #eef1f7 !important;
        }
        .home-page-wrapper {
          position: fixed; inset: 0; overflow-y: auto;
          background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%);
          font-family: 'Georgia', serif;
        }
        .home-dot-bg {
          position: fixed; inset: 0; pointer-events: none;
          background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px);
          background-size: 28px 28px; opacity: 0.5; z-index: 0;
        }
        .home-inner {
          width: 100%; max-width: 860px; margin: 0 auto;
          display: flex; flex-direction: column; gap: 48px;
          position: relative; z-index: 1;
          padding: 60px 24px 80px; box-sizing: border-box;
        }

        /* Header */
        .home-header { text-align: center; }
        .home-badge {
          display: inline-flex; align-items: center;
          background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25);
          border-radius: 100px; padding: 5px 14px; margin-bottom: 16px;
        }
        .home-badge span {
          font-size: 11px; color: #6366f1; letter-spacing: 0.12em;
          text-transform: uppercase; font-family: monospace; font-weight: 600;
        }
        .home-title {
          font-size: clamp(2rem, 5vw, 3rem); font-weight: 800; color: #1e293b;
          margin: 0 0 12px; letter-spacing: -0.02em; line-height: 1.1;
        }
        .home-subtitle {
          font-size: 1rem; color: #64748b; max-width: 440px;
          line-height: 1.7; margin: 0 auto; font-family: sans-serif;
        }

        /* Sections */
        .home-section { display: flex; flex-direction: column; gap: 14px; }
        .home-section-header { display: flex; flex-direction: column; gap: 3px; }
        .home-section-label {
          font-size: 12px; font-family: monospace; font-weight: 700;
          letter-spacing: 0.1em; text-transform: uppercase; color: #475569;
        }
        .home-section-desc {
          font-size: 0.82rem; font-family: sans-serif; color: #64748b; margin: 0;
        }
        .home-section-divider {
          height: 1px; background: rgba(148,163,184,0.35); margin: 0;
        }

        /* Grid */
        .home-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (max-width: 540px) {
          .home-grid { grid-template-columns: 1fr; }
        }

        /* Cards */
        .home-card {
          background: #ffffff; border: 1px solid rgba(203,213,225,0.8);
          border-radius: 16px; padding: 20px; display: flex;
          flex-direction: column; gap: 12px;
          transition: all 0.22s ease; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          text-decoration: none;
        }
        .home-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(99,102,241,0.11);
          border-color: rgba(99,102,241,0.35);
        }
        .home-card.green:hover  { box-shadow: 0 10px 28px rgba(16,185,129,0.1);  border-color: rgba(16,185,129,0.35); }
        .home-card.cyan:hover   { box-shadow: 0 10px 28px rgba(6,182,212,0.1);   border-color: rgba(6,182,212,0.35); }
        .home-card.purple:hover { box-shadow: 0 10px 28px rgba(168,85,247,0.1);  border-color: rgba(168,85,247,0.35); }
        .home-card.amber:hover  { box-shadow: 0 10px 28px rgba(245,158,11,0.1);  border-color: rgba(245,158,11,0.35); }
        .home-card.orange:hover { box-shadow: 0 10px 28px rgba(217,119,6,0.1);   border-color: rgba(217,119,6,0.35); }
        .home-card.pink:hover   { box-shadow: 0 10px 28px rgba(236,72,153,0.1);  border-color: rgba(236,72,153,0.35); }
        .home-card.teal:hover   { box-shadow: 0 10px 28px rgba(20,184,166,0.1);  border-color: rgba(20,184,166,0.35); }
        .home-card.slate:hover  { box-shadow: 0 10px 28px rgba(100,116,139,0.1); border-color: rgba(100,116,139,0.35); }

        .home-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .home-card-icon {
          width: 40px; height: 40px; flex-shrink: 0;
          border-radius: 12px; display: flex; align-items: center;
          justify-content: center; font-size: 18px;
        }
        .home-card-arrow { font-size: 1rem; opacity: 0.5; transition: opacity 0.2s, transform 0.2s; }
        .home-card:hover .home-card-arrow { opacity: 1; transform: translateX(3px); }
        .home-card-title {
          margin: 0 0 4px; font-size: 0.95rem; font-weight: 700;
          color: #1e293b; font-family: sans-serif;
        }
        .home-card-desc {
          margin: 0; font-size: 0.78rem; color: #94a3b8;
          font-family: sans-serif; line-height: 1.5;
        }

        /* Single-item row: constrain width so it doesn't stretch full grid */
        .home-grid-single { max-width: calc(50% - 6px); }
        @media (max-width: 540px) { .home-grid-single { max-width: 100%; } }

        .home-footer {
          text-align: center; font-size: 0.7rem; color: #cbd5e1;
          font-family: monospace; letter-spacing: 0.08em; text-transform: uppercase;
        }
      `}</style>

      <div className="home-dot-bg" />

      <div className="home-page-wrapper">
        <div className="home-inner">

          {/* Header */}
          <div className="home-header">
            <div className="home-badge"><span>AI Research Pipeline</span></div>
            <h1 className="home-title">RL Research Hub</h1>
            <p className="home-subtitle">
              An automated pipeline for discovering, analyzing, and organizing reinforcement learning research.
            </p>
          </div>

          {/* Grouped sections */}
          {SECTIONS.map(section => (
            <div key={section.label} className="home-section">
              <div className="home-section-header">
                <span className="home-section-label">{section.label}</span>
                <p className="home-section-desc">{section.desc}</p>
              </div>
              <div className="home-section-divider" />

              <div className={`home-grid ${section.items.length === 1 ? 'home-grid-single-wrap' : ''}`}>
                {section.items.map(item => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`home-card ${item.cardClass} ${section.items.length === 1 ? 'home-grid-single' : ''}`}
                  >
                    <div className="home-card-top">
                      <div className="home-card-icon" style={item.iconStyle}>{item.icon}</div>
                      <span className="home-card-arrow" style={{ color: item.arrowColor }}>→</span>
                    </div>
                    <div>
                      <h2 className="home-card-title">{item.title}</h2>
                      <p className="home-card-desc">{item.desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          <p className="home-footer">Powered by Automated AI Analysis</p>
        </div>
      </div>
    </>
  );
}

export default Home;
