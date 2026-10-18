import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatINR } from '../../utils/formatters';

interface SpendingChartsProps {
  dailyData: { date: string; label: string; expense: number; income: number }[];
  monthlyData: { monthKey: string; label: string; expense: number; income: number; allowance: number }[];
  categoryData: { name: string; value: number; percentage: number }[];
}

const CATEGORY_COLORS = [
  '#0f172a', // Slate 900
  '#2563eb', // Blue 600
  '#059669', // Emerald 600
  '#d97706', // Amber 600
  '#7c3aed', // Purple 600
  '#db2777', // Pink 600
  '#64748b', // Slate 500
];

export const SpendingCharts: React.FC<SpendingChartsProps> = ({
  dailyData,
  monthlyData,
  categoryData,
}) => {
  const [timelineMode, setTimelineMode] = useState<'daily' | 'monthly'>('daily');

  const hasTimelineData = timelineMode === 'daily'
    ? dailyData.some((d) => d.expense > 0 || d.income > 0)
    : monthlyData.some((m) => m.expense > 0 || m.income > 0 || m.allowance > 0);

  const hasCategoryData = categoryData.length > 0 && categoryData.some((c) => c.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Spending Trend (Daily / Monthly switcher) */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {timelineMode === 'daily' ? 'Daily Spending Trend (Last 14 Days)' : 'Monthly Spending & Income Trend'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {timelineMode === 'daily'
                ? 'Daily calendar breakdown of spending vs incoming money'
                : 'Month-on-month comparison of total expenses and allowances'}
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl self-start sm:self-auto">
            <button
              onClick={() => setTimelineMode('daily')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                timelineMode === 'daily'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daily (14d)
            </button>
            <button
              onClick={() => setTimelineMode('monthly')}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                timelineMode === 'monthly'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          {!hasTimelineData ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <p className="text-sm font-semibold text-slate-800">
                Your spending trend will appear here.
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Sign in and add transactions to view your financial insights.
              </p>
            </div>
          ) : timelineMode === 'daily' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value) || 0), '']}
                  labelFormatter={(label) => `Date: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    padding: '8px 12px',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="expense" name="Expense" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatINR(Number(value) || 0),
                    name === 'expense' ? 'Total Expenses' : 'Allowance Received',
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    padding: '8px 12px',
                  }}
                />
                <Bar dataKey="expense" name="Total Expense" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="allowance" name="Allowance Received" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-900 inline-block" />
              Expense Outflow
            </span>
            {timelineMode === 'monthly' && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
                Father's Allowance Inflow
              </span>
            )}
          </div>
          <span className="font-mono text-[11px] tabular-nums">Values in INR (₹)</span>
        </div>
      </div>

      {/* Category-Wise Expense Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">Category Breakdown</h3>
            <span className="text-[11px] text-slate-500 font-medium">This Month</span>
          </div>
          <p className="text-xs text-slate-500 mb-4">Top spending categories by proportion</p>

          {hasCategoryData ? (
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {categoryData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [formatINR(Number(val) || 0), 'Amount']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-600">Top</span>
                <span className="text-xs font-bold text-slate-900 truncate max-w-[90px]">
                  {categoryData[0]?.name || ''}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-center p-4 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs font-semibold text-slate-800">
                Your category breakdown will appear here.
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Sign in and add transactions to view your financial insights.
              </p>
            </div>
          )}
        </div>

        {/* Category Legend */}
        {hasCategoryData && (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
            {categoryData.slice(0, 4).map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-slate-700 truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                  <span className="text-slate-900 font-semibold">{formatINR(cat.value)}</span>
                  <span className="text-slate-500 text-[11px] w-8 text-right">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
