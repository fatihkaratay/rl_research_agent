import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';

function Discovery() {
  const [currentAuthor, setCurrentAuthor] = useState(""); 
  const [graphData, setGraphData] = useState({ nodes: [], links: [], papers: [] });
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Ref to manipulate the graph camera if needed
  const fgRef = useRef();

  useEffect(() => {
    const fetchInitialAuthor = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/config");
        const data = await response.json();
        setCurrentAuthor(data.discovery_author);
      } catch (error) {
        console.error("Failed to load config from backend:", error);
        setCurrentAuthor("Abhishek Cauligi"); // Safe fallback if API fails
      }
    };
    fetchInitialAuthor();
  }, []);

  const fetchGraph = async (author, force = false) => {
    if (!author) return; // Prevent it from running before the config loads
    
    force ? setIsUpdating(true) : setLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/discover/${encodeURIComponent(author)}?force_update=${force}`);
      const data = await response.json();
      setGraphData(data);
      
      // Update the title to the exact formatted name from Semantic Scholar
      if (data.display_name) setCurrentAuthor(data.display_name);
    } catch (error) {
      console.error("Failed to fetch graph:", error);
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  // Run when the author changes
  useEffect(() => {
    if (currentAuthor) {
      fetchGraph(currentAuthor);
    }
  }, [currentAuthor]);

  // Handle clicking a node to traverse the graph
  const handleNodeClick = useCallback(node => {
    if (node.id !== currentAuthor) {
      setCurrentAuthor(node.id);
    }
  }, [currentAuthor]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 font-sans">
      
      {/* HEADER BAR */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm mr-4">← Back to Hub</Link>
          <div className="bg-purple-100 text-purple-700 p-2 rounded-lg">🕸️</div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">Collaboration Network</h1>
            <p className="text-xs text-slate-500 font-medium">Currently Exploring: <span className="text-purple-600 font-bold">{currentAuthor}</span></p>
          </div>
        </div>

        <button 
          onClick={() => fetchGraph(currentAuthor, true)}
          disabled={isUpdating}
          className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-lg text-sm font-bold transition-colors"
        >
          {isUpdating ? 'Syncing...' : '↻ Force Update Network'}
        </button>
      </div>

      {loading ? (
        <div className="flex-grow flex items-center justify-center text-slate-400">Loading Network Physics...</div>
      ) : (
        <div className="flex flex-col flex-grow overflow-hidden">
          
          {/* TOP HALF: THE INTERACTIVE GRAPH */}
          <div className="h-1/2 w-full bg-slate-900 relative border-b-4 border-slate-200">
            {/* Overlay hint */}
            <div className="absolute top-4 left-4 text-white/50 text-xs pointer-events-none z-10 bg-black/20 p-2 rounded">
              Scroll to zoom. Drag to pan. Click a node to explore their network.
            </div>
            
            <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              nodeLabel="id"
              nodeColor={node => node.id === currentAuthor ? '#a855f7' : '#6366f1'} // Purple for center, Indigo for others
              nodeRelSize={4} // Multiplier for the 'val' we set in Python
              linkColor={() => 'rgba(255,255,255,0.2)'}
              linkWidth={link => Math.min(link.value, 5)} // Thicker lines for more collaborations
              onNodeClick={handleNodeClick}
              width={window.innerWidth}
              height={window.innerHeight / 2 - 80} // Rough calculation for half screen minus header
            />
          </div>

          {/* BOTTOM HALF: THE PAPER LIST */}
          <div className="h-1/2 w-full overflow-y-auto bg-slate-50 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 sticky top-0 bg-slate-50 py-2 border-b border-slate-200">
              Published Works ({graphData.papers.length})
            </h2>
            
            <div className="flex flex-col gap-4 max-w-5xl mx-auto">
              {graphData.papers.map((paper, idx) => (
                <a 
                  key={idx} 
                  href={paper.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left block"
                >
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <h3 className="text-md font-bold text-slate-900 leading-snug">{paper.title}</h3>
                    <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      📅 {paper.year}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {paper.authors.join(", ")}
                  </p>
                </a>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default Discovery;