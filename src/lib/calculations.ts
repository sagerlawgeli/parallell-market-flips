/**
 * Centralized calculation logic for transaction metrics.
 * Ensures consistent values across Calculator, Transaction Card, and Edit Drawer.
 */

export interface TransactionMetricsInput {
    fiatAmount: number;
    fiatRate: number;
    usdtAmount: number;
    usdtRate: number;
    isHybrid?: boolean;
    usdtSellRateBank?: number | null;
    isRetained?: boolean;
}

export interface TransactionMetrics {
    costLyd: number;
    usdtToCoverCost: number;
    surplusUsdt: number;
    profitLyd: number;        // Total valuation profit
    realizedProfitLyd: number; // Only what's realized in LYD
    returnLyd: number;        // Total valuation return
    realizedReturnLyd: number; // Only what's realized in LYD
    returnUsdt: number;       // USDT returned to cash/bank
}

export function calculateTransactionMetrics(input: TransactionMetricsInput): TransactionMetrics {
    const {
        fiatAmount,
        fiatRate,
        usdtAmount,
        usdtRate,
        isHybrid = false,
        usdtSellRateBank = null,
        isRetained = false
    } = input;

    // 1. Core Cost in LYD
    const costLyd = fiatAmount * fiatRate;

    // 2. USDT Needed to Cover Cost
    const usdtToCoverCost = usdtRate > 0 ? costLyd / usdtRate : 0;

    // 3. USDT Surplus available for profit
    const surplusUsdt = Math.max(0, usdtAmount - usdtToCoverCost);

    let profitLyd = 0;
    let realizedProfitLyd = 0;
    let returnLyd = 0;
    let realizedReturnLyd = 0;
    let returnUsdt = usdtAmount;

    if (isHybrid) {
        // Option 1: Hybrid - Sell surplus at bank rate (Fully Realized)
        const bankRate = usdtSellRateBank || usdtRate;
        profitLyd = surplusUsdt * bankRate;
        realizedProfitLyd = profitLyd;
        returnLyd = costLyd + profitLyd;
        realizedReturnLyd = returnLyd;
    } else if (isRetained) {
        // Option 2: Retained - Keep surplus offshore (Valuation Only)
        profitLyd = surplusUsdt * usdtRate; // Valuation profit at today's rate
        realizedProfitLyd = 0;               // Nothing realized in LYD
        returnLyd = costLyd + profitLyd;     // Full valuation
        realizedReturnLyd = costLyd;         // Only cost recovered in LYD
        // returnUsdt remains usdtAmount to show the full transaction scope
    } else {
        // Option 3: Standard - Sell everything at USDT rate (Fully Realized)
        returnLyd = usdtAmount * usdtRate;
        realizedReturnLyd = returnLyd;
        profitLyd = returnLyd - costLyd;
        realizedProfitLyd = profitLyd;
    }

    return {
        costLyd,
        usdtToCoverCost,
        surplusUsdt,
        profitLyd,
        realizedProfitLyd,
        returnLyd,
        realizedReturnLyd,
        returnUsdt
    };
}
