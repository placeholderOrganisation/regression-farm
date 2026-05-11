import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StatusBadge from "../components/StatusBadge.jsx";
import RelativeTime from "../components/RelativeTime.jsx";
import Icon from "../components/Icon.jsx";
import { Jobs } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

const TERMINAL = new Set(["PASSED", "FAILED", "TIMED_OUT", "CANCELLED"]);

function InfoPanel({ icon, title, children }) {
  return (
    <div className="panel p-4">
      <div className="section-title">
        {icon && <Icon name={icon} className="w-3.5 h-3.5" />}
        <span>{title}</span>
      </div>
      <div className="mt-3 text-sm space-y-1.5 text-slate-200">{children}</div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="tabular text-slate-200">{children}</span>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: job } = usePolling(() => Jobs.get(id), 2500);
  const [logText, setLogText] = useState("");
  const [logSize, setLogSize] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
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
        if (autoScroll && preRef.current) {
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
  }, [id, autoScroll]);

  if (!job) {
    return (
      <div className="panel p-8 text-center text-slate-400">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/[0.04] mb-2">
          <Icon name="spinner" className="w-5 h-5 animate-spin text-sky-300" />
        </div>
        <div>Loading job #{id}…</div>
      </div>
    );
  }

  const tr = job.test_run;

  const cancel = async () => {
    if (!confirm(`Cancel job #${job.id}?`)) return;
    await Jobs.cancel(job.id);
  };
  const rerun = async () => {
    const j = await Jobs.rerun(job.id);
    navigate(`/jobs/${j.id}`);
  };
  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-farm-muted flex items-center gap-2">
              <span>Job</span>
              <span className="text-slate-300 font-mono tabular">#{job.id}</span>
              <span className="sm:hidden"><StatusBadge status={job.status} /></span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100 break-words">
              {job.name}
            </h1>
            <div className="mt-1 text-sm text-slate-500 font-mono break-all">{job.image}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden sm:inline-flex"><StatusBadge status={job.status} /></span>
            {!TERMINAL.has(job.status) && (
              <button onClick={cancel} className="btn-danger">
                <Icon name="x" className="w-3.5 h-3.5" />
                Cancel
              </button>
            )}
            <button onClick={rerun} className="btn">
              <Icon name="spinner" className="w-3.5 h-3.5" />
              Re-run
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <InfoPanel icon="clock" title="Timing">
          <Row label="Queued"><RelativeTime iso={job.queued_at} /></Row>
          <Row label="Started"><RelativeTime iso={job.started_at} /></Row>
          <Row label="Finished"><RelativeTime iso={job.finished_at} /></Row>
          <Row label="Timeout">{job.timeout_seconds}s</Row>
        </InfoPanel>
        <InfoPanel icon="cpu" title="Execution">
          <Row label="Worker">{job.worker?.name ?? "—"}</Row>
          <Row label="Exit code">{job.exit_code ?? "—"}</Row>
          {job.failure_reason && (
            <div className="pt-1 text-xs text-rose-300 break-words">{job.failure_reason}</div>
          )}
        </InfoPanel>
        <InfoPanel icon="check" title="Test results">
          {tr ? (
            <>
              <Row label="Total">{tr.total_tests ?? "—"}</Row>
              <Row label="Passed">
                <span className="text-emerald-300">{tr.passed ?? 0}</span>
              </Row>
              <Row label="Failed">
                <span className="text-rose-300">{tr.failed ?? 0}</span>
              </Row>
              <Row label="Skipped">
                <span className="text-amber-300">{tr.skipped ?? 0}</span>
              </Row>
              <Row label="Duration">
                {tr.duration_seconds ? `${tr.duration_seconds.toFixed(1)}s` : "—"}
              </Row>
            </>
          ) : (
            <div className="text-sm text-slate-500">No parsed results yet.</div>
          )}
        </InfoPanel>
      </div>

      {job.artifacts?.length > 0 && (
        <div className="panel p-4">
          <div className="section-title mb-2">
            <Icon name="archive" className="w-3.5 h-3.5" />
            <span>Artifacts ({job.artifacts.length})</span>
          </div>
          <ul className="text-sm divide-y divide-farm-border/60">
            {job.artifacts.map((a) => (
              <li key={a.id} className="py-2 flex flex-wrap justify-between gap-x-3 items-center">
                <span className="font-mono text-slate-300 break-all">{a.name}</span>
                <span className="text-slate-500 tabular shrink-0">{a.size_bytes} bytes</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="panel p-0 overflow-hidden">
        <div className="px-4 py-2.5 border-b border-farm-border/60 flex items-center justify-between gap-3 bg-farm-panel/80 backdrop-blur">
          <div className="section-title">
            <Icon name="pulse" className="w-3.5 h-3.5 text-sky-300" />
            <span>Log stream</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 tabular">{logSize.toLocaleString()} bytes</span>
            <label className="text-[11px] text-slate-400 inline-flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="accent-sky-500 w-3 h-3"
              />
              Auto-scroll
            </label>
            <button onClick={copyLog} className="btn-ghost" type="button">
              <Icon name="copy" className="w-3.5 h-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <pre
          ref={preRef}
          className="p-4 max-h-[28rem] overflow-auto font-mono text-[12.5px] leading-relaxed text-slate-200 whitespace-pre-wrap bg-black/40"
        >
{logText || (
  <span className="text-slate-500">(awaiting output…)</span>
)}
        </pre>
      </div>
    </div>
  );
}
