import KpiCard from "../components/KpiCard.jsx";
import JobsTable from "../components/JobsTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import RelativeTime from "../components/RelativeTime.jsx";
import Icon from "../components/Icon.jsx";
import { Analytics, Jobs, Workers } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

function SectionHeader({ icon, title, hint }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="flex items-center gap-2 section-title">
        {icon && <Icon name={icon} className="w-3.5 h-3.5" />}
        <span>{title}</span>
      </div>
      <div className="flex-1 border-t border-farm-border/60" />
      {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
    </div>
  );
}

export default function Dashboard() {
  const summary = usePolling(() => Analytics.summary(), 3000);
  const recent = usePolling(() => Jobs.list({ limit: 15 }), 3000);
  const workers = usePolling(() => Workers.list(), 5000);

  const today = summary.data?.today || {};
  const yesterday = summary.data?.yesterday || {};
  const delta = (key) => {
    if (today[key] == null || yesterday[key] == null) return null;
    return today[key] - yesterday[key];
  };

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-farm-muted flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulseDot" />
            live
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Overview</h1>
          <div className="text-sm text-slate-500">A real-time look at the regression cluster.</div>
        </div>
      </header>

      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Queued"
            value={summary.data?.queued_now ?? "—"}
            tone="slate"
            icon="hourglass"
          />
          <KpiCard
            label="Running"
            value={summary.data?.running_now ?? "—"}
            tone="sky"
            icon="spinner"
            accent="text-sky-200"
          />
          <KpiCard
            label="Passed today"
            value={today.PASSED ?? 0}
            tone="emerald"
            icon="check"
            accent="text-emerald-200"
            delta={delta("PASSED")}
            deltaSuffix=" vs yesterday"
          />
          <KpiCard
            label="Failed today"
            value={today.FAILED ?? 0}
            tone="rose"
            icon="x"
            accent="text-rose-200"
            delta={delta("FAILED")}
            deltaSuffix=" vs yesterday"
          />
          <KpiCard
            label="Workers busy"
            value={`${summary.data?.workers_busy ?? 0}/${summary.data?.workers_total ?? 0}`}
            tone="sky"
            icon="cpu"
          />
          <KpiCard
            label="Cancelled today"
            value={today.CANCELLED ?? 0}
            tone="amber"
            icon="slash"
            delta={delta("CANCELLED")}
            deltaSuffix=" vs yesterday"
          />
        </div>
      </section>

      <section>
        <SectionHeader icon="workers" title="Workers" hint={`${(workers.data || []).length} registered`} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(workers.data || []).map((w) => (
            <div key={w.id} className="panel panel-hover p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        w.status === "BUSY"
                          ? "bg-sky-400 animate-pulseDot"
                          : w.status === "IDLE"
                          ? "bg-emerald-400"
                          : "bg-slate-500"
                      }`}
                    />
                    <div className="font-semibold text-slate-100 truncate">{w.name}</div>
                  </div>
                  <div className="text-xs text-slate-500 font-mono truncate">{w.hostname}</div>
                </div>
                <StatusBadge status={w.status} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                <div>
                  <div className="text-slate-500">Last seen</div>
                  <div className="text-slate-200"><RelativeTime iso={w.last_seen} /></div>
                </div>
                <div>
                  <div className="text-slate-500">Current</div>
                  <div className="text-slate-200">{w.current_job_id ? `#${w.current_job_id}` : "—"}</div>
                </div>
              </div>
            </div>
          ))}
          {(workers.data || []).length === 0 && (
            <div className="panel p-6 text-sm text-slate-400 col-span-full text-center">
              No workers registered yet.
            </div>
          )}
        </div>
      </section>

      <section>
        <SectionHeader icon="jobs" title="Recent jobs" hint="auto-refresh 3s" />
        <JobsTable jobs={recent.data?.items || []} />
      </section>
    </div>
  );
}
