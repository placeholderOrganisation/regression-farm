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
    <div className="panel overflow-x-auto">
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
  );
}
