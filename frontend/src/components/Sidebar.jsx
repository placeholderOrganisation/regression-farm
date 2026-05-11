import { NavLink } from "react-router-dom";
import Icon from "./Icon.jsx";
import { Analytics } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/jobs", label: "Jobs", icon: "jobs" },
  { to: "/workers", label: "Workers", icon: "workers" },
  { to: "/schedules", label: "Schedules", icon: "schedules" },
  { to: "/analytics", label: "Analytics", icon: "analytics" },
];

export function NavItem({ to, label, icon, onClick, dense = false }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-md ${
          dense ? "px-3 py-2 text-sm" : "px-3 py-2.5 text-sm"
        } transition ${
          isActive
            ? "bg-sky-500/10 text-sky-200"
            : "text-slate-300 hover:text-white hover:bg-white/[0.04]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={`absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full transition ${
              isActive ? "bg-gradient-to-b from-sky-400 to-cyan-500" : "bg-transparent"
            }`}
          />
          <Icon
            name={icon}
            className={`w-4 h-4 ${isActive ? "text-sky-300" : "text-slate-400 group-hover:text-slate-200"}`}
          />
          <span className="font-medium tracking-tight">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-3 py-4">
      <div className="relative">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-sky-400 via-sky-500 to-cyan-600 grid place-items-center font-bold text-white shadow-glow">
          RF
        </div>
        <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10 pointer-events-none" />
      </div>
      <div className="leading-tight">
        <div className="text-sm font-semibold tracking-tight text-slate-100">Regression Farm</div>
        <div className="text-[11px] text-slate-500">control plane</div>
      </div>
    </div>
  );
}

function LiveStatus() {
  const { data } = usePolling(() => Analytics.summary(), 5000);
  const busy = data?.workers_busy ?? 0;
  const total = data?.workers_total ?? 0;
  const running = data?.running_now ?? 0;
  const queued = data?.queued_now ?? 0;
  const idle = total - busy;
  const healthy = total === 0 ? false : idle >= 0;

  return (
    <div className="m-3 panel p-3 space-y-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-farm-muted">
        <span>Cluster</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              healthy ? "bg-emerald-400" : "bg-amber-400"
            } animate-pulseDot`}
          />
          {healthy ? "live" : "idle"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-slate-500">Workers</div>
          <div className="text-slate-100 tabular">
            {busy}<span className="text-slate-500">/{total}</span>
          </div>
        </div>
        <div>
          <div className="text-slate-500">Running</div>
          <div className="text-slate-100 tabular">{running}</div>
        </div>
        <div>
          <div className="text-slate-500">Queued</div>
          <div className="text-slate-100 tabular">{queued}</div>
        </div>
        <div>
          <div className="text-slate-500">Idle</div>
          <div className="text-slate-100 tabular">{Math.max(idle, 0)}</div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:sticky md:top-0 md:h-screen border-r border-farm-border bg-farm-panel/60 backdrop-blur">
      <Brand />
      <div className="px-2">
        <div className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wider text-slate-500">
          Navigate
        </div>
        <nav className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </div>
      <div className="mt-auto">
        <LiveStatus />
        <div className="px-4 pb-4 pt-1 text-[10px] text-slate-600 tracking-wider uppercase">
          v0.1.0
        </div>
      </div>
    </aside>
  );
}
