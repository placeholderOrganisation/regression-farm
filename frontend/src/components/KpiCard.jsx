import Icon from "./Icon.jsx";

const TONES = {
  neutral: {
    bar: "from-slate-400/40 to-slate-500/10",
    chip: "text-slate-300",
  },
  sky: {
    bar: "from-sky-400 to-cyan-500/30",
    chip: "text-sky-300",
  },
  emerald: {
    bar: "from-emerald-400 to-emerald-500/20",
    chip: "text-emerald-300",
  },
  rose: {
    bar: "from-rose-400 to-rose-500/20",
    chip: "text-rose-300",
  },
  amber: {
    bar: "from-amber-400 to-amber-500/20",
    chip: "text-amber-300",
  },
  slate: {
    bar: "from-slate-400/60 to-slate-500/10",
    chip: "text-slate-300",
  },
};

function DeltaBadge({ delta, suffix }) {
  if (delta == null || Number.isNaN(delta)) return null;
  const positive = delta > 0;
  const negative = delta < 0;
  const cls = positive
    ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20"
    : negative
    ? "text-rose-300 bg-rose-500/10 border-rose-500/20"
    : "text-slate-400 bg-slate-500/10 border-slate-500/20";
  const iconName = positive ? "arrowUp" : negative ? "arrowDown" : "dot";
  const display = `${positive ? "+" : ""}${delta}`;
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-medium tabular ${cls}`}
    >
      <Icon name={iconName} className="w-3 h-3" />
      <span>{display}</span>
      {suffix && <span className="text-slate-500 font-normal">{suffix}</span>}
    </span>
  );
}

export default function KpiCard({
  label,
  value,
  accent = "text-slate-100",
  tone = "neutral",
  icon,
  delta = null,
  deltaSuffix,
}) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <div className="panel panel-hover relative overflow-hidden p-4">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${t.bar}`}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] uppercase tracking-wider text-farm-muted">{label}</div>
        {icon && (
          <div className={`w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.04] grid place-items-center ${t.chip}`}>
            <Icon name={icon} className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className={`mt-1.5 text-2xl sm:text-3xl font-semibold tabular ${accent}`}>
        {value}
      </div>
      {(delta != null || deltaSuffix) && (
        <div className="mt-2">
          <DeltaBadge delta={delta} suffix={deltaSuffix} />
        </div>
      )}
    </div>
  );
}
