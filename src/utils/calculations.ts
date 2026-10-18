import { Transaction, AllowanceEntry, ProtectedFundAllocation, FinancialSettings } from '../types/finance';
import { getCurrentDateString, getMonthKey } from './formatters';

export interface CategorySummary {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface DailyMetrics {
  date: string;
  totalExpense: number;
  totalIncome: number;
  totalTransfers: number;
  net: number; // income - expense
  transactionCount: number;
  categories: CategorySummary[];
  transactions: Transaction[];
}

export interface DayBreakdown {
  date: string;
  dayNumber: number;
  formattedDay: string;
  expense: number;
  income: number;
}

export interface MonthlyMetrics {
  monthKey: string;
  totalExpense: number;
  totalIncome: number;
  totalTransfers: number;
  allowanceReceived: number;
  allowanceExpenses: number;
  unallocatedExpenses: number;
  remainingAllowance: number;
  averageDailyExpense: number;
  highestSpendingDay: { date: string; amount: number } | null;
  dailyBreakdown: DayBreakdown[];
  categories: CategorySummary[];
  comparison: {
    previousMonthKey: string;
    prevExpense: number;
    prevIncome: number;
    expenseChangePercent: number;
    incomeChangePercent: number;
  };
}

export interface DashboardMetrics {
  todayExpenses: number;
  thisMonthExpenses: number;
  monthlyAllowanceReceived: number;
  remainingAllowance: number;
  unallocatedExpenses: number;
  protectedFundBalance: number;
  protectedFundAllocationsCount: number;
  totalIncomeThisMonth: number;
  isAllowanceConfigured: boolean;
  isProtectedFundConfigured: boolean;
  recentTransactions: Transaction[];
  dailySpendingChartData: { date: string; label: string; expense: number; income: number }[];
  monthlySpendingChartData: { monthKey: string; label: string; expense: number; income: number; allowance: number }[];
  categoryExpenseChartData: { name: string; value: number; percentage: number }[];
}

/**
 * Identifies internal transfers between user's own accounts
 * to prevent double-counting as genuine consumption spending or income.
 * ATM cash withdrawals are transfers to cash holdings when tracked, not consumption expenses.
 */
export function isInternalTransfer(tx: Transaction): boolean {
  return (
    tx.category === 'Transfers' ||
    tx.category === 'Transfers & Cash' ||
    Boolean(tx.notes && tx.notes.includes('[INTERNAL TRANSFER]')) ||
    /atm\s*withdrawal|atm\s*wdl|cash\s*withdrawal|self\s*transfer|sweep/i.test(tx.description)
  );
}

/**
 * Filter transactions for a given date
 */
export function getDailyMetrics(transactions: Transaction[], date: string): DailyMetrics {
  const dayTransactions = transactions.filter((t) => t.date === date);

  let totalExpense = 0;
  let totalIncome = 0;
  let totalTransfers = 0;
  const categoryMap = new Map<string, { amount: number; count: number }>();

  dayTransactions.forEach((tx) => {
    const isTransfer = isInternalTransfer(tx);
    if (isTransfer) {
      totalTransfers += tx.amount;
    }

    if (tx.type === 'expense') {
      if (!isTransfer) {
        totalExpense += tx.amount;
      }
      const current = categoryMap.get(tx.category) || { amount: 0, count: 0 };
      categoryMap.set(tx.category, {
        amount: current.amount + tx.amount,
        count: current.count + 1,
      });
    } else {
      if (!isTransfer) {
        totalIncome += tx.amount;
      }
    }
  });

  const categories: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Sort day's transactions chronologically descending (latest first)
  const sortedTransactions = [...dayTransactions].sort((a, b) => 
    b.time.localeCompare(a.time)
  );

  return {
    date,
    totalExpense,
    totalIncome,
    totalTransfers,
    net: totalIncome - totalExpense,
    transactionCount: dayTransactions.length,
    categories,
    transactions: sortedTransactions,
  };
}

/**
 * Get Previous Month key "YYYY-MM"
 */
export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10);
  if (month === 1) {
    month = 12;
    year -= 1;
  } else {
    month -= 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Get days count in a given month
 */
export function getDaysInMonth(monthKey: string): number {
  const [yearStr, monthStr] = monthKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate metrics for a specific month
 */
export function getMonthlyMetrics(
  transactions: Transaction[],
  monthKey: string,
  allowanceEntries: AllowanceEntry[]
): MonthlyMetrics {
  const monthTransactions = transactions.filter((t) => getMonthKey(t.date) === monthKey);
  const daysInMonth = getDaysInMonth(monthKey);

  let totalExpense = 0;
  let totalIncome = 0;
  let totalTransfers = 0;
  let allowanceExpenses = 0;
  let unallocatedExpenses = 0;

  // Track daily sums
  const dailySums = new Map<number, { expense: number; income: number }>();
  for (let d = 1; d <= daysInMonth; d++) {
    dailySums.set(d, { expense: 0, income: 0 });
  }

  // Category map
  const categoryMap = new Map<string, { amount: number; count: number }>();

  monthTransactions.forEach((tx) => {
    const day = parseInt(tx.date.split('-')[2], 10);
    const dayData = dailySums.get(day) || { expense: 0, income: 0 };
    const isTransfer = isInternalTransfer(tx);

    if (isTransfer) {
      totalTransfers += tx.amount;
    }

    if (tx.type === 'expense') {
      if (!isTransfer) {
        totalExpense += tx.amount;
        dayData.expense += tx.amount;

        if (tx.source === 'father_allowance') {
          allowanceExpenses += tx.amount;
        } else if (tx.source === 'unallocated') {
          unallocatedExpenses += tx.amount;
        }
      }

      const cat = categoryMap.get(tx.category) || { amount: 0, count: 0 };
      categoryMap.set(tx.category, {
        amount: cat.amount + tx.amount,
        count: cat.count + 1,
      });
    } else {
      if (!isTransfer) {
        totalIncome += tx.amount;
        dayData.income += tx.amount;
      }
    }

    dailySums.set(day, dayData);
  });

  // Calculate allowance received in this month
  const monthAllowanceEntries = allowanceEntries.filter((a) => a.month === monthKey);
  const allowanceReceived = monthAllowanceEntries.reduce((sum, item) => sum + item.amount, 0);

  const remainingAllowance = allowanceReceived - allowanceExpenses;

  // Highest spending day & average daily
  let highestSpendingDay: { date: string; amount: number } | null = null;
  let maxSpend = 0;

  const dailyBreakdown: DayBreakdown[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const data = dailySums.get(d) || { expense: 0, income: 0 };
    const dateStr = `${monthKey}-${String(d).padStart(2, '0')}`;
    dailyBreakdown.push({
      date: dateStr,
      dayNumber: d,
      formattedDay: `${d}`,
      expense: data.expense,
      income: data.income,
    });

    if (data.expense > maxSpend) {
      maxSpend = data.expense;
      highestSpendingDay = { date: dateStr, amount: data.expense };
    }
  }

  // Determine elapsed days if current month, else entire month
  const today = getCurrentDateString();
  let daysDivisor = daysInMonth;
  if (today.startsWith(monthKey)) {
    const currentDay = parseInt(today.split('-')[2], 10);
    daysDivisor = Math.max(1, currentDay);
  }
  const averageDailyExpense = totalExpense > 0 ? totalExpense / daysDivisor : 0;

  // Categories list
  const categories: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Previous month comparison
  const previousMonthKey = getPreviousMonthKey(monthKey);
  const prevMonthTransactions = transactions.filter((t) => getMonthKey(t.date) === previousMonthKey);
  let prevExpense = 0;
  let prevIncome = 0;
  prevMonthTransactions.forEach((tx) => {
    const isTxTransfer = isInternalTransfer(tx);
    if (!isTxTransfer) {
      if (tx.type === 'expense') prevExpense += tx.amount;
      else prevIncome += tx.amount;
    }
  });

  const expenseChangePercent = prevExpense > 0
    ? ((totalExpense - prevExpense) / prevExpense) * 100
    : 0;
  const incomeChangePercent = prevIncome > 0
    ? ((totalIncome - prevIncome) / prevIncome) * 100
    : 0;

  return {
    monthKey,
    totalExpense,
    totalIncome,
    totalTransfers,
    allowanceReceived,
    allowanceExpenses,
    unallocatedExpenses,
    remainingAllowance,
    averageDailyExpense,
    highestSpendingDay,
    dailyBreakdown,
    categories,
    comparison: {
      previousMonthKey,
      prevExpense,
      prevIncome,
      expenseChangePercent,
      incomeChangePercent,
    },
  };
}

/**
 * Calculate Dashboard overview data
 */
export function getDashboardMetrics(
  transactions: Transaction[],
  allowanceEntries: AllowanceEntry[],
  protectedAllocations: ProtectedFundAllocation[],
  settings: FinancialSettings
): DashboardMetrics {
  const today = getCurrentDateString();
  const currentMonthKey = getMonthKey(today);

  // Today's total expenses (excluding internal self-transfers)
  const todayExpenses = transactions
    .filter((t) => t.date === today && t.type === 'expense' && !isInternalTransfer(t))
    .reduce((sum, t) => sum + t.amount, 0);

  // Monthly metrics
  const monthMetrics = getMonthlyMetrics(transactions, currentMonthKey, allowanceEntries);

  // Protected family fund balance: Initial reference (default ₹1,20,000) minus strictly authorized allocations
  const totalAllocated = protectedAllocations.reduce((sum, item) => sum + item.amount, 0);
  const protectedFundBalance = settings.protectedFundInitialBalance - totalAllocated;

  // Recent transactions (last 6 transactions overall)
  const recentTransactions = [...transactions]
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
    .slice(0, 6);

  // Daily spending chart data for the last 14 days
  const dailySpendingChartData = [];
  const [curYear, curMonth, curDay] = today.split('-').map(Number);
  const targetDate = new Date(curYear, curMonth - 1, curDay);

  for (let i = 13; i >= 0; i--) {
    const d = new Date(targetDate);
    d.setDate(targetDate.getDate() - i);
    const yStr = d.getFullYear();
    const mStr = String(d.getMonth() + 1).padStart(2, '0');
    const dStr = String(d.getDate()).padStart(2, '0');
    const dateKey = `${yStr}-${mStr}-${dStr}`;
    const dayLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

    const dayExpenses = transactions
      .filter((t) => t.date === dateKey && t.type === 'expense' && !isInternalTransfer(t))
      .reduce((s, t) => s + t.amount, 0);

    const dayIncome = transactions
      .filter((t) => t.date === dateKey && t.type === 'income' && !isInternalTransfer(t))
      .reduce((s, t) => s + t.amount, 0);

    dailySpendingChartData.push({
      date: dateKey,
      label: dayLabel,
      expense: dayExpenses,
      income: dayIncome,
    });
  }

  // Monthly trend chart data (dynamically trailing 4 months ending at current month)
  const dynamicMonths: string[] = [];
  const [cYear, cMonth] = currentMonthKey.split('-').map(Number);
  for (let offset = 3; offset >= 0; offset--) {
    let y = cYear;
    let m = cMonth - offset;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    dynamicMonths.push(`${y}-${String(m).padStart(2, '0')}`);
  }

  // Also include any other month that has transactions
  transactions.forEach((tx) => {
    const m = getMonthKey(tx.date);
    if (m && !dynamicMonths.includes(m)) {
      dynamicMonths.push(m);
    }
  });
  dynamicMonths.sort();

  const monthlySpendingChartData = dynamicMonths.map((mKey) => {
    const [yStr, mStr] = mKey.split('-');
    const dateObj = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    const label = dateObj.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

    const mTx = transactions.filter((t) => getMonthKey(t.date) === mKey);
    const exp = mTx
      .filter((t) => t.type === 'expense' && !isInternalTransfer(t))
      .reduce((s, t) => s + t.amount, 0);
    const inc = mTx
      .filter((t) => t.type === 'income' && !isInternalTransfer(t))
      .reduce((s, t) => s + t.amount, 0);
    const mAllowance = allowanceEntries
      .filter((a) => a.month === mKey)
      .reduce((s, a) => s + a.amount, 0);

    return {
      monthKey: mKey,
      label,
      expense: exp,
      income: inc,
      allowance: mAllowance,
    };
  });

  // Category expense chart data for this month
  const categoryExpenseChartData = monthMetrics.categories.slice(0, 5).map((c) => ({
    name: c.category,
    value: c.amount,
    percentage: Math.round(c.percentage),
  }));

  const isAllowanceConfigured = Boolean(
    settings.isAllowanceConfigured ||
    allowanceEntries.length > 0 ||
    monthMetrics.allowanceReceived > 0
  );

  const isProtectedFundConfigured = Boolean(
    settings.isProtectedFundConfigured ||
    protectedAllocations.length > 0
  );

  return {
    todayExpenses,
    thisMonthExpenses: monthMetrics.totalExpense,
    monthlyAllowanceReceived: monthMetrics.allowanceReceived,
    remainingAllowance: monthMetrics.remainingAllowance,
    unallocatedExpenses: monthMetrics.unallocatedExpenses,
    protectedFundBalance,
    protectedFundAllocationsCount: protectedAllocations.length,
    totalIncomeThisMonth: monthMetrics.totalIncome,
    isAllowanceConfigured,
    isProtectedFundConfigured,
    recentTransactions,
    dailySpendingChartData,
    monthlySpendingChartData,
    categoryExpenseChartData,
  };
}
