import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { toast } from "sonner"
import { ArrowRightLeft, TrendingUp, RefreshCw, Banknote, Building2, Lock, Unlock } from "lucide-react"
import { formatCurrency, cn } from "../lib/utils"
import { supabase } from "../lib/supabase"
import { useTranslation } from "react-i18next"
import { useUserRole } from "../hooks/useUserRole"
import { calculateTransactionMetrics } from "../lib/calculations"

export default function CalculatorPage() {
    const { t } = useTranslation()
    const { isAdmin } = useUserRole()
    // State initialization
    const [currency, setCurrency] = useState<"GBP" | "EUR">(() =>
        (localStorage.getItem('calc_currency') as "GBP" | "EUR") || "GBP"
    )
    const [targetMode, setTargetMode] = useState<"USDT" | "FIAT">(() =>
        (localStorage.getItem('calc_targetMode') as "USDT" | "FIAT") || "FIAT"
    )

    // Inputs - Restored Persistence
    const [amount, setAmount] = useState<string>(() => localStorage.getItem('calc_amount') || "")
    const [fiatBuyRate, setFiatBuyRate] = useState<string>(() => localStorage.getItem('calc_fiatBuyRate') || "")
    const [usdtSellRate, setUsdtSellRate] = useState<string>(() => localStorage.getItem('calc_usdtSellRate') || "")

    // Split Rates - Transient (Fetched automatically)
    const [forexRate, setForexRate] = useState<string>("1.19")
    const [cryptoRate, setCryptoRate] = useState<string>("1.05")

    // Fees - Persistent Preferences
    const [revolutFee, setRevolutFee] = useState<string>(() => localStorage.getItem('calc_revolutFee') || "0.5")
    const [krakenFee, setKrakenFee] = useState<string>(() => localStorage.getItem('calc_krakenFee') || "0.26")

    // New Fields
    const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank">(() =>
        (localStorage.getItem('calc_paymentMethod') as "cash" | "bank") || "cash"
    )
    const [isHybrid, setIsHybrid] = useState(() => localStorage.getItem('calc_isHybrid') === 'true')
    const [isRetained, setIsRetained] = useState(() => localStorage.getItem('calc_isRetained') === 'true')
    const [retainedCurrency, setRetainedCurrency] = useState<'USDT' | 'EUR' | 'GBP'>(() =>
        (localStorage.getItem('calc_retainedCurrency') as 'USDT' | 'EUR' | 'GBP') || 'USDT'
    )
    const [usdtSellRateBank, setUsdtSellRateBank] = useState<string>(() => localStorage.getItem('calc_usdtSellRateBank') || "")
    const [notes, setNotes] = useState<string>(() => localStorage.getItem('calc_notes') || "")
    const [isPrivate, setIsPrivate] = useState<boolean>(() => {
        const stored = localStorage.getItem('calc_isPrivate')
        return stored ? stored === 'true' : true
    })

    const [loadingRates, setLoadingRates] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    // Calculated Values
    const [results, setResults] = useState({
        cost: 0,
        revenue: 0,
        profit: 0,
        profitMargin: 0,
        fiatAmount: 0,
        eurAmount: 0,
        usdtAmount: 0,
        totalFees: 0,
        usdtToCoverCost: 0,
        surplusUsdt: 0,
        returnUsdt: 0
    })

    // Persistence Effect
    useEffect(() => {
        localStorage.setItem('calc_currency', currency)
        localStorage.setItem('calc_targetMode', targetMode)
        localStorage.setItem('calc_amount', amount)
        localStorage.setItem('calc_fiatBuyRate', fiatBuyRate)
        localStorage.setItem('calc_usdtSellRate', usdtSellRate)
        localStorage.setItem('calc_revolutFee', revolutFee)
        localStorage.setItem('calc_krakenFee', krakenFee)
        localStorage.setItem('calc_paymentMethod', paymentMethod)
        localStorage.setItem('calc_isHybrid', String(isHybrid))
        localStorage.setItem('calc_isRetained', String(isRetained))
        localStorage.setItem('calc_retainedCurrency', retainedCurrency)
        localStorage.setItem('calc_usdtSellRateBank', usdtSellRateBank)
        localStorage.setItem('calc_notes', notes)
        localStorage.setItem('calc_isPrivate', String(isPrivate))
    }, [
        currency, targetMode, amount, fiatBuyRate, usdtSellRate,
        revolutFee, krakenFee, paymentMethod, isHybrid, isRetained, retainedCurrency,
        usdtSellRateBank, notes, isPrivate
    ])

    // Auto-fetch rates when currency changes or on mount
    useEffect(() => {
        handleFetchRates()
    }, [currency])

    useEffect(() => {
        calculate()
    }, [amount, fiatBuyRate, usdtSellRate, usdtSellRateBank, isHybrid, forexRate, cryptoRate, targetMode, currency, revolutFee, krakenFee, paymentMethod])

    const handleFetchRates = async () => {
        setLoadingRates(true)
        try {
            console.log("Fetching rates for", currency)
            const { getCompositeRate } = await import('../lib/rates')
            const rates = await getCompositeRate(currency)
            console.log("Fetched rates:", rates)

            if (rates.forexRate > 0) setForexRate(rates.forexRate.toFixed(4))
            if (rates.cryptoRate > 0) setCryptoRate(rates.cryptoRate.toFixed(4))

        } catch (error) {
            console.error("Failed to fetch rates", error)
        } finally {
            setLoadingRates(false)
        }
    }

    const calculate = () => {
        const valAmount = parseFloat(amount) || 0
        const valFiatBuyRate = parseFloat(fiatBuyRate) || 0
        const valUsdtSellRate = parseFloat(usdtSellRate) || 0

        const valForexRate = parseFloat(forexRate) || 1
        const valCryptoRate = parseFloat(cryptoRate) || 1

        const valRevolutFeePct = parseFloat(revolutFee) || 0
        const valKrakenFeePct = parseFloat(krakenFee) || 0

        // Effective rate calculations need to account for fees
        // 1. GBP -> EUR (Revolut)
        // Rate is reduced by fee: EffectiveForex = ForexRate * (1 - Fee/100)
        const effectiveForexRate = valForexRate * (1 - valRevolutFeePct / 100)

        // 2. EUR -> USDT (Kraken)
        // Rate is reduced by fee: EffectiveCrypto = CryptoRate * (1 - Fee/100)
        const effectiveCryptoRate = valCryptoRate * (1 - valKrakenFeePct / 100)

        const effectiveTotalRate = currency === "GBP" ? (effectiveForexRate * effectiveCryptoRate) : effectiveCryptoRate

        let calcFiatAmount = 0
        let calcUsdtAmount = 0
        let calcEurAmount = 0

        // Gross amounts (before fees are applied to the conversion rate) for fee calculation
        let grossFiatAmount = 0
        let grossUsdtAmount = 0

        if (targetMode === "USDT") {
            // I want X USDT
            calcUsdtAmount = valAmount
            grossUsdtAmount = valAmount // Target is already net USDT

            // Calculate gross fiat amount needed if no fees were applied to rates
            grossFiatAmount = valAmount / (currency === "GBP" ? (valForexRate * valCryptoRate) : valCryptoRate)

            if (currency === "GBP") {
                calcFiatAmount = valAmount / effectiveTotalRate
                calcEurAmount = calcFiatAmount * effectiveForexRate
            } else {
                calcFiatAmount = valAmount / effectiveTotalRate
                calcEurAmount = calcFiatAmount // It is EUR
            }
        } else {
            // I have X Fiat (GBP/EUR)
            calcFiatAmount = valAmount
            grossFiatAmount = valAmount // Target is already net Fiat

            // Calculate gross USDT amount if no fees were applied to rates
            grossUsdtAmount = valAmount * (currency === "GBP" ? (valForexRate * valCryptoRate) : valCryptoRate)

            if (currency === "GBP") {
                calcUsdtAmount = valAmount * effectiveTotalRate
                calcEurAmount = calcFiatAmount * effectiveForexRate
            } else {
                calcUsdtAmount = valAmount * effectiveTotalRate
                calcEurAmount = calcFiatAmount // It is EUR
            }
        }

        // Calculate total fees in LYD

        let totalFeesInLYD = 0;
        if (targetMode === "FIAT") {
            // If I have X Fiat, the fees reduce the USDT I get.
            // The "lost" USDT due to fees, converted to LYD.
            const lostUsdt = grossUsdtAmount - calcUsdtAmount;
            totalFeesInLYD = lostUsdt * valUsdtSellRate;
        } else { // targetMode === "USDT"
            // If I want X USDT, the fees increase the Fiat I need.
            // The "extra" Fiat needed due to fees, converted to LYD.
            const extraFiat = calcFiatAmount - grossFiatAmount;
            totalFeesInLYD = extraFiat * valFiatBuyRate;
        }


        const metrics = calculateTransactionMetrics({
            fiatAmount: calcFiatAmount,
            fiatRate: valFiatBuyRate,
            usdtAmount: calcUsdtAmount,
            usdtRate: valUsdtSellRate,
            isHybrid: isHybrid && paymentMethod === 'cash',
            usdtSellRateBank: parseFloat(usdtSellRateBank),
            isRetained: isRetained
        });

        setResults({
            cost: metrics.costLyd,
            revenue: metrics.returnLyd,
            profit: metrics.profitLyd,
            profitMargin: metrics.costLyd > 0 ? (metrics.profitLyd / metrics.costLyd) * 100 : 0,
            fiatAmount: calcFiatAmount,
            eurAmount: calcEurAmount,
            usdtAmount: calcUsdtAmount,
            totalFees: totalFeesInLYD,
            usdtToCoverCost: metrics.usdtToCoverCost,
            surplusUsdt: metrics.surplusUsdt,
            returnUsdt: metrics.returnUsdt
        })
    }

    const handleSaveTransaction = async () => {
        setIsSaving(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                alert("Please login to save transactions")
                return
            }

            const { error } = await supabase.from('transactions').insert({
                user_id: user.id,
                type: currency,
                status: 'planned',

                fiat_amount: results.fiatAmount,
                usdt_amount: results.usdtAmount,

                fiat_buy_rate: parseFloat(fiatBuyRate) || 0,
                usdt_sell_rate: parseFloat(usdtSellRate) || 0,

                forex_rate: parseFloat(forexRate) || 0,
                crypto_rate: parseFloat(cryptoRate) || 0,
                revolut_fee: parseFloat(revolutFee) || 0,
                kraken_fee: parseFloat(krakenFee) || 0,

                payment_method: paymentMethod,
                is_hybrid: isHybrid && paymentMethod === 'cash',
                usdt_sell_rate_bank: (isHybrid && paymentMethod === 'cash') ? (parseFloat(usdtSellRateBank) || 0) : null,
                is_retained: isRetained,
                retained_surplus: isRetained ? results.surplusUsdt : null,
                retained_currency: isRetained ? retainedCurrency : null,
                profit: results.profit,
                notes: notes,
                is_private: isPrivate
            })

            if (error) throw error

            toast.success("Transaction saved successfully!")
            // Optional: Redirect to ledger or clear form

        } catch (error) {
            console.error("Error saving transaction:", error)
            toast.error("Failed to save transaction. Please try again.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="flex flex-col gap-3">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t('calculator.title')}</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                    {t('calculator.subtitle')}
                </p>
            </div>

            <Card className="border-0 shadow-sm">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>{t('calculator.newTransaction')}</CardTitle>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPaymentMethod(m => m === "bank" ? "cash" : "bank")}
                                className="w-24 capitalize rounded-xl"
                            >
                                {paymentMethod}
                                {paymentMethod === "bank" ? <Building2 className="ml-2 h-3 w-3" /> : <Banknote className="ml-2 h-3 w-3" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setCurrency(c => c === "GBP" ? "EUR" : "GBP")
                                    setFiatBuyRate("") // Clear buy rate on currency switch
                                }}
                                className="w-20 rounded-xl"
                            >
                                {currency} <RefreshCw className="ml-2 h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                    <CardDescription>{t('calculator.enterRates')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Input Section */}
                    <div className="grid gap-4">
                        <div className="flex items-end gap-2">
                            <div className="space-y-2 flex-1">
                                <label className="text-sm font-medium">
                                    {t('calculator.amount')} ({targetMode === "USDT" ? "USDT" : currency})
                                </label>
                                <Input
                                    type="number"
                                    placeholder="1000"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="text-lg h-12 rounded-xl"
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="mb-1 rounded-xl"
                                onClick={() => setTargetMode(m => m === "USDT" ? "FIAT" : "USDT")}
                            >
                                <ArrowRightLeft className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    {t('calculator.buy')} ({t('calculator.rate')} LYD / {currency})
                                </label>
                                <Input
                                    type="number"
                                    placeholder={currency === "GBP" ? "7.50" : "6.50"}
                                    value={fiatBuyRate}
                                    onChange={(e) => setFiatBuyRate(e.target.value)}
                                    className="h-11 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">
                                    {paymentMethod === 'cash' && isHybrid ? `${t('calculator.sell')} (Cash Rate)` : t('calculator.sell') + ` (${t('calculator.rate')} LYD / USDT)`}
                                </label>
                                <Input
                                    type="number"
                                    placeholder="6.10"
                                    value={usdtSellRate}
                                    onChange={(e) => setUsdtSellRate(e.target.value)}
                                    className="h-11 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Cost Recovery & Outcome Strategy */}
                        {paymentMethod && (
                            <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 mb-4 space-y-4">
                                {/* Cost Breakdown Summary */}
                                <div className="space-y-1.5 pb-2 border-b border-primary/10">
                                    <div className="flex justify-between text-[11px] text-muted-foreground">
                                        <span>{t('calculator.usdtToCover') || "USDT to cover cost"}:</span>
                                        <span className="font-mono font-bold text-foreground">
                                            {results.usdtToCoverCost.toFixed(2)} USDT
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[11px]">
                                        <span className="text-muted-foreground">{t('calculator.usdtSurplus') || "USDT for profit (Surplus)"}:</span>
                                        <span className="text-primary font-bold">
                                            {results.surplusUsdt.toFixed(2)} USDT
                                        </span>
                                    </div>
                                </div>

                                {/* Option 1: Hybrid Transaction */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <h3 className="font-semibold text-sm">{t('calculator.hybridMode') || "Hybrid Transaction"}</h3>
                                            <p className="text-[10px] text-muted-foreground italic">
                                                {t('calculator.hybridDescShort') || "Sell surplus at a different rate"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsHybrid(!isHybrid);
                                                setIsRetained(false);
                                            }}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                                isHybrid ? "bg-primary" : "bg-muted"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    isHybrid ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>
                                    {isHybrid && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="pt-1"
                                        >
                                            <label className="block text-xs text-muted-foreground mb-1">{t('calculator.bankProfitRate')} (LYD / USDT)</label>
                                            <Input
                                                type="number"
                                                value={usdtSellRateBank}
                                                onChange={(e) => setUsdtSellRateBank(e.target.value)}
                                                className="h-11 text-base border-primary/20 bg-background"
                                            />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Option 2: Retain Surplus */}
                                <div className="space-y-3 pt-2 border-t border-primary/10">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <h3 className="font-semibold text-sm text-blue-600 dark:text-blue-400">
                                                {isRetained
                                                    ? t('calculator.retainedAs', { currency: retainedCurrency })
                                                    : (t('calculator.retainSurplus') || "Retain Surplus")}
                                            </h3>
                                            <p className="text-[10px] text-muted-foreground italic">
                                                {t('calculator.retainDesc') || "Hold surplus offshore instead of selling"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setIsRetained(!isRetained);
                                                setIsHybrid(false);
                                            }}
                                            className={cn(
                                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                                isRetained ? "bg-blue-500" : "bg-muted"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                                    isRetained ? "translate-x-6" : "translate-x-1"
                                                )}
                                            />
                                        </button>
                                    </div>
                                    {isRetained && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            className="space-y-3 pt-1"
                                        >
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    readOnly
                                                    value={results.surplusUsdt.toFixed(2)}
                                                    className="h-11 text-right font-mono font-bold text-blue-600 bg-blue-50/50 border-blue-200"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-blue-400 font-medium">USDT Amount</span>
                                            </div>

                                            <div>
                                                <label className="block text-xs text-muted-foreground mb-2">{t('calculator.retainedCurrency') || "Retained Currency"}</label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(['USDT', 'EUR', 'GBP'] as const).map((currency) => (
                                                        <button
                                                            key={currency}
                                                            type="button"
                                                            onClick={() => setRetainedCurrency(currency)}
                                                            className={cn(
                                                                "h-10 rounded-lg text-xs font-bold transition-all border-2",
                                                                retainedCurrency === currency
                                                                    ? "bg-blue-500 text-white border-blue-500"
                                                                    : "bg-background text-muted-foreground border-border hover:border-blue-300"
                                                            )}
                                                        >
                                                            {currency}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-muted-foreground">
                                    {t('calculator.exchangeRatesFees')}
                                </label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-primary rounded-lg"
                                    onClick={handleFetchRates}
                                    disabled={loadingRates}
                                >
                                    {loadingRates ? (
                                        <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                    )}
                                    {t('calculator.fetchLive')}
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {currency === "GBP" && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-muted-foreground">{t('calculator.revolutRate')}</label>
                                        <Input
                                            type="number"
                                            value={forexRate}
                                            onChange={(e) => setForexRate(e.target.value)}
                                            className="rounded-xl"
                                        />
                                    </div>
                                )}
                                <div className={`space-y-1 ${currency === "EUR" ? "col-span-2" : ""}`}>
                                    <label className="text-[10px] text-muted-foreground">{t('calculator.krakenRate')}</label>
                                    <Input
                                        type="number"
                                        value={cryptoRate}
                                        onChange={(e) => setCryptoRate(e.target.value)}
                                        className="rounded-xl"
                                    />
                                </div>

                                {currency === "GBP" && (
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-muted-foreground">{t('calculator.revolutFee')}</label>
                                        <Input
                                            type="number"
                                            value={revolutFee}
                                            onChange={(e) => setRevolutFee(e.target.value)}
                                            placeholder="0.5"
                                            className="rounded-xl"
                                        />
                                    </div>
                                )}
                                <div className={`space-y-1 ${currency === "EUR" ? "col-span-2" : ""}`}>
                                    <label className="text-[10px] text-muted-foreground">{t('calculator.krakenFee')}</label>
                                    <Input
                                        type="number"
                                        value={krakenFee}
                                        onChange={(e) => setKrakenFee(e.target.value)}
                                        placeholder="0.26"
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            {currency === "GBP" && (
                                <p className="text-[10px] text-muted-foreground text-right mt-1">
                                    {t('calculator.effectiveRate')}: 1 GBP ≈ {((parseFloat(forexRate) || 0) * (1 - (parseFloat(revolutFee) || 0) / 100) * (parseFloat(cryptoRate) || 0) * (1 - (parseFloat(krakenFee) || 0) / 100)).toFixed(4)} USDT
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="pt-4 border-t">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('calculator.notes')}</label>
                            <Input
                                placeholder={t('calculator.notesPlaceholder')}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="h-11 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 p-6 space-y-3 border border-border/50">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('calculator.input')} {currency}</span>
                            <span className="font-mono font-medium">{results.fiatAmount.toFixed(2)}</span>
                        </div>

                        {currency === "GBP" && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('calculator.converted')} EUR {t('calculator.afterFees')}</span>
                                <span className="font-mono font-medium">{results.eurAmount.toFixed(2)}</span>
                            </div>
                        )}

                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('calculator.resulting')} USDT {t('calculator.afterFees')}</span>
                            <span className="font-mono font-medium">{results.usdtAmount.toFixed(2)}</span>
                        </div>

                        <div className="border-t border-border/50 my-2"></div>

                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('calculator.cost')} (LYD)</span>
                            <div className="flex flex-col items-end">
                                <span className="font-mono font-medium">{formatCurrency(results.cost, 'LYD')}</span>
                                <span className="font-mono text-[10px] text-muted-foreground/50">{results.usdtToCoverCost.toFixed(2)} USDT</span>
                            </div>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">{t('calculator.return')} (LYD)</span>
                            <div className="flex flex-col items-end">
                                <span className="font-mono font-medium">{formatCurrency(results.revenue, 'LYD')}</span>
                                <span className="font-mono text-[10px] text-muted-foreground/50">{results.returnUsdt.toFixed(2)} USDT</span>
                            </div>
                        </div>

                        <div className="border-t border-border/50 my-2"></div>

                        <div className="flex justify-between items-end">
                            <span className="font-bold text-lg">{t('calculator.profit')}</span>
                            <div className="text-right">
                                <div className={`text-2xl font-bold ${results.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {formatCurrency(results.profit, 'LYD')}
                                </div>
                                <div className={`text-xs font-mono ${results.profit >= 0 ? 'text-green-500/60' : 'text-red-500/60'}`}>
                                    {((results.revenue - results.cost) / (parseFloat(usdtSellRate) || 1)).toFixed(2)} USDT
                                </div>
                                <div className={`text-xs ${results.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {results.profitMargin.toFixed(2)}% {t('calculator.margin')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsPrivate(!isPrivate)}
                                    className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border",
                                        isPrivate
                                            ? "bg-red-500/10 text-red-600 border-red-200"
                                            : "bg-green-500/10 text-green-600 border-green-200"
                                    )}
                                >
                                    {isPrivate ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                    {isPrivate ? t('calculator.private') : t('calculator.public')}
                                </button>
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {isPrivate ? t('calculator.onlyAdmins') : t('calculator.visibleToEveryone')}
                            </span>
                        </div>
                    )}

                    <Button
                        className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 rounded-xl"
                        size="lg"
                        onClick={handleSaveTransaction}
                        disabled={isSaving}
                    >
                        {isSaving ? (
                            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <TrendingUp className="mr-2 h-5 w-5" />
                        )}
                        {isSaving ? t('calculator.saving') : t('calculator.save')}
                    </Button>
                </CardContent>
            </Card>
        </motion.div>
    )
}
