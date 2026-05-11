export default function KpiCard({ label, value, accent = "text-slate-100" }) {
  return (
    <div className="panel p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400">{label}</div>
      <div className={`mt-1 text-xl sm:text-2xl font-semibold ${accent}`}>{value}</div>
    </div>
  );
}
