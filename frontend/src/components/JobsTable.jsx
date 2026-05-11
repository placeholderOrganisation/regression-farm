import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge.jsx";
import RelativeTime from "./RelativeTime.jsx";

export default function JobsTable({ jobs }) {
  if (!jobs || jobs.length === 0) {
    return (
      <div className="panel p-6 text-slate-400 text-sm">No jobs to show.</div>
    );
  }
  return (
    <>
      <div className="hidden sm:block panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/40 text-left text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Image</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Worker</th>
              <th className="px-4 py-2">Queued</th>
              <th className="px-4 py-2">Finished</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-farm-border">
            {jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-900/30">
                <td className="px-4 py-2">
                  <Link to={`/jobs/${j.id}`} className="text-sky-400 hover:underline">
                    #{j.id}
                  </Link>
                </td>
                <td className="px-4 py-2">{j.name}</td>
                <td className="px-4 py-2 text-slate-300 font-mono text-xs">{j.image}</td>
                <td className="px-4 py-2"><StatusBadge status={j.status} /></td>
                <td className="px-4 py-2 text-slate-300">{j.worker_id ?? "—"}</td>
                <td className="px-4 py-2 text-slate-400"><RelativeTime iso={j.queued_at} /></td>
                <td className="px-4 py-2 text-slate-400"><RelativeTime iso={j.finished_at} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="sm:hidden space-y-2">
        {jobs.map((j) => (
          <li key={j.id} className="panel p-3">
            <div className="flex items-center justify-between gap-2">
              <Link to={`/jobs/${j.id}`} className="text-sky-400 hover:underline font-medium">
                #{j.id}
              </Link>
              <StatusBadge status={j.status} />
            </div>
            <div className="mt-1 text-sm font-medium text-slate-100">{j.name}</div>
            <div className="text-xs text-slate-400 font-mono break-all">{j.image}</div>
            <div className="mt-2 text-xs text-slate-500 flex flex-wrap justify-between gap-x-3 gap-y-1">
              <span>Worker {j.worker_id ?? "—"}</span>
              <span>Queued <RelativeTime iso={j.queued_at} /></span>
              <span>Finished <RelativeTime iso={j.finished_at} /></span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
