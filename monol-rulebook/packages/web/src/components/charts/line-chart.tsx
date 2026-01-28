'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface LineChartProps<T> {
  data: T[];
  xKey: keyof T;
  lines: {
    key: keyof T;
    color: string;
    name?: string;
  }[];
  height?: number;
}

export function LineChart<T extends Record<string, unknown>>({
  data,
  xKey,
  lines,
  height = 300,
}: LineChartProps<T>) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey={xKey as string}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        {lines.map((line) => (
          <Line
            key={line.key as string}
            type="monotone"
            dataKey={line.key as string}
            stroke={line.color}
            strokeWidth={2}
            dot={false}
            name={line.name || (line.key as string)}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
