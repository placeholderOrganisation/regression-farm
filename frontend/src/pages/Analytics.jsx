import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Analytics } from "../api/client.js";
import usePolling from "../hooks/usePolling.js";
import Icon from "../components/Icon.jsx";

function ChartCard({ title, icon, hint, height = 288, children }) {
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 section-title">
          {icon && <Icon name={icon} className="w-3.5 h-3.5" />}
          <span>{title}</span>
        </div>
        {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="panel p-2.5 min-w-[10rem] shadow-glow">
      <div className="text-[11px] uppercase tracking-wider text-farm-muted mb-1.5">{label}</div>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span
                className="w-2 h-2 rounded-sm"
                style={{ background: p.color || p.stroke || p.fill }}
              />
              {p.name || p.dataKey}
            </span>
            <span className="text-slate-100 tabular font-medium">
              {typeof p.value === "number" ? p.value.toFixed(p.value % 1 === 0 ? 0 : 1) : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const AXIS_PROPS = {
  stroke: "#64748b",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const GRID_PROPS = {
  stroke: "#1e293b",
  strokeDasharray: "3 3",
  strokeOpacity: 0.6,
  vertical: false,
};

export default function AnalyticsPage() {
  const trends = usePolling(() => Analytics.trends(14), 10000);
  const flaky = usePolling(() => Analytics.flaky(), 10000);
  const wks = usePolling(() => Analytics.workers(7), 10000);
  const dur = usePolling(() => Analytics.durations(14), 10000);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Analytics</h1>
          <div className="text-sm text-slate-500">Trends, durations, and worker utilization.</div>
        </div>
      </header>

      <ChartCard title="Pass / fail per day" icon="trending" hint="last 14 days">
        <BarChart data={trends.data?.series || []} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="gPassed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="gFailed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="gTimed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.95} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id="gCancel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.7} />
              <stop offset="100%" stopColor="#64748b" stopOpacity={0.4} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID_PROPS} />
          <XAxis dataKey="day" {...AXIS_PROPS} />
          <YAxis {...AXIS_PROPS} />
          <Tooltip cursor={{ fill: "rgba(56,189,248,0.06)" }} content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "#94a3b8", paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          <Bar dataKey="PASSED" stackId="a" fill="url(#gPassed)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="FAILED" stackId="a" fill="url(#gFailed)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="TIMED_OUT" stackId="a" fill="url(#gTimed)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="CANCELLED" stackId="a" fill="url(#gCancel)" radius={[2, 2, 0, 0]} />
        </BarChart>
      </ChartCard>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Avg test-run duration" icon="clock" hint="last 14 days" height={256}>
          <ComposedChart data={dur.data?.series || []} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="gDuration" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="day" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} />
            <Tooltip cursor={{ stroke: "#38bdf8", strokeOpacity: 0.4 }} content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="avg_seconds"
              stroke="none"
              fill="url(#gDuration)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="avg_seconds"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={{ r: 2.5, stroke: "#0ea5e9", strokeWidth: 1, fill: "#38bdf8" }}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Worker busy seconds" icon="cpu" hint="last 7 days" height={256}>
          <BarChart data={wks.data?.workers || []} margin={{ top: 10, right: 8, bottom: 0, left: -10 }}>
            <defs>
              <linearGradient id="gWorker" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.5} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <XAxis dataKey="name" {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} />
            <Tooltip cursor={{ fill: "rgba(56,189,248,0.06)" }} content={<CustomTooltip />} />
            <Bar dataKey="busy_seconds" fill="url(#gWorker)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ChartCard>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3 section-title">
          <Icon name="flame" className="w-3.5 h-3.5" />
          <span>Flaky images</span>
        </div>
        <div className="hidden sm:block panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-farm-panel/80 backdrop-blur text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Image</th>
                  <th className="px-4 py-2.5 font-medium">Runs</th>
                  <th className="px-4 py-2.5 font-medium">Passed</th>
                  <th className="px-4 py-2.5 font-medium">Failed</th>
                  <th className="px-4 py-2.5 font-medium">Flake rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-farm-border/60">
                {(flaky.data?.items || []).map((row) => (
                  <tr key={row.image} className="hover:bg-sky-500/[0.04] transition">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-200">{row.image}</td>
                    <td className="px-4 py-2.5 tabular">{row.runs}</td>
                    <td className="px-4 py-2.5 text-emerald-300 tabular">{row.passed}</td>
                    <td className="px-4 py-2.5 text-rose-300 tabular">{row.failed}</td>
                    <td className="px-4 py-2.5">
                      <span className="pill bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-200 border border-amber-500/40 tabular">
                        {(row.flake_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {(flaky.data?.items || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">
                      No flaky images detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ul className="sm:hidden space-y-2">
          {(flaky.data?.items || []).map((row) => (
            <li key={row.image} className="panel panel-hover p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-mono text-xs text-slate-200 break-all">{row.image}</div>
                <span className="pill bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-200 border border-amber-500/40 tabular shrink-0">
                  {(row.flake_rate * 100).toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-center">
                <div>
                  <div className="text-slate-500 uppercase tracking-wider text-[10px]">Runs</div>
                  <div className="text-slate-200 tabular">{row.runs}</div>
                </div>
                <div>
                  <div className="text-slate-500 uppercase tracking-wider text-[10px]">Passed</div>
                  <div className="text-emerald-300 tabular">{row.passed}</div>
                </div>
                <div>
                  <div className="text-slate-500 uppercase tracking-wider text-[10px]">Failed</div>
                  <div className="text-rose-300 tabular">{row.failed}</div>
                </div>
              </div>
            </li>
          ))}
          {(flaky.data?.items || []).length === 0 && (
            <li className="panel p-6 text-center text-slate-400 text-sm">
              No flaky images detected.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
