import { useEffect, useState } from "react";
import { Schedules } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";
import RelativeTime from "../components/RelativeTime.jsx";
import Icon from "../components/Icon.jsx";

const DEFAULT_FORM = {
  name: "",
  cron_expr: "0 2 * * *",
  image: "minteksoftware/regression-farm:pytest-pass",
  timeout_seconds: 1800,
  priority: 0,
  enabled: true,
};

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-wider text-farm-muted mb-1">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-slate-500">{hint}</div>}
    </label>
  );
}

export default function SchedulesPage() {
  const { data: list } = usePolling(() => Schedules.list(), 5000);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    Schedules.preview(form.cron_expr)
      .then((r) => !cancelled && setPreview(r.next_fires))
      .catch(() => !cancelled && setPreview([]));
    return () => { cancelled = true; };
  }, [form.cron_expr]);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await Schedules.create(form);
      setForm(DEFAULT_FORM);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const toggle = async (s) => {
    await Schedules.update(s.id, { enabled: !s.enabled });
  };
  const remove = async (s) => {
    if (!confirm(`Delete schedule ${s.name}?`)) return;
    await Schedules.remove(s.id);
  };

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Schedules</h1>
          <div className="text-sm text-slate-500">Cron-triggered regression runs.</div>
        </div>
      </header>

      <form onSubmit={submit} className="panel p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="schedules" className="w-4 h-4 text-sky-300" />
          <div className="text-sm font-semibold tracking-tight">New schedule</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name">
            <input
              className="input w-full"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Image">
            <input
              className="input w-full font-mono"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              required
            />
          </Field>
          <Field
            label="Cron expression (UTC)"
            hint={
              preview.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" className="w-3 h-3" />
                  Next: <span className="font-mono">{preview.slice(0, 3).join(" • ")}</span>
                </span>
              ) : (
                <span className="text-rose-400">invalid cron</span>
              )
            }
          >
            <input
              className="input w-full font-mono"
              value={form.cron_expr}
              onChange={(e) => setForm({ ...form, cron_expr: e.target.value })}
              required
            />
          </Field>
          <Field label="Timeout (seconds)">
            <input
              className="input w-full tabular"
              type="number"
              value={form.timeout_seconds}
              onChange={(e) => setForm({ ...form, timeout_seconds: +e.target.value })}
            />
          </Field>
          <div className="md:col-span-2 flex items-center gap-3 pt-1">
            <button type="submit" className="btn-primary">
              <Icon name="check" className="w-4 h-4" />
              Create schedule
            </button>
            {error && <span className="text-rose-300 text-sm">{error}</span>}
          </div>
        </div>
      </form>

      <div className="hidden sm:block panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-farm-panel/80 backdrop-blur text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Name</th>
                <th className="px-4 py-2.5 text-left font-medium">Cron</th>
                <th className="px-4 py-2.5 text-left font-medium">Image</th>
                <th className="px-4 py-2.5 text-left font-medium">Next run</th>
                <th className="px-4 py-2.5 text-left font-medium">Last triggered</th>
                <th className="px-4 py-2.5 text-left font-medium">Enabled</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-farm-border/60">
              {(list || []).map((s) => (
                <tr key={s.id} className="hover:bg-sky-500/[0.04] transition">
                  <td className="px-4 py-2.5 font-medium text-slate-100">{s.name}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-300">{s.cron_expr}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{s.image}</td>
                  <td className="px-4 py-2.5 text-slate-400"><RelativeTime iso={s.next_run_at} /></td>
                  <td className="px-4 py-2.5 text-slate-400"><RelativeTime iso={s.last_triggered_at} /></td>
                  <td className="px-4 py-2.5">
                    <button className="btn" onClick={() => toggle(s)}>
                      {s.enabled ? "Disable" : "Enable"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button className="btn-danger" onClick={() => remove(s)}>Delete</button>
                  </td>
                </tr>
              ))}
              {(list || []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-sm">
                    No schedules yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="sm:hidden space-y-2">
        {(list || []).map((s) => (
          <li key={s.id} className="panel panel-hover p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-slate-100 break-all">{s.name}</div>
              <span
                className={`pill ${
                  s.enabled
                    ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/40"
                    : "bg-slate-500/15 text-slate-400 border border-slate-500/30"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.enabled ? "bg-emerald-400 animate-pulseDot" : "bg-slate-500"}`} />
                {s.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="text-xs font-mono text-slate-300 break-all">{s.cron_expr}</div>
            <div className="text-xs font-mono text-slate-500 break-all">{s.image}</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[10px]">Next run</div>
                <div><RelativeTime iso={s.next_run_at} /></div>
              </div>
              <div>
                <div className="text-slate-500 uppercase tracking-wider text-[10px]">Last triggered</div>
                <div><RelativeTime iso={s.last_triggered_at} /></div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn" onClick={() => toggle(s)}>
                {s.enabled ? "Disable" : "Enable"}
              </button>
              <button className="btn-danger" onClick={() => remove(s)}>Delete</button>
            </div>
          </li>
        ))}
        {(list || []).length === 0 && (
          <li className="panel p-6 text-center text-slate-400 text-sm">
            No schedules yet.
          </li>
        )}
      </ul>
    </div>
  );
}
