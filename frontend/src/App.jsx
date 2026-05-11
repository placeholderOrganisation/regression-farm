import { useEffect, useState } from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import JobsPage from "./pages/Jobs.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import WorkersPage from "./pages/Workers.jsx";
import SchedulesPage from "./pages/Schedules.jsx";
import AnalyticsPage from "./pages/Analytics.jsx";
import Sidebar, { NAV_ITEMS, NavItem } from "./components/Sidebar.jsx";
import Icon from "./components/Icon.jsx";

function MobileTopBar({ menuOpen, setMenuOpen }) {
  return (
    <header className="md:hidden sticky top-0 z-30 border-b border-farm-border bg-farm-panel/80 backdrop-blur">
      <div className="px-3 sm:px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-cyan-600 grid place-items-center font-bold text-white shadow-glow">
            RF
          </div>
          <div className="text-sm font-semibold tracking-tight">Regression Farm</div>
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-farm-border text-slate-200 hover:bg-white/[0.05] transition"
        >
          <Icon name={menuOpen ? "close" : "menu"} className="w-5 h-5" />
        </button>
      </div>
      {menuOpen && (
        <nav className="border-t border-farm-border bg-farm-panel/95 backdrop-blur animate-fadeIn">
          <div className="px-2 py-2 flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} onClick={() => setMenuOpen(false)} />
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      <Sidebar />
      <div className="flex flex-col min-w-0">
        <MobileTopBar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-4 sm:py-6 md:py-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/workers" element={<WorkersPage />} />
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
