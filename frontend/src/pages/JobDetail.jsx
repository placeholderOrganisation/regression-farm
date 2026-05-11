import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StatusBadge from "../components/StatusBadge.jsx";
import RelativeTime from "../components/RelativeTime.jsx";
import { Jobs } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

const TERMINAL = new Set(["PASSED", "FAILED", "TIMED_OUT", "CANCELLED"]);

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job } = usePolling(() => Jobs.get(id), 2500);
  const [logText, setLogText] = useState("");
  const [logSize, setLogSize] = useState(0);
  const offsetRef = useRef(0);
  const preRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const fetchLog = async () => {
      try {
        const r = await Jobs.getLog(id, offsetRef.current);
        if (cancelled) return;
        if (r.data) {
          setLogText((prev) => prev + r.data);
          offsetRef.current = r.size;
        }
        setLogSize(r.size);
        if (preRef.current) {
          preRef.current.scrollTop = preRef.current.scrollHeight;
        }
      } catch {
        // ignore transient errors
      } finally {
        if (!cancelled) timer = setTimeout(fetchLog, 1500);
      }
    };
    fetchLog();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  if (!job) return <div className="text-slate-400">Loading job #{id}…</div>;

  const tr = job.test_run;

  const cancel = async () => {
    if (!confirm(`Cancel job #${job.id}?`)) return;
    await Jobs.cancel(job.id);
  };
  const rerun = async () => {
    const j = await Jobs.rerun(job.id);
    navigate(`/jobs/${j.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs text-slate-400 flex items-center gap-2 flex-wrap">
            <span>Job #{job.id}</span>
            <span className="sm:hidden"><StatusBadge status={job.status} /></span>
          </div>
          <h1 className="text-xl font-semibold break-words">{job.name}</h1>
          <div className="text-sm text-slate-400 font-mono break-all">{job.image}</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden sm:inline-flex"><StatusBadge status={job.status} /></span>
          {!TERMINAL.has(job.status) && (
            <button onClick={cancel} className="btn-danger">Cancel</button>
          )}
          <button onClick={rerun} className="btn">Re-run</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="panel p-4">
          <div className="text-xs uppercase text-slate-400">Timing</div>
          <div className="mt-2 text-sm space-y-1">
            <div>Queued: <RelativeTime iso={job.queued_at} /></div>
            <div>Started: <RelativeTime iso={job.started_at} /></div>
            <div>Finished: <RelativeTime iso={job.finished_at} /></div>
            <div>Timeout: {job.timeout_seconds}s</div>
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-xs uppercase text-slate-400">Execution</div>
          <div className="mt-2 text-sm space-y-1">
            <div>Worker: {job.worker?.name ?? "—"}</div>
            <div>Exit code: {job.exit_code ?? "—"}</div>
            <div className="text-rose-300 break-words">{job.failure_reason}</div>
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-xs uppercase text-slate-400">Test results</div>
          {tr ? (
            <div className="mt-2 text-sm space-y-1">
              <div>Total: {tr.total_tests ?? "—"}</div>
              <div className="text-emerald-300">Passed: {tr.passed ?? 0}</div>
              <div className="text-rose-300">Failed: {tr.failed ?? 0}</div>
              <div className="text-amber-300">Skipped: {tr.skipped ?? 0}</div>
              <div>Duration: {tr.duration_seconds ? `${tr.duration_seconds.toFixed(1)}s` : "—"}</div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-slate-400">No parsed results yet.</div>
          )}
        </div>
      </div>

      {job.artifacts?.length > 0 && (
        <div className="panel p-4">
          <div className="text-xs uppercase text-slate-400 mb-2">Artifacts ({job.artifacts.length})</div>
          <ul className="text-sm divide-y divide-farm-border">
            {job.artifacts.map((a) => (
              <li key={a.id} className="py-1 flex flex-wrap justify-between gap-x-3">
                <span className="font-mono text-slate-300 break-all">{a.name}</span>
                <span className="text-slate-500 shrink-0">{a.size_bytes} bytes</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel p-0 overflow-hidden">
        <div className="px-4 py-2 border-b border-farm-border flex items-center justify-between text-xs uppercase text-slate-400">
          <span>Log stream</span>
          <span className="text-slate-500">{logSize} bytes</span>
        </div>
        <pre
          ref={preRef}
          className="p-4 max-h-[28rem] overflow-auto text-xs leading-snug text-slate-200 whitespace-pre-wrap"
        >
{logText || "(awaiting output…)"}
        </pre>
      </div>
    </div>
  );
}
