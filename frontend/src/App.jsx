import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import PaperFeed from './PaperFeed';
import Discovery from './Discovery';
import ErrorBoundary from './ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/latest" element={<PaperFeed feedType="general" title="Global RL Trends" subtitle="Daily curated AI research from Hugging Face." />} />
          <Route path="/authors" element={<PaperFeed feedType="author" title="Author Watchlist" subtitle="The latest publications from your tracked VIP researchers." />} />
          <Route path="/discover" element={<ErrorBoundary><Discovery /></ErrorBoundary>} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;