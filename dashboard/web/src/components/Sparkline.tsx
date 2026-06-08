import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export function Sparkline({
  data,
  dataKey,
  stroke = '#38bdf8',
  height = 80,
}: {
  data: Array<Record<string, number | string>>;
  dataKey: string;
  stroke?: string;
  height?: number;
}) {
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#1e293b" vertical={false} />
          <XAxis dataKey="t" hide />
          <YAxis hide />
          <Tooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(v) => new Date(v as number).toLocaleTimeString()}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
