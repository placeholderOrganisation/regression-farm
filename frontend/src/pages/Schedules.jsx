import { useEffect, useState } from "react";
import { Schedules } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";
import RelativeTime from "../components/RelativeTime.jsx";

const DEFAULT_FORM = {
  name: "",
  cron_expr: "0 2 * * *",
  image: "minteksoftware/regression-farm:pytest-pass",
  timeout_seconds: 1800,
  priority: 0,
  enabled: true,
};

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
      <form onSubmit={submit} className="panel p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2 text-sm uppercase text-slate-400">New schedule</div>
        <div>
          <label className="text-xs text-slate-400">Name</label>
          <input className="input w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs text-slate-400">Image</label>
          <input className="input w-full font-mono" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} required />
        </div>
        <div>
          <label className="text-xs text-slate-400">Cron expression (UTC)</label>
          <input className="input w-full font-mono" value={form.cron_expr} onChange={(e) => setForm({ ...form, cron_expr: e.target.value })} required />
          <div className="mt-1 text-xs text-slate-500">
            {preview.length > 0 ? `Next: ${preview.slice(0, 3).join(" • ")}` : "(invalid cron)"}
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-400">Timeout (seconds)</label>
          <input className="input w-full" type="number" value={form.timeout_seconds} onChange={(e) => setForm({ ...form, timeout_seconds: +e.target.value })} />
        </div>
        <div className="md:col-span-2 flex items-center gap-3">
          <button type="submit" className="btn-primary">Create schedule</button>
          {error && <span className="text-rose-300 text-sm">{error}</span>}
        </div>
      </form>

      <div className="panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/40 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Cron</th>
              <th className="px-4 py-2 text-left">Image</th>
              <th className="px-4 py-2 text-left">Next run</th>
              <th className="px-4 py-2 text-left">Last triggered</th>
              <th className="px-4 py-2 text-left">Enabled</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-farm-border">
            {(list || []).map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 font-medium">{s.name}</td>
                <td className="px-4 py-2 font-mono text-xs">{s.cron_expr}</td>
                <td className="px-4 py-2 font-mono text-xs">{s.image}</td>
                <td className="px-4 py-2 text-slate-400"><RelativeTime iso={s.next_run_at} /></td>
                <td className="px-4 py-2 text-slate-400"><RelativeTime iso={s.last_triggered_at} /></td>
                <td className="px-4 py-2">
                  <button className="btn" onClick={() => toggle(s)}>
                    {s.enabled ? "Disable" : "Enable"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button className="btn-danger" onClick={() => remove(s)}>Delete</button>
                </td>
              </tr>
            ))}
            {(list || []).length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-sm">
                  No schedules yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
