import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import PaperFeed from './PaperFeed';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={<Home />} />
        
        {/* The Two Dynamic Feeds */}
        <Route 
          path="/latest" 
          element={<PaperFeed feedType="general" title="Global RL Trends" subtitle="Daily curated AI research from Hugging Face." />} 
        />
        
        <Route 
          path="/authors" 
          element={<PaperFeed feedType="author" title="Author Watchlist" subtitle="The latest publications from your tracked VIP researchers." />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;