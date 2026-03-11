import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { copyBibTeX } from './utils/bibtex.js';

const PAGE_SIZE = 20;
const API = 'http://127.0.0.1:8000';

function PaperFeed({ feedType, title, subtitle }) {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [bookmarkIds, setBookmarkIds] = useState(new Set());
  const [minNovelty, setMinNovelty] = useState(0);
  const [trendSummary, setTrendSummary] = useState(null);
  const [compareIds, setCompareIds] = useState(new Set());
  const [citedPaper, setCitedPaper] = useState('');
  const [expandedNotes, setExpandedNotes] = useState({});
  const [notes, setNotes] = useState({});
  const [noteTimers, setNoteTimers] = useState({});
  const [expandedSimilar, setExpandedSimilar] = useState({});
  const [similarPapers, setSimilarPapers] = useState({});
  const [loadingSimilar, setLoadingSimilar] = useState({});
  const [deepAnalyzing, setDeepAnalyzing] = useState({});

  const offsetRef = useRef(0);
  const wasRunningRef = useRef(false);
  const searchDebounce = useRef(null);

  const isAuthor = feedType === 'author';
  const isArxiv = feedType === 'arxiv';
  const accent = isAuthor ? '#10b981' : isArxiv ? '#06b6d4' : '#6366f1';
  const accentLight = isAuthor ? 'rgba(16,185,129,0.1)' : isArxiv ? 'rgba(6,182,212,0.1)' : 'rgba(99,102,241,0.1)';
  const accentBorder = isAuthor ? 'rgba(16,185,129,0.25)' : isArxiv ? 'rgba(6,182,212,0.25)' : 'rgba(99,102,241,0.25)';
  const accentShadow = isAuthor ? 'rgba(16,185,129,0.15)' : isArxiv ? 'rgba(6,182,212,0.15)' : 'rgba(99,102,241,0.15)';
  const accentGradient = isAuthor ? '#059669' : isArxiv ? '#0891b2' : '#818cf8';

  // --- Data fetching ---

  const fetchPapers = useCallback(async (opts = {}) => {
    const { append = false, searchVal = search, catVal = category } = opts;
    const offset = append ? offsetRef.current : 0;
    if (!append) {
      setLoading(true);
      offsetRef.current = 0;
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE,
        offset,
        ...(searchVal && { search: searchVal }),
        ...(catVal && { category: catVal }),
      });
      const res = await fetch(`${API}/api/papers/${feedType}?${params}`);
      const data = await res.json();
      const fetched = data.papers ?? [];

      if (append) {
        setPapers(prev => [...prev, ...fetched]);
      } else {
        setPapers(fetched);
      }

      offsetRef.current = offset + fetched.length;
      setHasMore(fetched.length === PAGE_SIZE);
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [feedType, search, category]);

  const fetchBookmarks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/bookmarks`);
      const data = await res.json();
      setBookmarkIds(new Set((data.papers ?? []).map(p => p.arxiv_id)));
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
    }
  }, []);

  const fetchTrendSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/trends/${feedType}`);
      if (res.ok) {
        const data = await res.json();
        setTrendSummary(data);
      }
    } catch {
      // Trend summary is optional
    }
  }, [feedType]);

  // SSE for agent status
  useEffect(() => {
    fetchPapers({ searchVal: '', catVal: '' });
    fetchBookmarks();
    fetchTrendSummary();

    const es = new EventSource(`${API}/api/research/stream/${feedType}`);
    es.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const wasRunning = wasRunningRef.current;
      wasRunningRef.current = data.is_running;
      setIsAgentRunning(data.is_running);
      if (wasRunning && !data.is_running) {
        fetchPapers({ searchVal: search, catVal: category });
        fetchTrendSummary();
      }
    };
    es.onerror = () => setIsAgentRunning(false);
    return () => es.close();
  }, [feedType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchPapers({ searchVal: val, catVal: category });
    }, 500);
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setCategory(val);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchPapers({ searchVal: search, catVal: val });
    }, 500);
  };

  const triggerAgent = async () => {
    setIsAgentRunning(true);
    try {
      await fetch(`${API}/api/research/run/${feedType}`, { method: 'POST' });
    } catch (err) {
      console.error('Error triggering agent:', err);
      setIsAgentRunning(false);
    }
  };

  // Bookmark toggle
  const toggleBookmark = async (arxiv_id) => {
    try {
      const res = await fetch(`${API}/api/bookmarks/${encodeURIComponent(arxiv_id)}`, { method: 'POST' });
      const data = await res.json();
      setBookmarkIds(prev => {
        const next = new Set(prev);
        data.bookmarked ? next.add(arxiv_id) : next.delete(arxiv_id);
        return next;
      });
    } catch (err) {
      console.error('Bookmark failed:', err);
    }
  };

  // Feature 9: Paper comparison
  const toggleCompare = (arxiv_id) => {
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(arxiv_id)) {
        next.delete(arxiv_id);
      } else if (next.size < 4) {
        next.add(arxiv_id);
      }
      return next;
    });
  };

  const handleCompare = () => {
    const ids = [...compareIds].join(',');
    navigate(`/compare?ids=${encodeURIComponent(ids)}`);
  };

  // Feature 15: BibTeX cite
  const handleCite = async (paper) => {
    const ok = await copyBibTeX(paper);
    if (ok) {
      setCitedPaper(paper.arxiv_id);
      setTimeout(() => setCitedPaper(''), 2000);
    }
  };

  // Feature 17: Notes
  const toggleNotes = async (arxiv_id) => {
    const isOpen = expandedNotes[arxiv_id];
    setExpandedNotes(prev => ({ ...prev, [arxiv_id]: !isOpen }));
    if (!isOpen && notes[arxiv_id] === undefined) {
      try {
        const res = await fetch(`${API}/api/paper/${encodeURIComponent(arxiv_id)}/notes`);
        const data = await res.json();
        setNotes(prev => ({ ...prev, [arxiv_id]: data.content || '' }));
      } catch {
        setNotes(prev => ({ ...prev, [arxiv_id]: '' }));
      }
    }
  };

  const handleNoteChange = (arxiv_id, value) => {
    setNotes(prev => ({ ...prev, [arxiv_id]: value }));
    // Debounce auto-save
    if (noteTimers[arxiv_id]) clearTimeout(noteTimers[arxiv_id]);
    const timer = setTimeout(async () => {
      try {
        await fetch(`${API}/api/paper/${encodeURIComponent(arxiv_id)}/notes`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: value }),
        });
        // Update has_note indicator
        setPapers(prev => prev.map(p => p.arxiv_id === arxiv_id ? { ...p, has_note: value.length > 0 } : p));
      } catch (e) {
        console.error('Note save failed:', e);
      }
    }, 1000);
    setNoteTimers(prev => ({ ...prev, [arxiv_id]: timer }));
  };

  // Feature 2: Similar papers
  const toggleSimilar = async (arxiv_id) => {
    const isOpen = expandedSimilar[arxiv_id];
    setExpandedSimilar(prev => ({ ...prev, [arxiv_id]: !isOpen }));
    if (!isOpen && !similarPapers[arxiv_id]) {
      setLoadingSimilar(prev => ({ ...prev, [arxiv_id]: true }));
      try {
        const res = await fetch(`${API}/api/paper/${encodeURIComponent(arxiv_id)}/similar`);
        const data = await res.json();
        setSimilarPapers(prev => ({ ...prev, [arxiv_id]: data.similar || [] }));
      } catch {
        setSimilarPapers(prev => ({ ...prev, [arxiv_id]: [] }));
      } finally {
        setLoadingSimilar(prev => ({ ...prev, [arxiv_id]: false }));
      }
    }
  };

  // Feature 16: Deep analyze
  const handleDeepAnalyze = async (arxiv_id) => {
    setDeepAnalyzing(prev => ({ ...prev, [arxiv_id]: true }));
    try {
      await fetch(`${API}/api/paper/${encodeURIComponent(arxiv_id)}/deep-analyze`, { method: 'POST' });
      // After triggering, update the paper UI state
      setPapers(prev => prev.map(p => p.arxiv_id === arxiv_id ? { ...p, _deepStarted: true } : p));
    } catch (e) {
      console.error('Deep analyze failed:', e);
    }
    // Keep button disabled for 30s to avoid spam
    setTimeout(() => setDeepAnalyzing(prev => ({ ...prev, [arxiv_id]: false })), 30000);
  };

  // Feature 3: Citation badge helper
  const renderCitationBadge = (paper) => {
    if (paper.citation_count == null) return null;
    return (
      <span style={{
        fontSize: 10, fontFamily: 'monospace', fontWeight: 700,
        padding: '2px 8px', borderRadius: 100,
        background: 'rgba(245,158,11,0.1)', color: '#b45309',
        border: '1px solid rgba(245,158,11,0.25)',
      }}>
        {paper.citation_count} cite{paper.citation_count !== 1 ? 's' : ''}
      </span>
    );
  };

  const visiblePapers = minNovelty > 0
    ? papers.filter(p => (p.novelty_score ?? 0) >= minNovelty)
    : papers;

  return (
    <>
      <style>{`
        html, body, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; min-height: 100vh !important; background: #eef1f7 !important; }
        .feed-dot-bg { position: fixed; inset: 0; pointer-events: none; background-image: radial-gradient(circle, #cbd5e1 1px, transparent 1px); background-size: 28px 28px; opacity: 0.5; z-index: 0; }
        .feed-wrapper { position: relative; z-index: 1; min-height: 100vh; width: 100%; background: linear-gradient(160deg, #f1f5f9 0%, #e8edf5 50%, #eef1f7 100%); display: flex; justify-content: center; padding: 40px 24px 80px; box-sizing: border-box; font-family: 'Georgia', serif; }
        .feed-inner { width: 100%; max-width: 780px; display: flex; flex-direction: column; gap: 28px; }
        .feed-back-link { display: inline-flex; align-items: center; gap: 6px; color: #6366f1; font-family: sans-serif; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: opacity 0.2s; }
        .feed-back-link:hover { opacity: 0.7; }
        .feed-header-card { background: #ffffff; border: 1px solid rgba(203,213,225,0.8); border-radius: 20px; padding: 36px 32px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
        .feed-badge { display: inline-flex; align-items: center; border-radius: 100px; padding: 5px 14px; }
        .feed-badge span { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-family: monospace; font-weight: 600; }
        .feed-title { font-size: clamp(1.8rem, 4vw, 2.4rem); font-weight: 800; color: #1e293b; margin: 0 0 8px; letter-spacing: -0.02em; line-height: 1.15; }
        .feed-subtitle { font-size: 0.9rem; color: #94a3b8; font-family: sans-serif; margin: 0; }
        .feed-run-btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; border-radius: 100px; font-family: sans-serif; font-size: 0.875rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.22s ease; }
        .feed-run-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .feed-run-btn:disabled { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; box-shadow: none; }
        .filter-bar { background: #ffffff; border: 1px solid rgba(203,213,225,0.8); border-radius: 16px; padding: 16px 20px; box-shadow: 0 1px 6px rgba(0,0,0,0.04); display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
        .filter-input { flex: 1; min-width: 160px; padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-family: sans-serif; font-size: 0.85rem; outline: none; background: #f8fafc; color: #1e293b; transition: border-color 0.2s; }
        .filter-input:focus { border-color: #6366f1; background: #fff; }
        .filter-select { padding: 8px 12px; border-radius: 10px; border: 1px solid #e2e8f0; font-family: sans-serif; font-size: 0.85rem; background: #f8fafc; color: #475569; outline: none; cursor: pointer; }
        .feed-loading { text-align: center; padding: 60px 0; color: #94a3b8; font-family: sans-serif; font-size: 0.9rem; }
        .feed-empty { background: #ffffff; border: 1px dashed rgba(203,213,225,0.9); border-radius: 20px; padding: 60px 32px; text-align: center; color: #94a3b8; font-family: sans-serif; }
        .paper-card { background: #ffffff; border: 1px solid rgba(203,213,225,0.8); border-radius: 20px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); overflow: hidden; transition: all 0.22s ease; position: relative; }
        .paper-card:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.09); }
        .paper-card-header { padding: 28px 32px; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
        .paper-card-header-top { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 8px; flex-wrap: wrap; }
        .paper-novelty { font-size: 11px; font-family: monospace; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; padding: 4px 12px; border-radius: 100px; }
        .paper-card-actions { display: flex; align-items: center; gap: 6px; }
        .bookmark-btn { background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 8px; font-size: 18px; line-height: 1; transition: transform 0.15s; color: #cbd5e1; }
        .bookmark-btn:hover { transform: scale(1.2); }
        .bookmark-btn.active { color: #f59e0b; }
        .compare-check { width: 16px; height: 16px; cursor: pointer; accent-color: #6366f1; }
        .action-btn { background: none; border: 1px solid #e2e8f0; cursor: pointer; padding: 4px 10px; border-radius: 8px; font-size: 11px; font-family: monospace; font-weight: 700; color: #64748b; transition: all 0.2s; white-space: nowrap; }
        .action-btn:hover { border-color: #6366f1; color: #6366f1; }
        .action-btn.active { border-color: #10b981; color: #10b981; background: rgba(16,185,129,0.06); }
        .paper-title { font-size: 1.15rem; font-weight: 700; color: #1e293b; line-height: 1.4; margin: 0; font-family: sans-serif; text-decoration: none; transition: color 0.2s; }
        .paper-title:hover { color: #6366f1; }
        .paper-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .paper-tag { font-size: 11px; font-family: monospace; font-weight: 600; padding: 4px 10px; border-radius: 8px; }
        .paper-card-body { padding: 24px 32px; background: #fafbfc; display: flex; flex-direction: column; gap: 20px; }
        .paper-section-label { font-size: 10px; font-family: monospace; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #94a3b8; margin: 0 0 8px; }
        .paper-section-text { font-size: 0.855rem; color: #475569; font-family: sans-serif; line-height: 1.65; margin: 0; }
        .paper-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        @media (max-width: 600px) { .paper-grid { grid-template-columns: 1fr; } .paper-card-header, .paper-card-body { padding: 20px; } }
        .paper-trend-box { background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.15); border-radius: 12px; padding: 14px; font-size: 0.855rem; color: #4f46e5; font-family: sans-serif; line-height: 1.6; margin: 0; }
        .paper-summary { border-top: 1px solid #f1f5f9; padding-top: 20px; }
        .collapsible-section { border-top: 1px solid #f1f5f9; padding-top: 16px; }
        .collapsible-toggle { background: none; border: none; cursor: pointer; font-family: monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; padding: 0; display: flex; align-items: center; gap: 6px; transition: color 0.2s; }
        .collapsible-toggle:hover { color: #6366f1; }
        .notes-textarea { width: 100%; margin-top: 10px; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0; font-family: sans-serif; font-size: 0.84rem; color: #1e293b; background: #f8fafc; resize: vertical; outline: none; box-sizing: border-box; transition: border-color 0.2s; min-height: 80px; }
        .notes-textarea:focus { border-color: #6366f1; background: #fff; }
        .notes-char-count { font-size: 11px; color: #94a3b8; font-family: monospace; text-align: right; margin-top: 4px; }
        .similar-paper-item { padding: 10px 14px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; margin-top: 8px; }
        .trend-card { background: linear-gradient(135deg, rgba(99,102,241,0.05), rgba(99,102,241,0.02)); border: 1px solid rgba(99,102,241,0.2); border-radius: 20px; padding: 28px 32px; box-shadow: 0 2px 12px rgba(99,102,241,0.06); }
        .compare-bar { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); z-index: 100; background: #1e293b; color: #fff; border-radius: 100px; padding: 14px 24px; box-shadow: 0 8px 32px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 16px; font-family: sans-serif; font-size: 0.875rem; animation: slideUp 0.25s ease; }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .load-more-btn { align-self: center; padding: 10px 32px; border-radius: 100px; border: 1px solid rgba(203,213,225,0.9); background: #fff; font-family: sans-serif; font-size: 0.875rem; font-weight: 600; color: #475569; cursor: pointer; transition: all 0.2s; }
        .load-more-btn:hover { border-color: #6366f1; color: #6366f1; }
        .load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .has-note-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; font-family: monospace; color: #a855f7; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="feed-dot-bg" />

      <div className="feed-wrapper">
        <div className="feed-inner">

          <Link to="/" className="feed-back-link">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Hub
          </Link>

          {/* Header */}
          <div className="feed-header-card">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div className="feed-badge" style={{ background: accentLight, border: `1px solid ${accentBorder}` }}>
                <span style={{ color: accent }}>
                  {isAuthor ? 'Author Watchlist' : isArxiv ? 'ArXiv Direct Feed' : 'Global Trends'}
                </span>
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
                background: `linear-gradient(135deg, ${accent}, ${accentGradient})`,
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
                `Run ${isAuthor ? 'Watchlist' : isArxiv ? 'ArXiv' : 'Global'} Agent Now`
              )}
            </button>
          </div>

          {/* Feature 5: Trend summary card */}
          {trendSummary && (
            <div className="trend-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#6366f1' }}>
                    Trend Summary
                  </span>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8', fontFamily: 'sans-serif' }}>
                    {trendSummary.paper_count} papers analyzed · {trendSummary.created_at ? new Date(trendSummary.created_at).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151', fontFamily: 'sans-serif', lineHeight: 1.7 }}>
                {trendSummary.summary}
              </p>
            </div>
          )}

          {/* Filter bar */}
          <div className="filter-bar">
            <input
              className="filter-input"
              type="text"
              placeholder="Search title, innovation, problem…"
              value={search}
              onChange={handleSearchChange}
            />
            <input
              className="filter-input"
              type="text"
              placeholder="Category (e.g. Offline RL)"
              value={category}
              onChange={handleCategoryChange}
              style={{ maxWidth: 200 }}
            />
            <select
              className="filter-select"
              value={minNovelty}
              onChange={e => setMinNovelty(Number(e.target.value))}
              title="Minimum novelty score"
            >
              <option value={0}>All novelty</option>
              <option value={5}>5+ novelty</option>
              <option value={7}>7+ novelty</option>
              <option value={9}>9+ novelty</option>
            </select>
          </div>

          {/* Content */}
          {loading ? (
            <div className="feed-loading">Loading database…</div>
          ) : visiblePapers.length === 0 ? (
            <div className="feed-empty">No papers match your filters.</div>
          ) : (
            <>
              {visiblePapers.map((paper) => (
                <div key={paper.arxiv_id} className="paper-card">

                  <div className="paper-card-header">
                    <div className="paper-card-header-top">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          className="paper-novelty"
                          style={{ background: accentLight, color: accent, border: `1px solid ${accentBorder}` }}
                        >
                          Novelty {paper.novelty_score}/10
                        </span>
                        {/* Feature 3: Citation badge */}
                        {renderCitationBadge(paper)}
                        {/* Feature 17: Has-note indicator */}
                        {paper.has_note && (
                          <span className="has-note-badge">✏️ note</span>
                        )}
                        {/* Feature 16: Deep analyzed badge */}
                        {paper.deep_analysis && (
                          <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)' }}>
                            PDF Deep Analyzed
                          </span>
                        )}
                      </div>

                      <div className="paper-card-actions">
                        {/* Feature 9: Compare checkbox */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 11, fontFamily: 'sans-serif', color: '#94a3b8' }} title="Add to comparison">
                          <input
                            type="checkbox"
                            className="compare-check"
                            checked={compareIds.has(paper.arxiv_id)}
                            onChange={() => toggleCompare(paper.arxiv_id)}
                          />
                          <span>Compare</span>
                        </label>
                        {/* Feature 15: BibTeX Cite */}
                        <button
                          className={`action-btn ${citedPaper === paper.arxiv_id ? 'active' : ''}`}
                          onClick={() => handleCite(paper)}
                          title="Copy BibTeX"
                        >
                          {citedPaper === paper.arxiv_id ? '✓ Copied!' : 'Cite'}
                        </button>
                        {/* Feature 19: Bookmark */}
                        <button
                          className={`bookmark-btn ${bookmarkIds.has(paper.arxiv_id) ? 'active' : ''}`}
                          onClick={() => toggleBookmark(paper.arxiv_id)}
                          title={bookmarkIds.has(paper.arxiv_id) ? 'Remove bookmark' : 'Bookmark this paper'}
                        >
                          {bookmarkIds.has(paper.arxiv_id) ? '★' : '☆'}
                        </button>
                      </div>
                    </div>

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
                      {/* Feature 11: Author links */}
                      {(paper.authors || []).slice(0, 3).map((author) => (
                        <Link
                          key={author}
                          to={`/author/${encodeURIComponent(author)}`}
                          className="paper-tag"
                          style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', textDecoration: 'none' }}
                        >
                          {author}
                        </Link>
                      ))}
                      <span className="paper-tag" style={{ background: 'rgba(245,158,11,0.08)', color: '#b45309', border: '1px solid rgba(245,158,11,0.2)' }}>
                        🏛️ {paper.institutions?.length > 0 ? paper.institutions.join(', ') : 'Institute Unlisted'}
                      </span>
                    </div>
                  </div>

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

                    {(paper.summary || paper.turkish_summary) && (
                      <div className="paper-summary">
                        <p className="paper-section-label">Summary</p>
                        <p className="paper-section-text">{paper.summary || paper.turkish_summary}</p>
                      </div>
                    )}

                    {/* Feature 16: Deep Analyze button */}
                    {!paper.deep_analysis && !paper._deepStarted && (
                      <div className="collapsible-section">
                        <button
                          className="action-btn"
                          onClick={() => handleDeepAnalyze(paper.arxiv_id)}
                          disabled={deepAnalyzing[paper.arxiv_id]}
                          style={{ fontSize: 11, padding: '6px 14px' }}
                        >
                          {deepAnalyzing[paper.arxiv_id] ? '⏳ Analyzing PDF…' : '🔬 Deep Analyze (PDF)'}
                        </button>
                      </div>
                    )}

                    {/* Feature 2: Similar Papers */}
                    <div className="collapsible-section">
                      <button className="collapsible-toggle" onClick={() => toggleSimilar(paper.arxiv_id)}>
                        <span>{expandedSimilar[paper.arxiv_id] ? '▾' : '▸'}</span>
                        Similar Papers
                      </button>
                      {expandedSimilar[paper.arxiv_id] && (
                        <div style={{ marginTop: 10 }}>
                          {loadingSimilar[paper.arxiv_id] ? (
                            <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'sans-serif' }}>Finding similar papers…</p>
                          ) : (similarPapers[paper.arxiv_id] || []).length === 0 ? (
                            <p style={{ fontSize: 13, color: '#94a3b8', fontFamily: 'sans-serif' }}>No similar papers found. Run the agent to generate embeddings.</p>
                          ) : (
                            (similarPapers[paper.arxiv_id] || []).map(sp => (
                              <div key={sp.arxiv_id} className="similar-paper-item">
                                <a href={sp.pdf_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', textDecoration: 'none', display: 'block', marginBottom: 4 }}>
                                  {sp.title}
                                </a>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#6366f1' }}>
                                    Novelty {sp.novelty_score}/10
                                  </span>
                                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94a3b8' }}>
                                    {sp.rl_category}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Feature 17: Notes */}
                    <div className="collapsible-section">
                      <button className="collapsible-toggle" onClick={() => toggleNotes(paper.arxiv_id)}>
                        <span>{expandedNotes[paper.arxiv_id] ? '▾' : '▸'}</span>
                        Notes
                        {paper.has_note && <span style={{ color: '#a855f7', marginLeft: 4 }}>✏️</span>}
                      </button>
                      {expandedNotes[paper.arxiv_id] && (
                        <div>
                          <textarea
                            className="notes-textarea"
                            placeholder="Write your notes about this paper…"
                            value={notes[paper.arxiv_id] ?? ''}
                            onChange={e => handleNoteChange(paper.arxiv_id, e.target.value)}
                          />
                          <p className="notes-char-count">
                            {(notes[paper.arxiv_id] ?? '').length} characters · Auto-saved
                          </p>
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              ))}

              {hasMore && !search && !category && (
                <button
                  className="load-more-btn"
                  disabled={loadingMore}
                  onClick={() => fetchPapers({ append: true })}
                >
                  {loadingMore ? 'Loading…' : 'Load more papers'}
                </button>
              )}
            </>
          )}

        </div>
      </div>

      {/* Feature 9: Floating comparison bar */}
      {compareIds.size >= 2 && (
        <div className="compare-bar">
          <span>{compareIds.size} papers selected</span>
          <button
            onClick={handleCompare}
            style={{
              background: '#6366f1', color: '#fff', border: 'none',
              borderRadius: 100, padding: '8px 20px', fontFamily: 'sans-serif',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Compare {compareIds.size} Papers →
          </button>
          <button
            onClick={() => setCompareIds(new Set())}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.3)',
              color: '#94a3b8', borderRadius: 100, padding: '6px 14px',
              fontFamily: 'sans-serif', fontSize: '0.8rem', cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      )}
    </>
  );
}

export default PaperFeed;
