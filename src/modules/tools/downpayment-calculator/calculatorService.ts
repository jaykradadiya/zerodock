export type DownpaymentType = 'percentage' | 'fixed';
export type InterestType = 'amortized' | 'simple';
export type FrequencyType = 'weekly' | 'biweekly' | 'monthly';
export type TargetMode = 'payment' | 'term';

export interface SchedulePeriod {
  period: number;
  dueDate: string;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface CalculatorParams {
  targetMode: TargetMode;
  totalAmount: number;
  downpaymentType: DownpaymentType;
  downpaymentValue: number;
  installmentCount: number;
  customPaymentAmount: number;
  interestRate: number;
  interestType: InterestType;
  frequency: FrequencyType;
  startDate: string;
}

export interface CalculationResult {
  downpaymentAmount: number;
  financedPrincipal: number;
  calculatedInstallmentCount: number;
  installmentPayment: number;
  totalInterest: number;
  grandTotal: number;
  schedule: SchedulePeriod[];
  calculationError: string | null;
}

export function getFrequencyConfig(freq: FrequencyType) {
  switch (freq) {
    case 'weekly':
      return { label: 'Weekly', periodsPerYear: 52, daysBetween: 7 };
    case 'biweekly':
      return { label: 'Bi-weekly', periodsPerYear: 26, daysBetween: 14 };
    case 'monthly':
    default:
      return { label: 'Monthly', periodsPerYear: 12, daysBetween: 30 };
  }
}

export function calculateSchedule(params: CalculatorParams): CalculationResult {
  const {
    targetMode,
    totalAmount,
    downpaymentType,
    downpaymentValue,
    installmentCount,
    customPaymentAmount,
    interestRate,
    interestType,
    frequency,
    startDate,
  } = params;

  // 1. Calculate Downpayment
  let dpAmt = 0;
  if (downpaymentType === 'percentage') {
    dpAmt = totalAmount * (Math.min(100, Math.max(0, downpaymentValue)) / 100);
  } else {
    dpAmt = Math.min(totalAmount, Math.max(0, downpaymentValue));
  }
  dpAmt = Math.round(dpAmt * 100) / 100;

  // 2. Financed Principal
  const principal = Math.max(0, totalAmount - dpAmt);
  const config = getFrequencyConfig(frequency);
  const annualRate = interestRate / 100;

  let periodPayment = 0;
  let computedInterest = 0;
  let finalInstallmentCount = installmentCount;
  const localSchedule: SchedulePeriod[] = [];
  let calculationError: string | null = null;

  if (principal <= 0) {
    return {
      downpaymentAmount: dpAmt,
      financedPrincipal: 0,
      calculatedInstallmentCount: 0,
      installmentPayment: 0,
      totalInterest: 0,
      grandTotal: dpAmt,
      schedule: [],
      calculationError: null,
    };
  }

  if (targetMode === 'payment') {
    // Mode A: Calculate periodic payment given N (installment count)
    if (installmentCount <= 0) {
      return {
        downpaymentAmount: dpAmt,
        financedPrincipal: principal,
        calculatedInstallmentCount: 0,
        installmentPayment: 0,
        totalInterest: 0,
        grandTotal: dpAmt + principal,
        schedule: [],
        calculationError: null,
      };
    }

    if (interestRate === 0) {
      // Flat Split (0% Interest)
      periodPayment = principal / installmentCount;
      periodPayment = Math.round(periodPayment * 100) / 100;
      computedInterest = 0;

      let remaining = principal;
      const currentDay = new Date(startDate);

      for (let i = 1; i <= installmentCount; i++) {
        if (i > 1) {
          if (frequency === 'monthly') {
            currentDay.setMonth(currentDay.getMonth() + 1);
          } else {
            currentDay.setDate(currentDay.getDate() + config.daysBetween);
          }
        }

        let payVal = periodPayment;
        if (i === installmentCount) {
          payVal = Math.round(remaining * 100) / 100;
        }
        remaining = Math.max(0, remaining - payVal);

        localSchedule.push({
          period: i,
          dueDate: currentDay.toLocaleDateString(undefined, { 
            year: 'numeric', month: 'short', day: 'numeric' 
          }),
          payment: payVal,
          principal: payVal,
          interest: 0,
          remainingBalance: Math.round(remaining * 100) / 100
        });
      }
    } else {
      // With Interest
      if (interestType === 'amortized') {
        const ratePerPeriod = annualRate / config.periodsPerYear;
        const compoundFactor = Math.pow(1 + ratePerPeriod, installmentCount);
        periodPayment = principal * (ratePerPeriod * compoundFactor) / (compoundFactor - 1);
        periodPayment = Math.round(periodPayment * 100) / 100;

        let remaining = principal;
        const currentDay = new Date(startDate);

        for (let i = 1; i <= installmentCount; i++) {
          if (i > 1) {
            if (frequency === 'monthly') {
              currentDay.setMonth(currentDay.getMonth() + 1);
            } else {
              currentDay.setDate(currentDay.getDate() + config.daysBetween);
            }
          }

          const interestPortion = Math.round((remaining * ratePerPeriod) * 100) / 100;
          let principalPortion = Math.round((periodPayment - interestPortion) * 100) / 100;
          
          let finalPayment = periodPayment;
          if (i === installmentCount) {
            principalPortion = remaining;
            finalPayment = Math.round((principalPortion + interestPortion) * 100) / 100;
          }

          remaining = Math.max(0, remaining - principalPortion);
          computedInterest += interestPortion;

          localSchedule.push({
            period: i,
            dueDate: currentDay.toLocaleDateString(undefined, { 
              year: 'numeric', month: 'short', day: 'numeric' 
            }),
            payment: finalPayment,
            principal: principalPortion,
            interest: interestPortion,
            remainingBalance: Math.round(remaining * 100) / 100
          });
        }
      } else {
        // Simple Interest
        const years = installmentCount / config.periodsPerYear;
        computedInterest = Math.round((principal * annualRate * years) * 100) / 100;
        const totalDebt = principal + computedInterest;
        periodPayment = totalDebt / installmentCount;
        periodPayment = Math.round(periodPayment * 100) / 100;

        let remainingPrincipal = principal;
        let remainingTotal = totalDebt;
        const currentDay = new Date(startDate);

        const interestPerPeriod = computedInterest / installmentCount;
        const principalPerPeriod = principal / installmentCount;

        for (let i = 1; i <= installmentCount; i++) {
          if (i > 1) {
            if (frequency === 'monthly') {
              currentDay.setMonth(currentDay.getMonth() + 1);
            } else {
              currentDay.setDate(currentDay.getDate() + config.daysBetween);
            }
          }

          let payVal = periodPayment;
          let pPortion = Math.round(principalPerPeriod * 100) / 100;
          let iPortion = Math.round(interestPerPeriod * 100) / 100;

          if (i === installmentCount) {
            payVal = Math.round(remainingTotal * 100) / 100;
            pPortion = Math.round(remainingPrincipal * 100) / 100;
            iPortion = Math.max(0, payVal - pPortion);
          }

          remainingPrincipal = Math.max(0, remainingPrincipal - pPortion);
          remainingTotal = Math.max(0, remainingTotal - payVal);

          localSchedule.push({
            period: i,
            dueDate: currentDay.toLocaleDateString(undefined, { 
              year: 'numeric', month: 'short', day: 'numeric' 
            }),
            payment: payVal,
            principal: pPortion,
            interest: iPortion,
            remainingBalance: Math.round(remainingPrincipal * 100) / 100
          });
        }
      }
    }
  } else {
    // Mode B: Calculate installment count given payment amount
    if (customPaymentAmount <= 0) {
      calculationError = 'Please enter a valid installment payment amount.';
      return {
        downpaymentAmount: dpAmt,
        financedPrincipal: principal,
        calculatedInstallmentCount: 0,
        installmentPayment: 0,
        totalInterest: 0,
        grandTotal: dpAmt + principal,
        schedule: [],
        calculationError,
      };
    }

    periodPayment = customPaymentAmount;

    if (interestRate === 0) {
      // Flat Split (0% Interest)
      const rawCount = principal / periodPayment;
      finalInstallmentCount = Math.ceil(rawCount);

      if (finalInstallmentCount > 1000) {
        calculationError = 'The payment amount is too low relative to the financed principal, resulting in > 1000 installments. Please increase the payment.';
        finalInstallmentCount = 0;
      } else {
        let remaining = principal;
        const currentDay = new Date(startDate);

        for (let i = 1; i <= finalInstallmentCount; i++) {
          if (i > 1) {
            if (frequency === 'monthly') {
              currentDay.setMonth(currentDay.getMonth() + 1);
            } else {
              currentDay.setDate(currentDay.getDate() + config.daysBetween);
            }
          }

          let payVal = periodPayment;
          if (i === finalInstallmentCount) {
            payVal = Math.round(remaining * 100) / 100;
          }
          remaining = Math.max(0, remaining - payVal);

          localSchedule.push({
            period: i,
            dueDate: currentDay.toLocaleDateString(undefined, { 
              year: 'numeric', month: 'short', day: 'numeric' 
            }),
            payment: payVal,
            principal: payVal,
            interest: 0,
            remainingBalance: Math.round(remaining * 100) / 100
          });
        }
      }
    } else {
      // With Interest
      if (interestType === 'amortized') {
        const ratePerPeriod = annualRate / config.periodsPerYear;

        // Check if periodic payment covers interest
        const firstPeriodInterest = principal * ratePerPeriod;
        if (periodPayment <= firstPeriodInterest) {
          calculationError = `Payment amount ($${periodPayment.toFixed(2)}) is less than or equal to the periodic interest accrued ($${firstPeriodInterest.toFixed(2)}). The debt will never be paid off.`;
          finalInstallmentCount = 0;
        } else {
          // N = - ln(1 - (P * r / PMT)) / ln(1 + r)
          const rawCount = -Math.log(1 - (principal * ratePerPeriod / periodPayment)) / Math.log(1 + ratePerPeriod);
          finalInstallmentCount = Math.ceil(rawCount);

          if (finalInstallmentCount > 1000) {
            calculationError = 'Calculated installment count exceeds 1000 periods. Please increase the payment amount.';
            finalInstallmentCount = 0;
          } else {
            let remaining = principal;
            const currentDay = new Date(startDate);

            for (let i = 1; i <= finalInstallmentCount; i++) {
              if (i > 1) {
                if (frequency === 'monthly') {
                  currentDay.setMonth(currentDay.getMonth() + 1);
                } else {
                  currentDay.setDate(currentDay.getDate() + config.daysBetween);
                }
              }

              const interestPortion = Math.round((remaining * ratePerPeriod) * 100) / 100;
              let principalPortion = Math.round((periodPayment - interestPortion) * 100) / 100;

              let finalPayment = periodPayment;
              if (i === finalInstallmentCount) {
                principalPortion = remaining;
                finalPayment = Math.round((principalPortion + interestPortion) * 100) / 100;
              }

              remaining = Math.max(0, remaining - principalPortion);
              computedInterest += interestPortion;

              localSchedule.push({
                period: i,
                dueDate: currentDay.toLocaleDateString(undefined, { 
                  year: 'numeric', month: 'short', day: 'numeric' 
                }),
                payment: finalPayment,
                principal: principalPortion,
                interest: interestPortion,
                remainingBalance: Math.round(remaining * 100) / 100
              });
            }
          }
        }
      } else {
        // Simple Interest
        const periodicInterestCost = (principal * annualRate) / config.periodsPerYear;
        if (periodPayment <= periodicInterestCost) {
          calculationError = `Payment amount ($${periodPayment.toFixed(2)}) must be greater than periodic simple interest accrued ($${periodicInterestCost.toFixed(2)}) to reduce principal.`;
          finalInstallmentCount = 0;
        } else {
          const rawCount = principal / (periodPayment - periodicInterestCost);
          finalInstallmentCount = Math.ceil(rawCount);

          if (finalInstallmentCount > 1000) {
            calculationError = 'Calculated installment count exceeds 1000 periods. Please increase the payment amount.';
            finalInstallmentCount = 0;
          } else {
            const years = finalInstallmentCount / config.periodsPerYear;
            computedInterest = Math.round((principal * annualRate * years) * 100) / 100;
            const totalDebt = principal + computedInterest;

            let remainingPrincipal = principal;
            let remainingTotal = totalDebt;
            const currentDay = new Date(startDate);

            const interestPerPeriod = computedInterest / finalInstallmentCount;
            const principalPerPeriod = principal / finalInstallmentCount;

            for (let i = 1; i <= finalInstallmentCount; i++) {
              if (i > 1) {
                if (frequency === 'monthly') {
                  currentDay.setMonth(currentDay.getMonth() + 1);
                } else {
                  currentDay.setDate(currentDay.getDate() + config.daysBetween);
                }
              }

              let payVal = periodPayment;
              let pPortion = Math.round(principalPerPeriod * 100) / 100;
              let iPortion = Math.round(interestPerPeriod * 100) / 100;

              if (i === finalInstallmentCount) {
                payVal = Math.round(remainingTotal * 100) / 100;
                pPortion = Math.round(remainingPrincipal * 100) / 100;
                iPortion = Math.max(0, payVal - pPortion);
              }

              remainingPrincipal = Math.max(0, remainingPrincipal - pPortion);
              remainingTotal = Math.max(0, remainingTotal - payVal);

              localSchedule.push({
                period: i,
                dueDate: currentDay.toLocaleDateString(undefined, { 
                  year: 'numeric', month: 'short', day: 'numeric' 
                }),
                payment: payVal,
                principal: pPortion,
                interest: iPortion,
                remainingBalance: Math.round(remainingPrincipal * 100) / 100
              });
            }
          }
        }
      }
    }
  }

  return {
    downpaymentAmount: dpAmt,
    financedPrincipal: principal,
    calculatedInstallmentCount: finalInstallmentCount,
    installmentPayment: Math.max(0, periodPayment),
    totalInterest: Math.round(computedInterest * 100) / 100,
    grandTotal: Math.round((dpAmt + principal + computedInterest) * 100) / 100,
    schedule: localSchedule,
    calculationError,
  };
}
