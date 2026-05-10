const COLORS = {
  QUEUED: "bg-slate-700 text-slate-200",
  RUNNING: "bg-sky-600/30 text-sky-200 border border-sky-700",
  PASSED: "bg-emerald-600/30 text-emerald-200 border border-emerald-700",
  FAILED: "bg-rose-600/30 text-rose-200 border border-rose-700",
  TIMED_OUT: "bg-amber-600/30 text-amber-200 border border-amber-700",
  CANCELLED: "bg-zinc-600/30 text-zinc-200 border border-zinc-700",
  IDLE: "bg-emerald-700/30 text-emerald-200 border border-emerald-700",
  BUSY: "bg-sky-600/30 text-sky-200 border border-sky-700",
};

export default function StatusBadge({ status }) {
  const cls = COLORS[status] || "bg-slate-700 text-slate-200";
  return <span className={`pill ${cls}`}>{status}</span>;
}
