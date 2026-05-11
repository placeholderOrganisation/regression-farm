import { Link } from "react-router-dom";
import StatusBadge, { statusTone } from "./StatusBadge.jsx";
import RelativeTime from "./RelativeTime.jsx";

const TONE_BAR = {
  emerald: "bg-emerald-400",
  rose: "bg-rose-400",
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  slate: "bg-slate-500",
  zinc: "bg-zinc-500",
};

export default function JobsTable({ jobs }) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="panel p-8 text-center text-slate-400 text-sm">
        No jobs to show.
      </div>
    );
  }
  return (
    <>
      <div className="hidden sm:block panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-farm-panel/80 backdrop-blur text-left text-[11px] uppercase tracking-wider text-slate-400 z-10">
              <tr>
                <th className="px-4 py-2.5 font-medium">ID</th>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Image</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Worker</th>
                <th className="px-4 py-2.5 font-medium">Queued</th>
                <th className="px-4 py-2.5 font-medium">Finished</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-farm-border/60">
              {jobs.map((j) => (
                <tr key={j.id} className="hover:bg-sky-500/[0.04] transition">
                  <td className="px-4 py-2.5">
                    <Link
                      to={`/jobs/${j.id}`}
                      className="text-sky-300 hover:text-sky-200 hover:underline font-mono tabular"
                    >
                      #{j.id}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-slate-100">{j.name}</td>
                  <td className="px-4 py-2.5 text-slate-400 font-mono text-xs">{j.image}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={j.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-300 tabular">{j.worker_id ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400"><RelativeTime iso={j.queued_at} /></td>
                  <td className="px-4 py-2.5 text-slate-400"><RelativeTime iso={j.finished_at} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="sm:hidden space-y-2">
        {jobs.map((j) => {
          const tone = statusTone(j.status);
          return (
            <li key={j.id} className="panel panel-hover relative overflow-hidden p-3 pl-4">
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 w-1 ${TONE_BAR[tone] || "bg-slate-500"}`}
              />
              <div className="flex items-center justify-between gap-2">
                <Link
                  to={`/jobs/${j.id}`}
                  className="text-sky-300 hover:underline font-mono tabular font-medium"
                >
                  #{j.id}
                </Link>
                <StatusBadge status={j.status} />
              </div>
              <div className="mt-1 text-sm font-medium text-slate-100">{j.name}</div>
              <div className="text-xs text-slate-500 font-mono break-all">{j.image}</div>
              <div className="mt-2 text-xs text-slate-500 flex flex-wrap justify-between gap-x-3 gap-y-1">
                <span>Worker <span className="text-slate-300 tabular">{j.worker_id ?? "—"}</span></span>
                <span>Queued <RelativeTime iso={j.queued_at} /></span>
                <span>Finished <RelativeTime iso={j.finished_at} /></span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
