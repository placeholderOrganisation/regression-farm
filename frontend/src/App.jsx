import { NavLink, Route, Routes, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import JobsPage from "./pages/Jobs.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import WorkersPage from "./pages/Workers.jsx";
import SchedulesPage from "./pages/Schedules.jsx";
import AnalyticsPage from "./pages/Analytics.jsx";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/jobs", label: "Jobs" },
  { to: "/workers", label: "Workers" },
  { to: "/schedules", label: "Schedules" },
  { to: "/analytics", label: "Analytics" },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-farm-border bg-farm-panel">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-sky-600 grid place-items-center font-bold">RF</div>
            <h1 className="text-lg font-semibold tracking-tight">Regression Farm</h1>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded transition ${
                    isActive
                      ? "bg-sky-600/20 text-sky-300 border border-sky-700"
                      : "text-slate-300 hover:text-white hover:bg-slate-800 border border-transparent"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">
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
  );
}
