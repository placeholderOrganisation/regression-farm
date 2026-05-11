import { useState } from "react";
import JobsTable from "../components/JobsTable.jsx";
import { Jobs } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

const STATUSES = ["QUEUED", "RUNNING", "PASSED", "FAILED", "TIMED_OUT", "CANCELLED"];

export default function JobsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [imageFilter, setImageFilter] = useState("");

  const params = {};
  if (statusFilter) params.status = statusFilter;
  if (imageFilter) params.image = imageFilter;
  params.limit = 200;

  const { data } = usePolling(() => Jobs.list(params), 3000);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <label className="text-sm text-slate-400">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-full sm:w-auto"
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 sm:ml-2">
          <label className="text-sm text-slate-400">Image contains</label>
          <input
            value={imageFilter}
            onChange={(e) => setImageFilter(e.target.value)}
            placeholder="e.g. flaky"
            className="input w-full sm:w-auto"
          />
        </div>
        <span className="text-xs text-slate-400 sm:ml-auto">
          {data?.total ?? 0} total
        </span>
      </div>
      <JobsTable jobs={data?.items || []} />
    </div>
  );
}
