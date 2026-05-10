import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Analytics } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";

const TOOLTIP_STYLE = { background: "#0f172a", border: "1px solid #1f2937", color: "#e2e8f0" };

export default function AnalyticsPage() {
  const trends = usePolling(() => Analytics.trends(14), 10000);
  const flaky = usePolling(() => Analytics.flaky(), 10000);
  const wks = usePolling(() => Analytics.workers(7), 10000);
  const dur = usePolling(() => Analytics.durations(14), 10000);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm uppercase text-slate-400 mb-2">Pass / fail per day</h2>
        <div className="panel p-3 h-72">
          <ResponsiveContainer>
            <BarChart data={trends.data?.series || []}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Bar dataKey="PASSED" stackId="a" fill="#10b981" />
              <Bar dataKey="FAILED" stackId="a" fill="#f43f5e" />
              <Bar dataKey="TIMED_OUT" stackId="a" fill="#f59e0b" />
              <Bar dataKey="CANCELLED" stackId="a" fill="#64748b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-sm uppercase text-slate-400 mb-2">Avg test-run duration</h2>
          <div className="panel p-3 h-64">
            <ResponsiveContainer>
              <LineChart data={dur.data?.series || []}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="avg_seconds" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h2 className="text-sm uppercase text-slate-400 mb-2">Worker busy seconds (last 7 days)</h2>
          <div className="panel p-3 h-64">
            <ResponsiveContainer>
              <BarChart data={wks.data?.workers || []}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="busy_seconds" fill="#38bdf8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase text-slate-400 mb-2">Flaky images</h2>
        <div className="panel overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900/40 text-left text-xs uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2">Image</th>
                <th className="px-4 py-2">Runs</th>
                <th className="px-4 py-2">Passed</th>
                <th className="px-4 py-2">Failed</th>
                <th className="px-4 py-2">Flake rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-farm-border">
              {(flaky.data?.items || []).map((row) => (
                <tr key={row.image}>
                  <td className="px-4 py-2 font-mono text-xs">{row.image}</td>
                  <td className="px-4 py-2">{row.runs}</td>
                  <td className="px-4 py-2 text-emerald-300">{row.passed}</td>
                  <td className="px-4 py-2 text-rose-300">{row.failed}</td>
                  <td className="px-4 py-2 text-amber-300">{(row.flake_rate * 100).toFixed(1)}%</td>
                </tr>
              ))}
              {(flaky.data?.items || []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">No flaky images detected.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
