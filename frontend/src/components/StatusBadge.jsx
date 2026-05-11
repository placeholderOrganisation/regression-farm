import Icon from "./Icon.jsx";

const STYLES = {
  QUEUED: {
    cls: "bg-slate-500/15 text-slate-200 border border-slate-500/30",
    icon: "hourglass",
    pulse: false,
  },
  RUNNING: {
    cls: "bg-sky-500/15 text-sky-200 border border-sky-500/40",
    icon: "spinner",
    pulse: true,
    iconClass: "animate-spin",
  },
  PASSED: {
    cls: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40",
    icon: "check",
    pulse: false,
  },
  FAILED: {
    cls: "bg-rose-500/15 text-rose-200 border border-rose-500/40",
    icon: "x",
    pulse: false,
  },
  TIMED_OUT: {
    cls: "bg-amber-500/15 text-amber-200 border border-amber-500/40",
    icon: "clock",
    pulse: false,
  },
  CANCELLED: {
    cls: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/30",
    icon: "slash",
    pulse: false,
  },
  IDLE: {
    cls: "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40",
    icon: "dot",
    pulse: false,
  },
  BUSY: {
    cls: "bg-sky-500/15 text-sky-200 border border-sky-500/40",
    icon: "dot",
    pulse: true,
  },
};

const DEFAULT = {
  cls: "bg-slate-500/15 text-slate-200 border border-slate-500/30",
  icon: "dot",
  pulse: false,
};

export default function StatusBadge({ status }) {
  const s = STYLES[status] || DEFAULT;
  return (
    <span className={`pill ${s.cls}`}>
      <Icon
        name={s.icon}
        className={`w-3 h-3 ${s.iconClass || ""} ${s.pulse ? "animate-pulseDot" : ""}`}
      />
      <span>{status}</span>
    </span>
  );
}

export function statusTone(status) {
  switch (status) {
    case "PASSED":
    case "IDLE":
      return "emerald";
    case "FAILED":
      return "rose";
    case "RUNNING":
    case "BUSY":
      return "sky";
    case "TIMED_OUT":
      return "amber";
    case "QUEUED":
      return "slate";
    case "CANCELLED":
    default:
      return "zinc";
  }
}
