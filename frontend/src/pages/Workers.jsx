import StatusBadge from "../components/StatusBadge.jsx";
import RelativeTime from "../components/RelativeTime.jsx";
import Icon from "../components/Icon.jsx";
import { Workers } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

export default function WorkersPage() {
  const { data } = usePolling(() => Workers.list(), 3000);
  const list = data || [];
  return (
    <div className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Workers</h1>
          <div className="text-sm text-slate-500">Connected runners ready to pick up jobs.</div>
        </div>
        <div className="text-[11px] uppercase tracking-wider text-slate-500">
          {list.length} {list.length === 1 ? "node" : "nodes"}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map((w) => (
          <div key={w.id} className="panel panel-hover p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
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
                {w.public_ip && (
                  <div className="text-xs text-slate-600 font-mono">{w.public_ip}</div>
                )}
              </div>
              <StatusBadge status={w.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[10px]">ID</div>
                <div className="text-slate-200 font-mono tabular">{w.id}</div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[10px]">Last seen</div>
                <div className="text-slate-200"><RelativeTime iso={w.last_seen} /></div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[10px]">Current</div>
                <div className="text-slate-200">{w.current_job_id ? `#${w.current_job_id}` : "—"}</div>
              </div>
            </div>

            {w.capabilities && (
              <details className="mt-3 group">
                <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 flex items-center gap-1.5 select-none">
                  <Icon
                    name="cpu"
                    className="w-3 h-3 transition group-open:rotate-90"
                  />
                  Capabilities
                </summary>
                <pre className="mt-2 text-[11px] font-mono text-slate-400 bg-black/30 border border-farm-border rounded-md p-2 overflow-x-auto">
{JSON.stringify(w.capabilities, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <div className="panel p-8 text-sm text-slate-400 col-span-full text-center space-y-2">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] text-slate-500">
              <Icon name="workers" className="w-5 h-5" />
            </div>
            <div>No workers registered yet.</div>
            <div className="text-xs text-slate-500">
              Start a worker droplet (or <code className="font-mono text-slate-400">docker compose up worker</code> locally).
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
