'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface AreaChartProps<T> {
  data: T[];
  xKey: keyof T;
  yKey: keyof T;
  fill?: string;
  stroke?: string;
  height?: number;
  gradient?: boolean;
}

export function AreaChart<T extends Record<string, unknown>>({
  data,
  xKey,
  yKey,
  fill = 'hsl(var(--primary))',
  stroke = 'hsl(var(--primary))',
  height = 300,
  gradient = true,
}: AreaChartProps<T>) {
  const gradientId = `gradient-${String(yKey)}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fill} stopOpacity={0.3} />
              <stop offset="95%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
        )}
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
        <Area
          type="monotone"
          dataKey={yKey as string}
          stroke={stroke}
          strokeWidth={2}
          fill={gradient ? `url(#${gradientId})` : fill}
        />
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}
