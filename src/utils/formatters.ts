/**
 * Consistent INR (Indian Rupee) currency formatter
 * Follows the Indian numbering system: ₹1,20,000
 */
export function formatINR(amount: number, showDecimals = false): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(absAmount);

  return `${isNegative ? '-' : ''}₹${formatted}`;
}

/**
 * Format date to human-readable string: "18 Oct 2026"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format date to full format: "Sunday, 18 October 2026"
 */
export function formatFullDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format month key YYYY-MM to "October 2026"
 */
export function formatMonthYear(monthKey: string): string {
  if (!monthKey) return '';
  try {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return monthKey;
  }
}

/**
 * Format 24-hr time "14:30" to "02:30 PM"
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '';
  try {
    const [hourStr, minStr] = timeString.split(':');
    let hour = parseInt(hourStr, 10);
    const min = minStr || '00';
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12;
    hour = hour ? hour : 12;
    return `${hour.toString().padStart(2, '0')}:${min} ${ampm}`;
  } catch {
    return timeString;
  }
}

/**
 * Get current date string in YYYY-MM-DD
 */
export function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current time string in HH:mm
 */
export function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get month key in YYYY-MM
 */
export function getMonthKey(dateString: string): string {
  if (!dateString) return '';
  return dateString.substring(0, 7);
}

/**
 * Get previous month key "YYYY-MM"
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
 * Source label mapping
 */
export const SOURCE_LABELS: Record<string, string> = {
  father_allowance: "Father's Allowance",
  protected_family_fund: "Protected Family Fund",
  other_income: "Other Income",
  personal_savings: "Personal Savings",
};

/**
 * Payment method label mapping
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI (GPay / PhonePe / Paytm)",
  net_banking: "Net Banking",
  debit_card: "Debit Card",
  credit_card: "Credit Card",
  cash: "Cash in Hand",
};
