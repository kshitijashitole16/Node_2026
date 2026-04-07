import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function EmptyState() {
  return <div className="chart-empty">No chart data in selected range.</div>;
}

function TooltipContent({ active, payload, label }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__label">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="chart-tooltip__item">
          <span
            className="chart-tooltip__dot"
            style={{ background: item.color || "#fff" }}
            aria-hidden
          />
          {item.name}: <strong>{item.value}</strong>
        </p>
      ))}
    </div>
  );
}

export function AnalyticsLineChart({
  data,
  xKey = "date",
  lines = [],
  height = 320,
}) {
  if (!Array.isArray(data) || data.length === 0) return <EmptyState />;

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 12, right: 14, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.12)" />
          <XAxis
            dataKey={xKey}
            tick={{ fill: "rgba(231,236,255,0.72)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.16)" }}
            tickLine={{ stroke: "rgba(255,255,255,0.16)" }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: "rgba(231,236,255,0.72)", fontSize: 12 }}
            axisLine={{ stroke: "rgba(255,255,255,0.16)" }}
            tickLine={{ stroke: "rgba(255,255,255,0.16)" }}
          />
          <Tooltip content={<TooltipContent />} />
          <Legend wrapperStyle={{ color: "rgba(243,246,255,0.88)", fontSize: 12 }} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label ?? line.key}
              stroke={line.color ?? "#67e8f9"}
              strokeWidth={2.2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
