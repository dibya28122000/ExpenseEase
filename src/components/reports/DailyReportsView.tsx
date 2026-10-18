import React, { useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  TrendingDown, 
  ArrowDownLeft, 
  ArrowUpRight,
  ListFilter,
  CreditCard,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { StatCard } from '../common/StatCard';
import { 
  formatINR, 
  formatDate, 
  formatFullDate, 
  formatTime, 
  getCurrentDateString,
  SOURCE_LABELS,
} from '../../utils/formatters';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

interface DailyReportsViewProps {
  onOpenAddModal: () => void;
}

export const DailyReportsView: React.FC<DailyReportsViewProps> = ({ onOpenAddModal }) => {
  const { selectedDate, setSelectedDate, getDailyData } = useFinance();

  const dailyMetrics = useMemo(() => {
    return getDailyData(selectedDate);
  }, [getDailyData, selectedDate]);

  const handlePrevDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() - 1);
    const yStr = date.getFullYear();
    const mStr = String(date.getMonth() + 1).padStart(2, '0');
    const dStr = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${yStr}-${mStr}-${dStr}`);
  };

  const handleNextDay = () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + 1);
    const yStr = date.getFullYear();
    const mStr = String(date.getMonth() + 1).padStart(2, '0');
    const dStr = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${yStr}-${mStr}-${dStr}`);
  };

  const setToday = () => {
    setSelectedDate(getCurrentDateString());
  };

  // Prepare hourly / transaction sequence chart data for this day
  const timelineChartData = useMemo(() => {
    if (dailyMetrics.transactions.length === 0) return [];
    return dailyMetrics.transactions
      .map((t) => ({
        time: t.time,
        label: formatTime(t.time),
        description: t.description,
        expense: t.type === 'expense' ? t.amount : 0,
        income: t.type === 'income' ? t.amount : 0,
      }))
      .reverse(); // chronological order
  }, [dailyMetrics.transactions]);

  return (
    <div className="space-y-6">
      {/* Date Navigator Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-white">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Daily Report Audit</div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {formatFullDate(selectedDate)}
            </h2>
          </div>
        </div>

        {/* Date Selector Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handlePrevDay}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 text-xs font-mono font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden"
          />

          <button
            onClick={handleNextDay}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={setToday}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors ml-1"
          >
            Today
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Day Expenses"
          amount={dailyMetrics.totalExpense}
          subtitle="Total spend outflow"
          icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
          trendDirection="down"
        />

        <StatCard
          title="Total Day Income"
          amount={dailyMetrics.totalIncome}
          subtitle="Money received today"
          icon={<ArrowDownLeft className="w-4 h-4 text-emerald-600" />}
          trendDirection="up"
        />

        <StatCard
          title="Net Day Amount"
          amount={dailyMetrics.net}
          subtitle={dailyMetrics.net >= 0 ? 'Net positive inflow' : 'Net expense deficit'}
          icon={<ArrowUpRight className="w-4 h-4 text-slate-700" />}
          trendDirection={dailyMetrics.net >= 0 ? 'up' : 'down'}
          highlight={dailyMetrics.net < 0 && dailyMetrics.totalExpense > 0}
        />

        <StatCard
          title="Transactions Recorded"
          amount={dailyMetrics.transactionCount}
          subtitle="Total ledger lines for date"
          icon={<ListFilter className="w-4 h-4 text-slate-600" />}
          isCurrency={false}
          customValue={`${dailyMetrics.transactionCount} tx`}
        />
      </div>

      {/* Timeline Chart & Category Breakdown Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Spending Timeline Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Spending by Recorded Time</h3>
              <p className="text-xs text-slate-500 mt-0.5">Chronological transaction flow for {formatDate(selectedDate)}</p>
            </div>
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {dailyMetrics.transactions.length} entries
            </span>
          </div>

          {timelineChartData.length > 0 ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    tickFormatter={(v) => `₹${v}`}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      formatINR(Number(val) || 0),
                      name === 'expense' ? 'Expense' : 'Income',
                    ]}
                    labelFormatter={(label, items) => {
                      const item = items?.[0]?.payload;
                      return `${label} — ${item?.description || ''}`;
                    }}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '0.75rem',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="expense" name="Expense" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="income" name="Income" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <p className="text-xs font-medium text-slate-600 mb-1">No transaction data recorded for this date</p>
              <p className="text-[11px] text-slate-400">Use "+ Add Transaction" to log an expense or income for {formatDate(selectedDate)}.</p>
            </div>
          )}
        </div>

        {/* Category Breakdown for this date */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Day Spending by Category</h3>
            <p className="text-xs text-slate-500 mb-4">Category allocation for this specific date</p>

            {dailyMetrics.categories.length > 0 ? (
              <div className="space-y-3">
                {dailyMetrics.categories.map((c) => (
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
                      <span>{c.count} {c.count === 1 ? 'item' : 'items'}</span>
                      <span>{Math.round(c.percentage)}% of day spend</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">
                No categorical expenses on this day.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Day Total</span>
            <span className="font-mono font-bold text-slate-900 tabular-nums">
              {formatINR(dailyMetrics.totalExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* Every transaction for that date ledger */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Day Transaction Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              All line items recorded on {formatDate(selectedDate)}
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            + Add for this date
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] uppercase font-semibold text-slate-500 tracking-wider">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Funding Source</th>
                <th className="py-3 px-4">Payment Account</th>
                <th className="py-3 px-4 text-right">Amount (INR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyMetrics.transactions.length > 0 ? (
                dailyMetrics.transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-800 font-medium">
                      {formatTime(tx.time)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900">{tx.description}</div>
                      {tx.notes && (
                        <div className="text-[11px] text-slate-400 italic mt-0.5">{tx.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">{tx.category}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-800">
                      {SOURCE_LABELS[tx.source] || tx.source}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      <div>{tx.paymentAccount}</div>
                      <div className="text-[10px] uppercase text-slate-400">{tx.paymentMethod}</div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                      <span
                        className={`text-sm font-bold ${
                          tx.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatINR(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    No transactions recorded for this day ({selectedDate}).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
