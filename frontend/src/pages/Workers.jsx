import StatusBadge from "../components/StatusBadge.jsx";
import RelativeTime from "../components/RelativeTime.jsx";
import { Workers } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

export default function WorkersPage() {
  const { data } = usePolling(() => Workers.list(), 3000);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {(data || []).map((w) => (
        <div key={w.id} className="panel p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{w.name}</div>
              <div className="text-xs text-slate-400 font-mono">{w.hostname}</div>
              {w.public_ip && (
                <div className="text-xs text-slate-500 font-mono">{w.public_ip}</div>
              )}
            </div>
            <StatusBadge status={w.status} />
          </div>
          <div className="mt-3 text-xs text-slate-400 space-y-1">
            <div>ID: {w.id}</div>
            <div>Last seen: <RelativeTime iso={w.last_seen} /></div>
            <div>Current job: {w.current_job_id ? `#${w.current_job_id}` : "—"}</div>
            <div className="font-mono text-slate-500 truncate">caps: {JSON.stringify(w.capabilities)}</div>
          </div>
        </div>
      ))}
      {(data || []).length === 0 && (
        <div className="panel p-4 text-sm text-slate-400 col-span-3">
          No workers registered yet. Start a worker droplet (or `docker compose up worker` locally).
        </div>
      )}
    </div>
  );
}
