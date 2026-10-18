import { StatementPreviewItem, Transaction, FundSource, PaymentMethod } from '../types/finance';
import { getCurrentDateString } from './formatters';

export type DetectedFormat = 
  | 'axis_bank_csv'
  | 'google_pay_csv'
  | 'generic_csv'
  | 'tsv'
  | 'unknown';

export interface ParseResult {
  success: boolean;
  format: DetectedFormat;
  formatLabel: string;
  items: StatementPreviewItem[];
  totalRows: number;
  newCount: number;
  duplicateCount: number;
  error?: string;
  warnings: string[];
}

/**
 * Robust RFC 4180-compliant CSV and TSV row tokenizer.
 * Handles escaped quotes (""), commas/tabs inside quotes, and line breaks.
 */
export function tokenizeDelimited(text: string, delimiter: string = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip LF after CR
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }

  // Last row flush
  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalizes varied Indian date formats to YYYY-MM-DD.
 * Supports:
 * - DD/MM/YYYY, DD-MM-YYYY
 * - YYYY-MM-DD
 * - DD-Mon-YYYY (e.g. 18-Oct-2026, 18 Oct 2026, 18-OCT-2026)
 * - DD/MM/YY, DD-MM-YY
 */
export function normalizeDate(rawDate: string): string {
  if (!rawDate) return getCurrentDateString();
  const trimmed = rawDate.trim().replace(/^['"]|['"]$/g, '');

  // 1. Check ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY
  const dmYMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmYMatch) {
    const d = dmYMatch[1].padStart(2, '0');
    const m = dmYMatch[2].padStart(2, '0');
    const y = dmYMatch[3];
    return `${y}-${m}-${d}`;
  }

  // 3. Check DD/MM/YY or DD-MM-YY
  const dmShortYMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (dmShortYMatch) {
    const d = dmShortYMatch[1].padStart(2, '0');
    const m = dmShortYMatch[2].padStart(2, '0');
    const y = `20${dmShortYMatch[3]}`;
    return `${y}-${m}-${d}`;
  }

  // 4. Check DD-Mon-YYYY (e.g. 18-Oct-2026 or 18 Oct 2026)
  const monthNames: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const monMatch = trimmed.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{2,4})/);
  if (monMatch) {
    const d = monMatch[1].padStart(2, '0');
    const mon = monMatch[2].toLowerCase();
    let y = monMatch[3];
    if (y.length === 2) y = `20${y}`;
    const m = monthNames[mon];
    if (m) {
      return `${y}-${m}-${d}`;
    }
  }

  // 5. Fallback Date constructor
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return getCurrentDateString();
}

/**
 * Extracts time HH:mm from raw string or default to 12:00
 */
export function extractTime(rawTimeOrDate: string): string {
  if (!rawTimeOrDate) return '12:00';
  const match = rawTimeOrDate.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?/i);
  if (!match) return '12:00';

  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3]?.toLowerCase();

  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;

  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

/**
 * Extracts UPI UTR / Reference number from descriptions or dedicated fields
 */
export function extractReferenceNumber(rawText: string): string | undefined {
  if (!rawText) return undefined;
  
  // UPI Ref: UPI/529124910249/...
  const upiMatch = rawText.match(/UPI\/(\d{10,14})/i);
  if (upiMatch) return upiMatch[1];

  // IMPS Ref: IMPS/P2A/5291204910/... or IMPS/5291204910
  const impsMatch = rawText.match(/IMPS\/(?:P2A\/)?([A-Z0-9]{8,14})/i);
  if (impsMatch) return impsMatch[1];

  // NEFT Ref: NEFT/AXSK192841029/...
  const neftMatch = rawText.match(/NEFT\/([A-Z0-9]{8,16})/i);
  if (neftMatch) return neftMatch[1];

  // UTR explicit: UTR: 123456789012 or Ref No: 12345
  const refMatch = rawText.match(/(?:UTR|Ref(?:erence)?(?:\s*No)?|Txn\s*ID)[:\s-]*([A-Z0-9]{8,18})/i);
  if (refMatch) return refMatch[1];

  return undefined;
}

/**
 * Clean transaction description by removing noisy bank prefixes/suffixes
 */
export function cleanDescription(rawDesc: string): string {
  if (!rawDesc) return 'Bank Transaction';
  let desc = rawDesc.trim();

  // If standard UPI format: UPI/529124910249/PAY TO SWIGGY/AXIS/...
  if (/^UPI\//i.test(desc)) {
    const segments = desc.split('/');
    if (segments.length >= 3) {
      // Typically segment 2 is payee name e.g. "PAY TO SWIGGY" or "SWIGGY"
      const payee = segments[2].replace(/^PAY\s+TO\s+/i, '').trim();
      if (payee.length > 2) {
        return payee;
      }
    }
  }

  // If POS format: POS 409210XXXXXX AMAZON PAY INDIA
  if (/^POS\s+/i.test(desc)) {
    desc = desc.replace(/^POS\s+[\dX*]+\s+/i, '').trim();
  }

  // Remove common trailing timestamps or reference numbers
  desc = desc.replace(/\s+-\s+\d{10,14}$/, '');
  desc = desc.replace(/\s*\/\s*$/, '');

  return desc || 'Bank Transaction';
}

/**
 * Smart Indian merchant & UPI categorization rule engine
 */
export function suggestCategoryAndConfidence(
  desc: string,
  isIncome: boolean
): { category: string; confidence: 'high' | 'review_suggested'; isTransfer: boolean } {
  const text = desc.toLowerCase();

  // 1. Transfers / Internal Sweep / ATM / Credit Card Payment (to avoid double counting)
  if (
    /self\s*transfer|transfer\s*to\s*self|own\s*account|sweep\s*in|sweep\s*out|to\s*savings|to\s*fd|to\s*rd|atm\s*wdl|atm\s*withdrawal|cash\s*withdrawal|credit\s*card\s*payment|cc\s*payment/i.test(text)
  ) {
    return { category: 'Transfers & Cash', confidence: 'high', isTransfer: true };
  }

  // 2. Allowance from Father
  if (/father|papa|dad|paternal|allowance|monthly\s*transfer/i.test(text)) {
    return { 
      category: isIncome ? "Father's Allowance" : 'Miscellaneous', 
      confidence: 'high', 
      isTransfer: false 
    };
  }

  // 3. Income categories
  if (isIncome) {
    if (/freelance|project|upwork|fiverr|client|gig|consult/i.test(text)) {
      return { category: 'Freelance & Projects', confidence: 'high', isTransfer: false };
    }
    if (/salary|payroll|wages|stipend|bonus/i.test(text)) {
      return { category: 'Salary & Stipend', confidence: 'high', isTransfer: false };
    }
    if (/interest|dividend|cashback|reward|refund/i.test(text)) {
      return { category: 'Gifts & Other Income', confidence: 'high', isTransfer: false };
    }
    return { category: 'Gifts & Other Income', confidence: 'review_suggested', isTransfer: false };
  }

  // 4. Food & Groceries
  if (
    /swiggy|zomato|blinkit|zepto|dunzo|bigbasket|grofers|instamart|mcdonald|kfc|burger\s*king|domino|pizza|starbucks|chai|coffee|dhaba|restaurant|hotel|bakery|sweet|amul|mother\s*dairy|supermarket|provision|grocery|food|canteen|mess|lunch|dinner|breakfast/i.test(text)
  ) {
    return { category: 'Groceries & Food', confidence: 'high', isTransfer: false };
  }

  // 5. Travel & Fuel
  if (
    /uber|ola|rapido|metro|dmrc|bmrcl|indian\s*oil|iocl|bpcl|hpcl|shell|petrol|fuel|diesel|fastag|toll|irctc|makemytrip|goibibo|easemytrip|redbus|flight|indigo|air\s*india|auto|cab|bus|railway|train/i.test(text)
  ) {
    return { category: 'Transportation', confidence: 'high', isTransfer: false };
  }

  // 6. Shopping & Retail
  if (
    /amazon|flipkart|myntra|ajio|meesho|zara|h&m|nykaa|croma|reliance\s*digital|dmart|decathlon|retail|mall|clothing|footwear|store|market/i.test(text)
  ) {
    return { category: 'Personal Care & Shopping', confidence: 'high', isTransfer: false };
  }

  // 7. Bills & Utilities
  if (
    /bescom|msedcl|tata\s*power|adani|electricity|water|gas|igl|indane|bharat\s*gas|cylinder|airtel|jio|vodafone|vi\s*bill|broadband|act\s*fibernet|hathway|dth|tata\s*play|recharge|wifi|bill\s*desk/i.test(text)
  ) {
    return { category: 'Utilities & Bills', confidence: 'high', isTransfer: false };
  }

  // 8. Education & Study
  if (
    /college|school|university|fee|tuition|coursera|udemy|books|kitab|stationer|notebook|xerox|print|library|exam|coaching/i.test(text)
  ) {
    return { category: 'Education & Study', confidence: 'high', isTransfer: false };
  }

  // 9. Entertainment & Subscriptions
  if (
    /netflix|amazon\s*prime|prime\s*video|disney|hotstar|sonyliv|spotify|youtube|apple\s*music|pvr|inox|cinepolis|bookmyshow|steam|playstation|movie|cinema|gaming/i.test(text)
  ) {
    return { category: 'Entertainment & Leisure', confidence: 'high', isTransfer: false };
  }

  // 10. Health & Medical
  if (
    /apollo|medplus|pharmeasy|1mg|netmeds|clinic|hospital|doctor|dental|pharmacy|chemist|medicine|lab|diagnostic|pathlab/i.test(text)
  ) {
    return { category: 'Health & Medical', confidence: 'high', isTransfer: false };
  }

  // Ambiguous / Generic
  return { category: 'Miscellaneous', confidence: 'review_suggested', isTransfer: false };
}

/**
 * Normalizes payment method based on narration text
 */
export function detectPaymentMethod(text: string): PaymentMethod {
  const lower = text.toLowerCase();
  if (/upi|gpay|google\s*pay|phonepe|paytm/i.test(lower)) return 'upi';
  if (/neft|rtgs|imps|net\s*banking/i.test(lower)) return 'net_banking';
  if (/debit|pos\s+|atm\s+w/i.test(lower)) return 'debit_card';
  if (/credit\s*card/i.test(lower)) return 'credit_card';
  if (/cash/i.test(lower)) return 'cash';
  return 'upi'; // Default for modern Indian daily payments
}

/**
 * Checks for duplicates against existing system transactions and intra-batch items
 */
export function evaluateDuplicate(
  date: string,
  amount: number,
  description: string,
  refNumber: string | undefined,
  existingTransactions: Transaction[],
  batchItemsSoFar: StatementPreviewItem[]
): { isDuplicate: boolean; status: 'new' | 'possible_duplicate' | 'verified'; reason?: string } {
  // 1. Check external reference / UTR match
  if (refNumber) {
    const existingRefMatch = existingTransactions.find(
      (t) => (t as any).externalTransactionId === refNumber || (t.notes && t.notes.includes(refNumber))
    );
    if (existingRefMatch) {
      return {
        isDuplicate: true,
        status: 'possible_duplicate',
        reason: `Matches transaction reference ${refNumber} (${existingRefMatch.description} on ${existingRefMatch.date})`,
      };
    }

    const intraRefMatch = batchItemsSoFar.find((b) => b.referenceNumber === refNumber);
    if (intraRefMatch) {
      return {
        isDuplicate: true,
        status: 'possible_duplicate',
        reason: `Duplicate row with identical reference ${refNumber} inside this uploaded statement`,
      };
    }
  }

  // 2. Check exact Date + Amount + similar description
  const cleanDesc = description.toLowerCase().trim();
  const existingExactMatch = existingTransactions.find(
    (t) =>
      t.date === date &&
      Math.abs(t.amount - amount) < 0.01 &&
      (t.description.toLowerCase().trim() === cleanDesc ||
       cleanDesc.includes(t.description.toLowerCase().trim()) ||
       t.description.toLowerCase().trim().includes(cleanDesc))
  );

  if (existingExactMatch) {
    return {
      isDuplicate: true,
      status: 'possible_duplicate',
      reason: `Matches existing ledger record on ${date} for ₹${amount} (${existingExactMatch.description})`,
    };
  }

  // 3. Intra-batch duplicate check (same date, amount, description)
  const intraExactMatch = batchItemsSoFar.find(
    (b) => b.date === date && Math.abs(b.amount - amount) < 0.01 && b.description.toLowerCase().trim() === cleanDesc
  );
  if (intraExactMatch) {
    return {
      isDuplicate: true,
      status: 'possible_duplicate',
      reason: `Identical transaction on ${date} for ₹${amount} repeats within this file`,
    };
  }

  return { isDuplicate: false, status: 'new' };
}

/**
 * Main Statement Parsing Engine
 */
export function parseStatementFile(
  content: string,
  fileName: string,
  existingTransactions: Transaction[] = []
): ParseResult {
  const warnings: string[] = [];

  // 1. Safety check: file size / content presence
  if (!content || !content.trim()) {
    return {
      success: false,
      format: 'unknown',
      formatLabel: 'Empty File',
      items: [],
      totalRows: 0,
      newCount: 0,
      duplicateCount: 0,
      error: 'The uploaded file contains no data.',
      warnings,
    };
  }

  // 2. Check for binary / PDF / Zip Excel signatures
  if (content.startsWith('%PDF-')) {
    return {
      success: false,
      format: 'unknown',
      formatLabel: 'PDF Document',
      items: [],
      totalRows: 0,
      newCount: 0,
      duplicateCount: 0,
      error: 'Encrypted bank PDF statement detected. Please export a CSV or TSV statement from your Axis Bank NetBanking or Google Pay app to parse transactions without password restrictions.',
      warnings,
    };
  }

  if (content.startsWith('PK\x03\x04')) {
    return {
      success: false,
      format: 'unknown',
      formatLabel: 'Excel Binary (.xlsx)',
      items: [],
      totalRows: 0,
      newCount: 0,
      duplicateCount: 0,
      error: 'Binary Excel format (.xlsx) detected. Please save or export your statement as CSV (Comma Delimited) or TSV to upload.',
      warnings,
    };
  }

  // 3. Detect delimiter
  const firstLines = content.split(/\r?\n/).slice(0, 10).join('\n');
  const tabCount = (firstLines.match(/\t/g) || []).length;
  const commaCount = (firstLines.match(/,/g) || []).length;
  const delimiter = tabCount > commaCount ? '\t' : ',';

  const rows = tokenizeDelimited(content, delimiter);
  if (rows.length < 2) {
    return {
      success: false,
      format: 'unknown',
      formatLabel: 'Invalid Format',
      items: [],
      totalRows: 0,
      newCount: 0,
      duplicateCount: 0,
      error: 'The uploaded statement does not contain any transaction rows.',
      warnings,
    };
  }

  // 4. Find Header Row (sometimes statements have metadata lines at top)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const rowStr = rows[i].map((c) => c.toLowerCase()).join(' ');
    if (
      (rowStr.includes('date') || rowStr.includes('time')) &&
      (rowStr.includes('particular') || rowStr.includes('desc') || rowStr.includes('narration') || rowStr.includes('amount') || rowStr.includes('debit') || rowStr.includes('withdrawal'))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return {
      success: false,
      format: 'unknown',
      formatLabel: 'Unrecognized Headers',
      items: [],
      totalRows: 0,
      newCount: 0,
      duplicateCount: 0,
      error: 'Could not identify standard transaction column headers (Date, Description, Debit/Credit). Please ensure your CSV includes standard column headers.',
      warnings,
    };
  }

  const rawHeaders = rows[headerRowIndex];
  const headers = rawHeaders.map((h) => h.toLowerCase().trim().replace(/["']/g, ''));
  const headerText = headers.join(' ');

  // 5. Detect Specific Format
  let detectedFormat: DetectedFormat = 'generic_csv';
  let formatLabel = 'Generic CSV Statement';

  if (delimiter === '\t') {
    detectedFormat = 'tsv';
    formatLabel = 'Tab-Separated Statement (TSV)';
  } else if (
    fileName.toLowerCase().includes('axis') ||
    headerText.includes('chq no') ||
    (headerText.includes('tran date') && headerText.includes('particulars'))
  ) {
    detectedFormat = 'axis_bank_csv';
    formatLabel = 'Axis Bank Statement CSV';
  } else if (
    fileName.toLowerCase().includes('gpay') ||
    fileName.toLowerCase().includes('google_pay') ||
    headerText.includes('google transaction id') ||
    headerText.includes('upi transaction id')
  ) {
    detectedFormat = 'google_pay_csv';
    formatLabel = 'Google Pay Transaction Export CSV';
  }

  // 6. Map Columns
  let dateIdx = headers.findIndex((h) => 
    h === 'date' || h === 'tran date' || h === 'transaction date' || h === 'txndate' || h === 'value date' || h.includes('date')
  );
  if (dateIdx === -1) {
    // If no explicit date header, check for time / timestamp header
    dateIdx = headers.findIndex((h) => h === 'time' || h === 'timestamp' || h.includes('time'));
  }

  const timeIdx = headers.findIndex((h, idx) => 
    idx !== dateIdx && (h === 'time' || h === 'tran time' || h === 'transaction time')
  );
  const descIdx = headers.findIndex((h) => 
    h.includes('particular') || h.includes('desc') || h.includes('narration') || h.includes('remark') || h.includes('title') || h.includes('merchant')
  );
  const debitIdx = headers.findIndex((h) => 
    h === 'debit' || h === 'dr' || h.includes('withdrawal') || h.includes('debit amt') || h === 'paid out' || h === 'spent'
  );
  const creditIdx = headers.findIndex((h) => 
    h === 'credit' || h === 'cr' || h.includes('deposit') || h.includes('credit amt') || h === 'paid in' || h === 'received'
  );
  const singleAmountIdx = headers.findIndex((h) => 
    h === 'amount' || h === 'txn amount' || h === 'net amount' || h.includes('amount (inr)')
  );
  const typeIdx = headers.findIndex((h) => 
    h === 'type' || h === 'dr/cr' || h === 'cr/dr' || h === 'transaction type'
  );
  const refIdx = headers.findIndex((h) => 
    h.includes('chq') || h.includes('ref') || h.includes('utr') || h.includes('txn id') || h.includes('transaction id')
  );
  const statusIdx = headers.findIndex((h) => 
    h === 'status' || h === 'payment status' || h === 'state'
  );

  if (dateIdx === -1 || descIdx === -1 || (debitIdx === -1 && singleAmountIdx === -1)) {
    return {
      success: false,
      format: detectedFormat,
      formatLabel,
      items: [],
      totalRows: 0,
      newCount: 0,
      duplicateCount: 0,
      error: `Missing required columns. Found headers: [${headers.filter(Boolean).join(', ')}]. Expected at least Date, Description, and Debit/Amount.`,
      warnings,
    };
  }

  const items: StatementPreviewItem[] = [];

  // 7. Parse Data Rows
  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length <= Math.max(dateIdx, descIdx)) continue;

    // Filter failed status (common in Google Pay logs: e.g. "Failed", "Cancelled")
    if (statusIdx !== -1 && row[statusIdx]) {
      const status = row[statusIdx].toLowerCase();
      if (status.includes('fail') || status.includes('cancel') || status.includes('decline')) {
        warnings.push(`Skipped non-completed transaction on row ${r + 1} (${row[descIdx] || 'Entry'}: ${status})`);
        continue;
      }
    }

    const rawDate = row[dateIdx];
    const normalizedDate = normalizeDate(rawDate);
    const time = timeIdx !== -1 && row[timeIdx] ? extractTime(row[timeIdx]) : extractTime(rawDate);

    const rawDesc = row[descIdx] || 'Bank Transaction';
    const cleanDesc = cleanDescription(rawDesc);
    const explicitRef = refIdx !== -1 ? row[refIdx]?.trim() : undefined;
    const extractedRef = extractReferenceNumber(rawDesc);
    const referenceNumber = explicitRef || extractedRef;

    let amount = 0;
    let type: 'expense' | 'income' = 'expense';

    if (debitIdx !== -1 && creditIdx !== -1) {
      // Distinct Debit and Credit columns (standard Axis Bank layout)
      const debitStr = (row[debitIdx] || '').replace(/[^0-9.-]/g, '');
      const creditStr = (row[creditIdx] || '').replace(/[^0-9.-]/g, '');
      const debitVal = Math.abs(parseFloat(debitStr) || 0);
      const creditVal = Math.abs(parseFloat(creditStr) || 0);

      if (creditVal > 0) {
        amount = creditVal;
        type = 'income';
      } else if (debitVal > 0) {
        amount = debitVal;
        type = 'expense';
      } else {
        continue; // 0 or empty row (e.g. balance inquiry)
      }
    } else if (singleAmountIdx !== -1) {
      // Single amount column
      const rawAmtCell = row[singleAmountIdx] || '';
      const amtClean = rawAmtCell.replace(/[^0-9.-]/g, '');
      const numVal = parseFloat(amtClean) || 0;
      amount = Math.abs(numVal);
      if (amount === 0) continue;

      if (typeIdx !== -1 && row[typeIdx]) {
        const typeStr = row[typeIdx].toLowerCase();
        type = (typeStr.includes('cr') || typeStr.includes('income') || typeStr.includes('credit') || typeStr.includes('received')) ? 'income' : 'expense';
      } else if (detectedFormat === 'google_pay_csv') {
        // In Google Pay exports, negative amounts (-₹) are expenses, positive (+₹) are credits/received
        type = rawAmtCell.includes('-') || numVal < 0 ? 'expense' : 'income';
      } else {
        const isPositiveCredit = rawAmtCell.includes('+') || 
          /received|credit|deposit|salary|refund|cashback|allowance|credited/i.test(rawDesc);
        type = (numVal < 0 || !isPositiveCredit) ? 'expense' : 'income';
      }
    }

    if (amount <= 0) continue;

    // Categorization
    const isIncome = type === 'income';
    const { category, confidence, isTransfer } = suggestCategoryAndConfidence(rawDesc, isIncome);
    const paymentMethod = detectPaymentMethod(rawDesc);
    const paymentAccount = detectedFormat === 'axis_bank_csv' ? 'Axis Bank (••1024)' : 'SBI Savings (••4092)';

    // Source Allocation: Strict Safety Invariant
    // Imported transactions MUST NOT automatically be assigned to father_allowance or personal_savings
    // when the actual source cannot be established. Use 'unallocated' until user confirms.
    const suggestedSource: FundSource = 'unallocated';
    const isPotentialAllowance = isIncome && category === "Father's Allowance";

    // Duplicate Check
    const dupEval = evaluateDuplicate(
      normalizedDate,
      amount,
      cleanDesc,
      referenceNumber,
      existingTransactions,
      items
    );

    items.push({
      id: `stmt-${r}-${Date.now().toString(36)}`,
      date: normalizedDate,
      time,
      description: cleanDesc,
      amount,
      type,
      suggestedCategory: category,
      suggestedSource,
      paymentMethod,
      paymentAccount,
      referenceNumber,
      duplicateStatus: dupEval.status,
      duplicateReason: dupEval.reason,
      confidence: isPotentialAllowance ? 'review_suggested' : confidence,
      isTransfer,
      isConfirmedAllowance: false, // Strict safety: Must be explicitly confirmed by user
      allowDuplicateOverride: false,
      selected: !dupEval.isDuplicate, // Default: pre-select only new, unflagged rows
    });
  }

  const newCount = items.filter((i) => i.duplicateStatus === 'new').length;
  const duplicateCount = items.filter((i) => i.duplicateStatus === 'possible_duplicate').length;

  return {
    success: items.length > 0,
    format: detectedFormat,
    formatLabel,
    items,
    totalRows: items.length,
    newCount,
    duplicateCount,
    warnings,
  };
}
