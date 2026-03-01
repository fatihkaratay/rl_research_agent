import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [agentStatus, setAgentStatus] = useState("");

  // Fetch papers from your FastAPI backend
  const fetchPapers = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/papers");
      const data = await response.json();
      setPapers(data.papers);
    } catch (error) {
      console.error("Failed to fetch papers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Run this once when the page loads
  useEffect(() => {
    fetchPapers();
  }, []);

  // Tell the backend to run the LangGraph agent
  const triggerAgent = async () => {
    setAgentStatus("Agent is researching... (Check back in a minute)");
    try {
      await fetch("http://127.0.0.1:8000/api/research/run", { method: "POST" });
      setTimeout(() => setAgentStatus(""), 5000); // Clear message after 5s
    } catch (error) {
      setAgentStatus("Error triggering agent.");
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-lg shadow">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">RL Research Intelligence</h1>
          <p className="text-gray-500 mt-1">Automated Reinforcement Learning Paper Tracking</p>
        </div>
        <div className="text-right">
          <button 
            onClick={triggerAgent}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
          >
            Run Agent Now
          </button>
          {agentStatus && <p className="text-sm text-blue-600 mt-2 font-semibold">{agentStatus}</p>}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <p className="text-center text-xl text-gray-500 mt-20">Loading papers from MongoDB...</p>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {papers.map((paper) => (
            <div key={paper.arxiv_id} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-white-500">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  <a href={paper.pdf_url} target="_blank" rel="noreferrer" className="hover:underline">
                    {paper.title}
                  </a>
                </h2>
                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-green-400">
                  Novelty: {paper.novelty_score}/10
                </span>
              </div>
              
              <div className="flex gap-3 text-sm text-gray-500 mb-4">
                <span className="bg-gray-100 px-2 py-1 rounded">📅 {paper.published_date}</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">🏷️ {paper.rl_category}</span>
                <span>👨‍🔬 {paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? ' et al.' : ''}</span>
                <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-md border border-amber-100 flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
                  {paper.institutions && paper.institutions.length > 0 
                    ? paper.institutions.join(", ") 
                    : "Institute Unlisted"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* English Analysis */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">Key Innovation & Problem</h3>
                  <p className="text-sm text-gray-700 mb-2"><strong>Problem:</strong> {paper.problem_addressed}</p>
                  <p className="text-sm text-gray-700"><strong>Innovation:</strong> {paper.key_innovation}</p>
                  
                  <h3 className="font-bold text-gray-700 mt-4 mb-2 border-b pb-1">Trend Prediction</h3>
                  <p className="text-sm text-blue-700 italic">{paper.trend_prediction}</p>
                </div>

                {/* Turkish Summary */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-900 mb-2 border-b border-blue-200 pb-1">🇹🇷 Türkçe Özet</h3>
                  <p className="text-sm text-gray-800 leading-relaxed">{paper.turkish_summary}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;