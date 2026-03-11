import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import PaperFeed from './PaperFeed';
import Discovery from './Discovery';
import ErrorBoundary from './ErrorBoundary';
import Kanban from './Kanban';
import Compare from './Compare';
import Timeline from './Timeline';
import AuthorProfile from './AuthorProfile';
import Settings from './Settings';
import Feeds from './Feeds';

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/latest" element={<PaperFeed feedType="general" title="Global RL Trends" subtitle="Daily curated AI research from Hugging Face." />} />
          <Route path="/authors" element={<PaperFeed feedType="author" title="Author Watchlist" subtitle="The latest publications from your tracked VIP researchers." />} />
          {/* Feature 4: Direct ArXiv feed */}
          <Route path="/arxiv" element={<PaperFeed feedType="arxiv" title="ArXiv Direct Feed" subtitle="Latest papers from cs.LG, cs.AI, and cs.RO categories." />} />
          <Route path="/discover" element={<ErrorBoundary><Discovery /></ErrorBoundary>} />
          {/* Feature 8: Kanban reading board */}
          <Route path="/kanban" element={<Kanban />} />
          {/* Feature 9: Paper comparison */}
          <Route path="/compare" element={<Compare />} />
          {/* Feature 10: Timeline */}
          <Route path="/timeline" element={<Timeline />} />
          {/* Feature 11: Author profile */}
          <Route path="/author/:authorName" element={<AuthorProfile />} />
          {/* Feature 12: Settings */}
          <Route path="/settings" element={<Settings />} />
          {/* Feature 13: Custom feeds */}
          <Route path="/feeds" element={<Feeds />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
