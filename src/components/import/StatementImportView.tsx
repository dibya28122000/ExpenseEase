import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Info, 
  Check, 
  RefreshCw, 
  ArrowRight, 
  ShieldAlert,
  Smartphone,
  Layers,
  LayoutList,
  Grid,
  Filter,
  Download,
  AlertCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { StatementPreviewItem, FundSource, PaymentMethod } from '../../types/finance';
import { formatINR, formatDate, formatTime } from '../../utils/formatters';
import { parseStatementFile, DetectedFormat } from '../../utils/statementParser';
import { CATEGORIES_LIST, PAYMENT_ACCOUNTS } from '../../utils/demoData';
import { Modal } from '../common/Modal';

export const StatementImportView: React.FC = () => {
  const { 
    transactions, 
    importStatementBatch, 
    setActiveTab, 
    isCloudConnected,
    currentUser 
  } = useFinance();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat>('generic_csv');
  const [formatLabel, setFormatLabel] = useState<string>('CSV Statement');
  const [previewItems, setPreviewItems] = useState<StatementPreviewItem[]>([]);
  const [importStatus, setImportStatus] = useState<'idle' | 'loaded' | 'importing' | 'imported'>('idle');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [parserWarnings, setParserWarnings] = useState<string[]>([]);
  
  // View mode for mobile vs desktop: 'table' or 'cards'
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  
  // Filter in preview: all, new_only, duplicates_only
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'duplicates'>('all');

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    importedCount: number;
    duplicateCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);

  // 1. Process Raw Text via smart statementParser
  const processRawStatement = (content: string, fileName: string) => {
    setErrorNotice(null);
    setParserWarnings([]);

    // File size check: reject if > 5MB
    if (content.length > 5 * 1024 * 1024) {
      setErrorNotice('File size exceeds the 5MB safety limit. Please upload a specific monthly statement.');
      return;
    }

    const parseResult = parseStatementFile(content, fileName, transactions);

    if (!parseResult.success) {
      setErrorNotice(parseResult.error || 'Failed to parse statement. Please check that the file format is supported.');
      if (parseResult.warnings.length > 0) {
        setParserWarnings(parseResult.warnings);
      }
      return;
    }

    setUploadedFileName(fileName);
    setDetectedFormat(parseResult.format);
    setFormatLabel(parseResult.formatLabel);
    setPreviewItems(parseResult.items);
    setParserWarnings(parseResult.warnings);
    setImportStatus('loaded');
  };

  // 2. Real File Upload Handler (Mobile & Desktop)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();

    // Check unsupported binary types with friendly explainer
    if (lowerName.endsWith('.pdf')) {
      setErrorNotice(
        'Encrypted bank PDF statement detected. Password-protected PDFs cannot be reliably parsed client-side without banking security credentials. Please download a CSV or TSV statement from your Axis Bank NetBanking or Google Pay app.'
      );
      return;
    }

    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      setErrorNotice(
        'Excel workbook (.xlsx) format detected. Please save or export your statement as CSV (Comma Delimited) or TSV to upload.'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        processRawStatement(text, file.name);
      } else {
        setErrorNotice('The uploaded file was empty.');
      }
    };
    reader.onerror = () => {
      setErrorNotice('Failed to read the local file. Please try again.');
    };
    reader.readAsText(file);
  };



  // Selection toggles
  const toggleSelectRow = (id: string) => {
    setPreviewItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAll = () => {
    setPreviewItems((prev) => prev.map((item) => ({ ...item, selected: true })));
  };

  const selectNewOnly = () => {
    setPreviewItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.duplicateStatus === 'new',
      }))
    );
  };

  const deselectAll = () => {
    setPreviewItems((prev) => prev.map((item) => ({ ...item, selected: false })));
  };

  // In-place edits
  const handleCategoryChange = (id: string, newCat: string) => {
    setPreviewItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, suggestedCategory: newCat } : item
      )
    );
  };

  const handleSourceChange = (id: string, newSource: FundSource) => {
    setPreviewItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, suggestedSource: newSource } : item
      )
    );
  };

  const handleAccountChange = (id: string, newAccount: string) => {
    setPreviewItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, paymentAccount: newAccount } : item
      )
    );
  };

  const handleToggleAllowanceConfirm = (id: string) => {
    setPreviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newConfirmed = !item.isConfirmedAllowance;
        return {
          ...item,
          isConfirmedAllowance: newConfirmed,
          suggestedSource: newConfirmed ? 'father_allowance' : 'unallocated',
        };
      })
    );
  };

  const handleToggleDuplicateOverride = (id: string) => {
    setPreviewItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, allowDuplicateOverride: !item.allowDuplicateOverride }
          : item
      )
    );
  };

  // Filtered preview rows
  const filteredItems = useMemo(() => {
    if (previewFilter === 'new') {
      return previewItems.filter((i) => i.duplicateStatus === 'new');
    }
    if (previewFilter === 'duplicates') {
      return previewItems.filter((i) => i.duplicateStatus === 'possible_duplicate');
    }
    return previewItems;
  }, [previewItems, previewFilter]);

  const selectedRows = useMemo(() => previewItems.filter((i) => i.selected), [previewItems]);
  const duplicateSelectedCount = useMemo(
    () => selectedRows.filter((i) => i.duplicateStatus === 'possible_duplicate').length,
    [selectedRows]
  );

  const totalExpenseToImport = useMemo(
    () => selectedRows.filter((i) => i.type === 'expense').reduce((s, i) => s + i.amount, 0),
    [selectedRows]
  );

  const totalIncomeToImport = useMemo(
    () => selectedRows.filter((i) => i.type === 'income').reduce((s, i) => s + i.amount, 0),
    [selectedRows]
  );

  // Import Execution
  const handleExecuteImport = async () => {
    if (selectedRows.length === 0) return;

    try {
      setImportStatus('importing');
      setShowConfirmModal(false);

      const res = await importStatementBatch(
        uploadedFileName || 'Statement Import',
        detectedFormat,
        selectedRows
      );

      setImportSummary({
        importedCount: res.importedCount,
        duplicateCount: previewItems.length - res.importedCount,
        failedCount: res.failedCount,
        errors: res.errors,
      });

      setImportStatus('imported');
    } catch (err: any) {
      setErrorNotice(err?.message || 'Import failed. Please check network connection.');
      setImportStatus('loaded');
    }
  };

  const resetImporter = () => {
    setPreviewItems([]);
    setUploadedFileName(null);
    setImportStatus('idle');
    setErrorNotice(null);
    setParserWarnings([]);
    setImportSummary(null);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Smart Statement Import
                </h2>
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                  Phase 3 Active
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Automated parsing for Axis Bank CSV, Google Pay activity exports, and standard tabular statements
              </p>
            </div>
          </div>

          {/* Cloud vs Local indicator */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isCloudConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>Supabase PostgreSQL Ready</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Local Session Mode</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error / Warning Notice */}
      {errorNotice && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">{errorNotice}</p>
            <p className="text-[11px] text-rose-700">
              Please verify that your file is an uncorrupted CSV or TSV statement export.
            </p>
          </div>
        </div>
      )}

      {/* Idle / Upload Step */}
      {importStatus === 'idle' && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files?.[0]) {
                handleFileUpload({ target: { files: e.dataTransfer.files } } as any);
              }
            }}
            className={`bg-white rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
              dragActive
                ? 'border-slate-900 bg-slate-50/50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Select your bank or Google Pay statement
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Drag and drop your file here, or click to choose from your device
                </p>
              </div>

              {/* iPhone-optimized touch button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5 sm:hidden" />
                  <span>Browse Statement File (.csv, .tsv)</span>
                </button>
              </div>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <span className="font-semibold text-slate-700">Supported formats:</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Axis Bank CSV</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Google Pay CSV</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">Standard TSV / CSV</span>
              </div>
            </div>
          </div>



          {/* Banking Privacy & PDF Notice */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-600">
            <Info className="w-4 h-4 shrink-0 text-slate-500 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-slate-800">
                iPhone & Banking Security Architecture
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                ExpenseEase processes files entirely in your browser memory before saving approved transactions to your authenticated Supabase database. We never ask for or store bank passwords, Google Pay MPINs, or OTPs. Direct PDF statement extraction without master passwords is intentionally restricted to protect personal credentials.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loaded / Reviewing Step */}
      {(importStatus === 'loaded' || importStatus === 'importing') && (
        <div className="space-y-4">
          {/* Format Detected & Stats Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-slate-900">{formatLabel}</span>
                <span className="text-xs text-slate-400 font-mono">({uploadedFileName})</span>
              </div>
              <button
                onClick={resetImporter}
                className="text-xs text-slate-500 hover:text-slate-900 font-medium underline self-start sm:self-auto"
              >
                Upload different file
              </button>
            </div>

            {/* Metrics Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-mono">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] text-slate-500 uppercase block">Extracted</span>
                <span className="font-bold text-slate-900 text-sm">{previewItems.length}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 uppercase block">New Rows</span>
                <span className="font-bold text-emerald-800 text-sm">
                  {previewItems.filter((i) => i.duplicateStatus === 'new').length}
                </span>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                <span className="text-[10px] text-amber-700 uppercase block">Possible Duplicates</span>
                <span className="font-bold text-amber-800 text-sm">
                  {previewItems.filter((i) => i.duplicateStatus === 'possible_duplicate').length}
                </span>
              </div>
              <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-[10px] text-indigo-700 uppercase block">Selected to Save</span>
                <span className="font-bold text-indigo-900 text-sm">{selectedRows.length}</span>
              </div>
            </div>

            {/* Quick Filter & View Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Show:</span>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    previewFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All ({previewItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('new')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    previewFilter === 'new'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  New Only
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewFilter('duplicates')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    previewFilter === 'duplicates'
                      ? 'bg-amber-800 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Duplicates Only
                </button>
              </div>

              {/* Selection actions & Mobile layout toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectNewOnly}
                  className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                  title="Select only unflagged new rows"
                >
                  Select New Only
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Clear
                </button>

                {/* Card vs Table toggle */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1 rounded ${viewMode === 'table' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'}`}
                    title="Dense Table View"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`p-1 rounded ${viewMode === 'cards' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500'}`}
                    title="Mobile Card View"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card View (Mobile / Touch Friendly) */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.selected
                      ? 'bg-white border-slate-300 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSelectRow(item.id)}
                        className="mt-1 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">
                          {item.description}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {formatDate(item.date)} · {item.time}
                        </div>
                      </div>
                    </label>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-sm font-bold font-mono tabular-nums ${
                          item.type === 'income' ? 'text-emerald-700' : 'text-slate-900'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '−'}
                        {formatINR(item.amount)}
                      </span>
                    </div>
                  </div>

                  {/* Duplicate warning & transfer badges */}
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {item.duplicateStatus === 'possible_duplicate' && (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
                        Possible Duplicate
                      </span>
                    )}
                    {item.suggestedSource === 'unallocated' && (
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                        Unallocated Source
                      </span>
                    )}
                    {item.isTransfer && (
                      <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md">
                        Internal Transfer
                      </span>
                    )}
                    {item.referenceNumber && (
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]">
                        Ref: {item.referenceNumber}
                      </span>
                    )}
                  </div>

                  {item.duplicateReason && (
                    <p className="text-[10px] text-amber-900 bg-amber-50/80 p-1.5 rounded mt-1.5 border border-amber-100">
                      {item.duplicateReason}
                    </p>
                  )}

                  {/* Duplicate Override Control */}
                  {item.duplicateStatus === 'possible_duplicate' && (
                    <label className="flex items-center gap-2 mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-900 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(item.allowDuplicateOverride)}
                        onChange={() => handleToggleDuplicateOverride(item.id)}
                        className="rounded border-amber-400 text-amber-700"
                      />
                      <span>Force duplicate import (override collision guard)</span>
                    </label>
                  )}

                  {/* Allowance Confirmation Control */}
                  {item.type === 'income' && item.suggestedCategory === "Father's Allowance" && (
                    <div className="mt-2.5 p-2 bg-indigo-50/90 border border-indigo-200 rounded-lg flex items-center justify-between text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-indigo-950">
                        <input
                          type="checkbox"
                          checked={Boolean(item.isConfirmedAllowance)}
                          onChange={() => handleToggleAllowanceConfirm(item.id)}
                          className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Confirm as Father's Monthly Allowance</span>
                      </label>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${item.isConfirmedAllowance ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {item.isConfirmedAllowance ? 'Confirmed (+Allowance)' : 'Unconfirmed'}
                      </span>
                    </div>
                  )}

                  {/* Inline Selectors */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Category</label>
                      <select
                        value={item.suggestedCategory}
                        onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                        className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-900"
                      >
                        {CATEGORIES_LIST.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Fund Pool</label>
                      <select
                        value={item.suggestedSource}
                        onChange={(e) => handleSourceChange(item.id, e.target.value as FundSource)}
                        className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-slate-900"
                      >
                        <option value="unallocated">Unallocated / Review Needed</option>
                        <option value="father_allowance">Father's Allowance</option>
                        <option value="other_income">Other Income</option>
                        <option value="personal_savings">Personal Savings</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Table View (Desktop & Standard) */
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={previewItems.length > 0 && selectedRows.length === previewItems.length}
                          onChange={(e) => (e.target.checked ? selectAll() : deselectAll())}
                          className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                        />
                      </th>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Fund Pool</th>
                      <th className="py-2.5 px-3">Payment Account</th>
                      <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          !item.selected ? 'bg-slate-50/40 text-slate-400' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={() => toggleSelectRow(item.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                          <div>{formatDate(item.date)}</div>
                          <div className="text-[10px] text-slate-400">{item.time}</div>
                        </td>
                        <td className="py-2.5 px-3 max-w-[220px]">
                          <div className="font-semibold text-slate-900 truncate" title={item.description}>
                            {item.description}
                          </div>
                          {item.referenceNumber && (
                            <div className="text-[10px] font-mono text-slate-400 truncate">
                              Ref: {item.referenceNumber}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.suggestedCategory}
                            onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                            className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 focus:bg-white"
                          >
                            {CATEGORIES_LIST.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          {item.type === 'income' && item.suggestedCategory === "Father's Allowance" && (
                            <label className="flex items-center gap-1.5 mt-1 text-[10px] text-indigo-900 cursor-pointer font-medium whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={Boolean(item.isConfirmedAllowance)}
                                onChange={() => handleToggleAllowanceConfirm(item.id)}
                                className="rounded border-indigo-300 text-indigo-600"
                              />
                              <span className={item.isConfirmedAllowance ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                                {item.isConfirmedAllowance ? 'Confirmed (+Allowance)' : 'Confirm Allowance'}
                              </span>
                            </label>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.suggestedSource}
                            onChange={(e) => handleSourceChange(item.id, e.target.value as FundSource)}
                            className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 focus:bg-white"
                          >
                            <option value="unallocated">Unallocated / Review Needed</option>
                            <option value="father_allowance">Father's Allowance</option>
                            <option value="other_income">Other Income</option>
                            <option value="personal_savings">Personal Savings</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={item.paymentAccount}
                            onChange={(e) => handleAccountChange(item.id, e.target.value)}
                            className="text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-900 focus:bg-white"
                          >
                            {PAYMENT_ACCOUNTS.map((a) => (
                              <option key={a} value={a}>
                                {a}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap font-bold">
                          <span className={item.type === 'income' ? 'text-emerald-700' : 'text-slate-900'}>
                            {item.type === 'income' ? '+' : '−'}
                            {formatINR(item.amount)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {item.duplicateStatus === 'possible_duplicate' ? (
                            <div>
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 rounded-md border border-amber-300"
                                title={item.duplicateReason || 'Matches existing record'}
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                Duplicate
                              </span>
                              <label className="flex items-center gap-1 mt-1 text-[9px] text-amber-900 cursor-pointer font-semibold whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={Boolean(item.allowDuplicateOverride)}
                                  onChange={() => handleToggleDuplicateOverride(item.id)}
                                  className="rounded border-amber-400 text-amber-700"
                                />
                                <span>Force Override</span>
                              </label>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-50 rounded-md">
                              <Check className="w-3 h-3 text-emerald-600" />
                              New
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Confirmation Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-slate-900">
                Ready to Import: {selectedRows.length} of {previewItems.length} transactions
              </span>
              <div className="text-slate-500 font-mono text-[11px]">
                Total Spending: <span className="text-slate-900 font-semibold">{formatINR(totalExpenseToImport)}</span>
                {totalIncomeToImport > 0 && (
                  <> · Total Credits: <span className="text-emerald-700 font-semibold">+{formatINR(totalIncomeToImport)}</span></>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={resetImporter}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={selectedRows.length === 0 || importStatus === 'importing'}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-colors shadow-xs"
              >
                {importStatus === 'importing' ? (
                  <span>Saving to Database...</span>
                ) : (
                  <>
                    <span>Confirm & Import ({selectedRows.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Imported / Success State */}
      {importStatus === 'imported' && importSummary && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-8 text-center space-y-5 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Statement Import Completed!
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Transactions have been recorded in your{' '}
              {isCloudConnected ? 'Supabase PostgreSQL database' : 'local session ledger'} and are now active across your financial reports.
            </p>
          </div>

          {/* Result Metric Cards */}
          <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto font-mono text-center text-xs">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
              <span className="text-[10px] text-emerald-700 uppercase block font-semibold">Imported</span>
              <span className="font-bold text-emerald-900 text-base">{importSummary.importedCount}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Skipped Dups</span>
              <span className="font-bold text-slate-800 text-base">{importSummary.duplicateCount}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase block font-semibold">Failed</span>
              <span className="font-bold text-slate-800 text-base">{importSummary.failedCount}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="px-5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            >
              View Updated Dashboard
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200"
            >
              Open Transaction Ledger
            </button>
            <button
              onClick={resetImporter}
              className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* Pre-Import Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Statement Import"
        subtitle={`Target Destination: ${isCloudConnected ? 'Supabase PostgreSQL Cloud' : 'Local Storage'}`}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">File Name:</span>
              <span className="font-bold text-slate-900 truncate max-w-[200px]">{uploadedFileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Selected Rows:</span>
              <span className="font-bold text-slate-900">{selectedRows.length} transactions</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Spending to Record:</span>
              <span className="font-bold text-slate-900 font-mono">{formatINR(totalExpenseToImport)}</span>
            </div>
            {totalIncomeToImport > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-500">Total Income to Record:</span>
                <span className="font-bold text-emerald-700 font-mono">+{formatINR(totalIncomeToImport)}</span>
              </div>
            )}
          </div>

          {/* Explicit Duplicate Warning if any duplicates are checked */}
          {duplicateSelectedCount > 0 && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1 text-xs text-amber-950">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                Duplicate Warning: {duplicateSelectedCount} Possible Duplicates Selected
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                You have explicitly chosen to include {duplicateSelectedCount} rows that match existing records in your ledger. If you proceed, these entries will be added as new records.
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Review Again
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
            >
              <span>Authorize & Save</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
