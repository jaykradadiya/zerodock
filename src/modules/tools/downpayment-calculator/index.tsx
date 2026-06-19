import { useState, useEffect } from 'react';
import { 
  Calculator, 
  Copy, 
  Check, 
  Calendar, 
  DollarSign, 
  Percent, 
  AlertTriangle
} from 'lucide-react';

import { 
  type DownpaymentType, 
  type InterestType, 
  type FrequencyType, 
  type TargetMode, 
  type SchedulePeriod,
  getFrequencyConfig,
  calculateSchedule
} from './calculatorService';

export default function DownpaymentCalculator() {
  // --- Target Mode State ---
  const [targetMode, setTargetMode] = useState<TargetMode>('payment');

  // --- Input State ---
  const [totalAmount, setTotalAmount] = useState<string>('5000');
  const [downpaymentType, setDownpaymentType] = useState<DownpaymentType>('percentage');
  const [downpaymentValue, setDownpaymentValue] = useState<string>('20');
  const [installmentCount, setInstallmentCount] = useState<number>(12);
  const [customPaymentAmount, setCustomPaymentAmount] = useState<string>('400');
  const [interestRate, setInterestRate] = useState<string>('5.5');
  const [interestType, setInterestType] = useState<InterestType>('amortized');
  const [frequency, setFrequency] = useState<FrequencyType>('monthly');
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // --- Output State ---
  const [downpaymentAmount, setDownpaymentAmount] = useState<number>(0);
  const [financedPrincipal, setFinancedPrincipal] = useState<number>(0);
  const [calculatedInstallmentCount, setCalculatedInstallmentCount] = useState<number>(0);
  const [installmentPayment, setInstallmentPayment] = useState<number>(0);
  const [totalInterest, setTotalInterest] = useState<number>(0);
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [schedule, setSchedule] = useState<SchedulePeriod[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // --- Calculations ---
  useEffect(() => {
    const total = parseFloat(totalAmount) || 0;
    const dpVal = parseFloat(downpaymentValue) || 0;
    const rateVal = parseFloat(interestRate) || 0;
    const inputPayment = parseFloat(customPaymentAmount) || 0;

    const result = calculateSchedule({
      targetMode,
      totalAmount: total,
      downpaymentType,
      downpaymentValue: dpVal,
      installmentCount,
      customPaymentAmount: inputPayment,
      interestRate: rateVal,
      interestType,
      frequency,
      startDate,
    });

    setDownpaymentAmount(result.downpaymentAmount);
    setFinancedPrincipal(result.financedPrincipal);
    setCalculatedInstallmentCount(result.calculatedInstallmentCount);
    setInstallmentPayment(result.installmentPayment);
    setTotalInterest(result.totalInterest);
    setGrandTotal(result.grandTotal);
    setSchedule(result.schedule);
    setCalculationError(result.calculationError);
  }, [totalAmount, downpaymentType, downpaymentValue, installmentCount, customPaymentAmount, interestRate, interestType, frequency, startDate, targetMode]);

  // --- Copy Summary Clipboard Helper ---
  const copySummary = async () => {
    const freqConfig = getFrequencyConfig(frequency);
    let summaryText = `--- DOWNPAYMENT & INSTALLMENT SUMMARY ---
Total Purchase Price: $${parseFloat(totalAmount).toFixed(2)}
Down Payment (${downpaymentType === 'percentage' ? `${downpaymentValue}%` : '$'}): $${downpaymentAmount.toFixed(2)}
Amount Financed: $${financedPrincipal.toFixed(2)}
Interest Rate: ${interestRate}% (${interestType === 'amortized' ? 'Compounding Amortized' : 'Simple Interest'})
Payment Frequency: ${freqConfig.label}
Installments Count: ${calculatedInstallmentCount} payments
Installment Payment: $${installmentPayment.toFixed(2)} per period
Total Interest Cost: $${totalInterest.toFixed(2)}
Total Paid Overall: $${grandTotal.toFixed(2)}

--- SCHEDULE BREAKDOWN ---
`;

    schedule.forEach((item) => {
      summaryText += `Payment #${item.period} | Due: ${item.dueDate} | Payment: $${item.payment.toFixed(2)} (Principal: $${item.principal.toFixed(2)}, Interest: $${item.interest.toFixed(2)}) | Bal: $${item.remainingBalance.toFixed(2)}\n`;
    });

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 md:p-8 w-full max-w-7xl mx-auto h-full min-h-0">
      
      {/* Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
            <Calculator className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Downpayment & Installment Calculator
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Calculate down payment portions, installment amounts, and payback schedules.
            </p>
          </div>
        </div>
        
        {schedule.length > 0 && !calculationError && (
          <button
            onClick={copySummary}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 shadow-sm transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500">Copied Summary!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Summary & Schedule</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Panel Layout */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1 min-h-0">
        
        {/* Left Form Column (Inputs) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-6">
          
          {/* Target Mode Toggle */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Calculation Target
            </label>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-full">
              <button
                type="button"
                onClick={() => setTargetMode('payment')}
                className={`flex-1 py-2 rounded-lg font-medium text-xs transition-all ${
                  targetMode === 'payment' 
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Determine Payment Size
              </button>
              <button
                type="button"
                onClick={() => setTargetMode('term')}
                className={`flex-1 py-2 rounded-lg font-medium text-xs transition-all ${
                  targetMode === 'term' 
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Determine Term Length
              </button>
            </div>
          </div>

          {/* Purchase Price Input */}
          <div className="space-y-2">
            <label htmlFor="purchase-amount" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Purchase Amount
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="h-5 w-5 text-slate-400" />
              </div>
              <input
                id="purchase-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-950 dark:text-slate-50 font-semibold focus:outline-none transition-all"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Downpayment Fields */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="downpayment-value" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Down Payment
              </label>
              
              {/* Type Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setDownpaymentType('percentage');
                    setDownpaymentValue('20');
                  }}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    downpaymentType === 'percentage' 
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5 inline mr-0.5" /> Percent
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDownpaymentType('fixed');
                    const currentTotal = parseFloat(totalAmount) || 0;
                    setDownpaymentValue(String(Math.round(currentTotal * 0.2)));
                  }}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    downpaymentType === 'fixed' 
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <DollarSign className="w-3.5 h-3.5 inline mr-0.5" /> Amount
                </button>
              </div>
            </div>

            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {downpaymentType === 'fixed' ? (
                  <DollarSign className="h-4 w-4 text-slate-400" />
                ) : (
                  <Percent className="h-4 w-4 text-slate-400" />
                )}
              </div>
              <input
                id="downpayment-value"
                type="number"
                min="0"
                step="any"
                value={downpaymentValue}
                onChange={(e) => setDownpaymentValue(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-950 dark:text-slate-50 font-semibold focus:outline-none transition-all"
                placeholder={downpaymentType === 'fixed' ? '0.00' : '20'}
              />
            </div>
            
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Down Payment Amount: <span className="font-semibold text-slate-700 dark:text-slate-300">${downpaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </p>
          </div>

          {/* Dynamic Row: Input Installment Count OR Custom Payment Size */}
          {targetMode === 'payment' ? (
            /* Mode A: Installments Count Slider */
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label htmlFor="installment-count" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Installment Count
                </label>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/30">
                  {installmentCount} payments
                </span>
              </div>
              <input
                id="installment-count"
                type="range"
                min="1"
                max="60"
                value={installmentCount}
                onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 1)}
                className="w-full accent-purple-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                <span>1 payment</span>
                <span>12</span>
                <span>24</span>
                <span>36</span>
                <span>48</span>
                <span>60 payments</span>
              </div>
            </div>
          ) : (
            /* Mode B: Custom Payment Amount Input */
            <div className="space-y-2">
              <label htmlFor="custom-payment" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Target Payment Size
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <DollarSign className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="custom-payment"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customPaymentAmount}
                  onChange={(e) => setCustomPaymentAmount(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-950 dark:text-slate-50 font-semibold focus:outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Specify your ideal period installment payment to compute the timeline.
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-slate-100 dark:border-slate-800" />

          {/* Interest & Frequency Configuration */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Interest Rate */}
            <div className="space-y-2">
              <label htmlFor="interest-rate" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Interest Rate (APR)
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="interest-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="block w-full pr-8 pl-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-950 dark:text-slate-50 font-semibold focus:outline-none transition-all"
                  placeholder="0.00"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400 font-semibold text-sm">
                  %
                </div>
              </div>
            </div>

            {/* Interest Type */}
            <div className="space-y-2">
              <label htmlFor="interest-type" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Interest Method
              </label>
              <select
                id="interest-type"
                value={interestType}
                disabled={parseFloat(interestRate) === 0}
                onChange={(e) => setInterestType(e.target.value as InterestType)}
                className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none transition-all disabled:opacity-50 text-sm"
              >
                <option value="amortized">Amortized</option>
                <option value="simple">Simple / Flat</option>
              </select>
            </div>

          </div>

          <div className="grid grid-cols-2 gap-4">
            
            {/* Frequency */}
            <div className="space-y-2">
              <label htmlFor="frequency" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Frequency
              </label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as FrequencyType)}
                className="block w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 bg-transparent dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none transition-all text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-2">
              <label htmlFor="start-date" className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                First Payment Date
              </label>
              <div className="relative rounded-xl shadow-sm">
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-200 dark:border-slate-800 bg-transparent rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none transition-all text-sm"
                />
              </div>
            </div>

          </div>

        </div>

        {/* Right Output Column */}
        <div className="lg:col-span-7 flex flex-col gap-6 h-full min-h-0">
          
          {/* Error display */}
          {calculationError ? (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-xl flex gap-3 text-sm text-amber-800 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
              <div>
                <span className="font-bold">Calculation Limit Encountered:</span>
                <p className="mt-1 leading-relaxed">{calculationError}</p>
              </div>
            </div>
          ) : null}

          {/* Output Dashboard Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            
            {/* Downpayment amount card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Down Payment
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ${downpaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                {downpaymentType === 'percentage' ? `${downpaymentValue}% upfront` : 'Fixed cash upfront'}
              </span>
            </div>

            {/* Financed amount card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Financed Amount
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ${financedPrincipal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                Remaining principal balance
              </span>
            </div>

            {/* Term length / installment count card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-purple-200 dark:border-purple-900/30 bg-purple-50/10 dark:bg-purple-950/5 shadow-sm col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block mb-1">
                {targetMode === 'payment' ? 'Installment Payment' : 'Calculated Term Length'}
              </span>
              {targetMode === 'payment' ? (
                <>
                  <span className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
                    ${installmentPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 block mt-1">
                    per {getFrequencyConfig(frequency).label.toLowerCase()}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
                    {calculationError ? '--' : `${calculatedInstallmentCount} payments`}
                  </span>
                  <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 block mt-1">
                    estimated period cycles
                  </span>
                </>
              )}
            </div>

            {/* Interest amount card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Finance Interest
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {calculationError ? '--' : `$${totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                Total interest fee charges
              </span>
            </div>

            {/* Grand total card */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                Total Cost (Principal + Interest)
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {calculationError ? '--' : `$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1">
                Downpayment + all installment payments
              </span>
            </div>

          </div>

          {/* Payment Schedule Card */}
          <div className="flex-1 min-h-[300px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
            
            <div className="px-5 py-3 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-500" />
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Payment Schedule Breakdown
                </span>
              </div>
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 font-semibold">
                {calculationError ? '0' : schedule.length} payments
              </span>
            </div>

            {/* Schedule Table Area */}
            <div className="flex-1 overflow-auto">
              {schedule.length === 0 || calculationError ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 p-8">
                  <Calculator className="w-8 h-8 opacity-40 mb-2 animate-bounce" />
                  <p className="text-sm font-medium">Enter amount & parameters to generate schedule</p>
                </div>
              ) : (
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                    <thead className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-left">
                      <tr>
                        <th className="px-4 py-2.5">Pmts #</th>
                        <th className="px-4 py-2.5">Due Date</th>
                        <th className="px-4 py-2.5 text-right">Payment</th>
                        <th className="px-4 py-2.5 text-right">Principal</th>
                        <th className="px-4 py-2.5 text-right">Interest</th>
                        <th className="px-4 py-2.5 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-350">
                      
                      {/* Downpayment Row */}
                      <tr className="bg-slate-50/50 dark:bg-slate-800/10 font-semibold">
                        <td className="px-4 py-2">0</td>
                        <td className="px-4 py-2 text-slate-500">Upfront</td>
                        <td className="px-4 py-2 text-right text-slate-900 dark:text-slate-200">
                          ${downpaymentAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">
                          ${downpaymentAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">$0.00</td>
                        <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                          ${financedPrincipal.toFixed(2)}
                        </td>
                      </tr>

                      {/* Installment rows */}
                      {schedule.map((item) => (
                        <tr key={item.period} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/5 transition-colors">
                          <td className="px-4 py-2 font-medium">{item.period}</td>
                          <td className="px-4 py-2 text-slate-500 dark:text-slate-400">{item.dueDate}</td>
                          <td className="px-4 py-2 text-right font-semibold text-slate-950 dark:text-slate-50">
                            ${item.payment.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                            ${item.principal.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600 dark:text-slate-400">
                            ${item.interest.toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-500">
                            ${item.remainingBalance.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
