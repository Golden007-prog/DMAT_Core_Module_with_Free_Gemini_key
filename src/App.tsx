import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useThemeStore, applyThemeClass } from './state/themeStore';
import TopBar from './ui/shell/TopBar';
import Footer from './ui/shell/Footer';
import Home from './ui/screens/Home';
import Runner from './ui/screens/Runner';
import Results from './ui/screens/Results';
import Review from './ui/screens/Review';
import History from './ui/screens/History';
import Analytics from './ui/screens/Analytics';
import Learn from './ui/screens/Learn';
import Settings from './ui/screens/Settings';

export default function App() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => applyThemeClass(theme), [theme]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-6 sm:px-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/run" element={<Runner />} />
          <Route path="/results/:sessionId" element={<Results />} />
          <Route path="/review/:sessionId" element={<Review />} />
          <Route path="/history" element={<History />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
