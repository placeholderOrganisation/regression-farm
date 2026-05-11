import KpiCard from "../components/KpiCard.jsx";
import JobsTable from "../components/JobsTable.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import RelativeTime from "../components/RelativeTime.jsx";
import { Analytics, Jobs, Workers } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

export default function Dashboard() {
  const summary = usePolling(() => Analytics.summary(), 3000);
  const recent = usePolling(() => Jobs.list({ limit: 15 }), 3000);
  const workers = usePolling(() => Workers.list(), 5000);

  const today = summary.data?.today || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Queued" value={summary.data?.queued_now ?? "—"} accent="text-slate-200" />
        <KpiCard label="Running" value={summary.data?.running_now ?? "—"} accent="text-sky-300" />
        <KpiCard label="Passed today" value={today.PASSED ?? 0} accent="text-emerald-300" />
        <KpiCard label="Failed today" value={today.FAILED ?? 0} accent="text-rose-300" />
        <KpiCard label="Workers busy" value={`${summary.data?.workers_busy ?? 0}/${summary.data?.workers_total ?? 0}`} />
        <KpiCard label="Cancelled today" value={today.CANCELLED ?? 0} />
      </div>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-2">Workers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(workers.data || []).map((w) => (
            <div key={w.id} className="panel p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{w.name}</div>
                  <div className="text-xs text-slate-400 font-mono">{w.hostname}</div>
                </div>
                <StatusBadge status={w.status} />
              </div>
              <div className="mt-3 text-xs text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                <span>Last seen: <RelativeTime iso={w.last_seen} /></span>
                <span>Current: {w.current_job_id ? `#${w.current_job_id}` : "—"}</span>
              </div>
            </div>
          ))}
          {(workers.data || []).length === 0 && (
            <div className="panel p-4 text-sm text-slate-400">No workers registered yet.</div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-slate-400 mb-2">Recent jobs</h2>
        <JobsTable jobs={recent.data?.items || []} />
      </section>
    </div>
  );
}
