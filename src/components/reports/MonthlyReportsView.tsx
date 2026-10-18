import React, { useMemo } from 'react';
import { 
  CalendarRange, 
  TrendingDown, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Calendar,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { StatCard } from '../common/StatCard';
import { 
  formatINR, 
  formatDate, 
  formatMonthYear, 
  getPreviousMonthKey,
  getMonthKey,
} from '../../utils/formatters';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

export const MonthlyReportsView: React.FC = () => {
  const { 
    selectedMonth, 
    setSelectedMonth, 
    getMonthlyData, 
    setSelectedDate, 
    setActiveTab,
    transactions,
    allowanceEntries,
  } = useFinance();

  const monthlyMetrics = useMemo(() => {
    return getMonthlyData(selectedMonth);
  }, [getMonthlyData, selectedMonth]);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add('2026-10');
    monthsSet.add(selectedMonth);

    transactions.forEach((tx) => {
      const m = getMonthKey(tx.date);
      if (m) monthsSet.add(m);
    });

    allowanceEntries.forEach((a) => {
      if (a.month) monthsSet.add(a.month);
    });

    return Array.from(monthsSet)
      .sort((a, b) => b.localeCompare(a))
      .map((key) => ({
        key,
        label: key === '2026-10' ? `${formatMonthYear(key)} (Current)` : formatMonthYear(key),
      }));
  }, [transactions, allowanceEntries, selectedMonth]);

  const handlePrevMonth = () => {
    const prev = getPreviousMonthKey(selectedMonth);
    setSelectedMonth(prev);
  };

  const handleNextMonth = () => {
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr, 10);
    let m = parseInt(mStr, 10);
    if (m === 12) {
      m = 1;
      y += 1;
    } else {
      m += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  return (
    <div className="space-y-6">
      {/* Month Navigator Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-white">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Monthly Statement & Summary</div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {formatMonthYear(selectedMonth)}
            </h2>
          </div>
        </div>

        {/* Month Selector Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-hidden"
          >
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          <button
            onClick={handleNextMonth}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 Primary Monthly Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Monthly Expenses"
          amount={monthlyMetrics.totalExpense}
          subtitle="Cumulative month spending"
          icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
          trendDirection="down"
        />

        <StatCard
          title="Total Monthly Income"
          amount={monthlyMetrics.totalIncome}
          subtitle="Allowance + freelance + gifts"
          icon={<ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
          trendDirection="up"
        />

        <StatCard
          title="Average Daily Spending"
          amount={monthlyMetrics.averageDailyExpense}
          subtitle="Average burn per day elapsed"
          icon={<BarChart3 className="w-4 h-4 text-slate-700" />}
        />

        <StatCard
          title="Highest-Spending Day"
          amount={monthlyMetrics.highestSpendingDay ? monthlyMetrics.highestSpendingDay.amount : 0}
          subtitle={
            monthlyMetrics.highestSpendingDay
              ? formatDate(monthlyMetrics.highestSpendingDay.date)
              : 'No expenses recorded'
          }
          icon={<Calendar className="w-4 h-4 text-amber-600" />}
          badgeText="Peak Spend"
        />
      </div>

      {/* Previous Month Comparison Banner */}
      <div className="p-4 bg-slate-100/80 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-slate-900" />
          <span className="font-semibold text-slate-900">
            Compared with {formatMonthYear(monthlyMetrics.comparison.previousMonthKey)}:
          </span>
          <span className="text-slate-600">
            Previous Expenses: <strong className="font-mono text-slate-900">{formatINR(monthlyMetrics.comparison.prevExpense)}</strong>
          </span>
          <span className="text-slate-600">
            · Previous Income: <strong className="font-mono text-slate-900">{formatINR(monthlyMetrics.comparison.prevIncome)}</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 font-mono tabular-nums">
            <span className="text-slate-500">Expense Delta:</span>
            <span
              className={`font-bold ${
                monthlyMetrics.comparison.expenseChangePercent > 0
                  ? 'text-rose-600'
                  : monthlyMetrics.comparison.expenseChangePercent < 0
                  ? 'text-emerald-600'
                  : 'text-slate-700'
              }`}
            >
              {monthlyMetrics.comparison.expenseChangePercent > 0 ? '+' : ''}
              {monthlyMetrics.comparison.expenseChangePercent.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-1 font-mono tabular-nums">
            <span className="text-slate-500">Income Delta:</span>
            <span
              className={`font-bold ${
                monthlyMetrics.comparison.incomeChangePercent >= 0
                  ? 'text-emerald-600'
                  : 'text-rose-600'
              }`}
            >
              {monthlyMetrics.comparison.incomeChangePercent > 0 ? '+' : ''}
              {monthlyMetrics.comparison.incomeChangePercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Daily Expense Breakdown Chart */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Day-by-Day Expense Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily outflow distribution across {formatMonthYear(selectedMonth)}
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {monthlyMetrics.dailyBreakdown.length} Calendar Days
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyMetrics.dailyBreakdown}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="formattedDay"
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
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                formatter={(val: any) => [formatINR(Number(val) || 0), 'Expense']}
                labelFormatter={(d) => `${formatMonthYear(selectedMonth)} - Day ${d}`}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '0.75rem',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="expense" fill="#0f172a" radius={[3, 3, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown & Daily Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category-wise spending table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Monthly Category Allocation</h3>
          <p className="text-xs text-slate-500 mb-4">Spending by expense category</p>

          <div className="space-y-3">
            {monthlyMetrics.categories.length > 0 ? (
              monthlyMetrics.categories.map((c) => (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 truncate">{c.category}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatINR(c.amount)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-slate-900 h-full rounded-full"
                      style={{ width: `${Math.min(100, Math.round(c.percentage))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{c.count} transactions</span>
                    <span>{Math.round(c.percentage)}% of total</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No expense categories recorded this month.
              </div>
            )}
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col justify-between">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Calendar Day Breakdown</h3>
              <p className="text-xs text-slate-500 mt-0.5">Click any date to view its daily audit ledger</p>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-semibold text-slate-500 tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4 text-right">Day Outflow</th>
                  <th className="py-2.5 px-4 text-right">Day Inflow</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monthlyMetrics.dailyBreakdown.map((row) => {
                  const hasActivity = row.expense > 0 || row.income > 0;
                  return (
                    <tr
                      key={row.date}
                      className={hasActivity ? 'hover:bg-slate-50/80' : 'opacity-60'}
                    >
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                        {formatDate(row.date)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {row.expense > 0 ? formatINR(row.expense) : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-emerald-600">
                        {row.income > 0 ? `+${formatINR(row.income)}` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedDate(row.date);
                            setActiveTab('daily-reports');
                          }}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          Audit Day
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
