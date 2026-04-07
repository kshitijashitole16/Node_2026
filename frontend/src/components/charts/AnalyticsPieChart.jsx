import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

function EmptyState({ message = "No chart data in selected range." }) {
  return <div className="chart-empty">{message}</div>;
}

function TooltipContent({ active, payload }) {
  if (!active || !Array.isArray(payload) || payload.length === 0) return null;
  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__item">
        {item.name}: <strong>{item.value}</strong>
      </p>
    </div>
  );
}

export function AnalyticsPieChart({
  data,
  height = 320,
  innerRadius = 68,
  outerRadius = 102,
  emptyMessage = "No chart data in selected range.",
}) {
  if (!Array.isArray(data) || data.length === 0) return <EmptyState message={emptyMessage} />;

  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  if (total <= 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={3}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color || "#67e8f9"} />
            ))}
          </Pie>
          <Tooltip content={<TooltipContent />} />
          <Legend wrapperStyle={{ color: "rgba(243,246,255,0.88)", fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <p className="chart-total">
        Total: <strong>{total}</strong>
      </p>
    </div>
  );
}
