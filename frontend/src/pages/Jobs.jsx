import { useState } from "react";
import JobsTable from "../components/JobsTable.jsx";
import Icon from "../components/Icon.jsx";
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
    <div className="space-y-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Jobs</h1>
          <div className="text-sm text-slate-500">All queued, running, and completed regression jobs.</div>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-slate-500 tabular">
          {data?.total ?? 0} total
        </span>
      </header>

      <div className="panel p-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <label className="text-[11px] uppercase tracking-wider text-farm-muted">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-full sm:w-44"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <label className="text-[11px] uppercase tracking-wider text-farm-muted">Image contains</label>
            <div className="relative">
              <Icon
                name="jobs"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
              />
              <input
                value={imageFilter}
                onChange={(e) => setImageFilter(e.target.value)}
                placeholder="e.g. flaky"
                className="input w-full pl-8"
              />
            </div>
          </div>
          {(statusFilter || imageFilter) && (
            <button
              type="button"
              onClick={() => { setStatusFilter(""); setImageFilter(""); }}
              className="btn-ghost self-start sm:self-end"
            >
              <Icon name="x" className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <JobsTable jobs={data?.items || []} />
    </div>
  );
}
