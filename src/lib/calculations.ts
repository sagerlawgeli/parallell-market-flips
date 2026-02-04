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
    profitLyd: number;
    returnLyd: number;
    returnUsdt: number;
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

    // 2. USDT Needed to Cover Cost (Standardized Calculation)
    const usdtToCoverCost = usdtRate > 0 ? costLyd / usdtRate : 0;

    // 3. USDT Surplus available for profit
    const surplusUsdt = Math.max(0, usdtAmount - usdtToCoverCost);

    let profitLyd = 0;
    let returnLyd = 0;
    let returnUsdt = usdtAmount;

    if (isHybrid) {
        // Option 1: Hybrid - Sell surplus at bank rate
        const bankRate = usdtSellRateBank || usdtRate;
        profitLyd = surplusUsdt * bankRate;
        returnLyd = costLyd + profitLyd;
        // Total USDT involved remains the same
    } else if (isRetained) {
        // Option 2: Retained - Keep surplus offshore
        profitLyd = 0; // Realized LYD profit is 0
        returnLyd = costLyd; // Only recovering cost in LYD
        returnUsdt = usdtToCoverCost; // USDT actually "returned" to cash/bank
    } else {
        // Option 3: Standard - Sell everything at USDT rate
        returnLyd = usdtAmount * usdtRate;
        profitLyd = returnLyd - costLyd;
    }

    return {
        costLyd,
        usdtToCoverCost,
        surplusUsdt,
        profitLyd,
        returnLyd,
        returnUsdt
    };
}
