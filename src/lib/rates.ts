export async function getCryptoPrice(): Promise<number> {
    try {
        // 1. Try CoinGecko (USDT)
        const proxyUrl = 'https://api.allorigins.win/raw?url='
        const targetUrl = 'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=eur'

        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl))
        const data = await response.json()

        if (data.tether && data.tether.eur) {
            return 1 / data.tether.eur
        }

        // 2. Fallback/Sanity Check: Use Forex Rate (EUR -> USD)
        // Since USDT is pegged to USD, this is often a good approximation
        console.warn('CoinGecko failed, trying Forex for EUR/USD')
        const forexRate = await getForexRate('EUR', 'USD')
        if (forexRate > 0) return forexRate

        return 0
    } catch (error) {
        console.error('Error fetching crypto price:', error)
        // Fallback to Forex in case of error
        try {
            return await getForexRate('EUR', 'USD')
        } catch (e) {
            return 0
        }
    }
}

export async function getForexRate(from: string, to: string): Promise<number> {
    try {
        const proxyUrl = 'https://corsproxy.io/?'
        const targetUrl = `https://api.frankfurter.app/latest?from=${from}&to=${to}`
        const response = await fetch(proxyUrl + encodeURIComponent(targetUrl))
        const data = await response.json()
        return data.rates[to]
    } catch (error) {
        console.error('Error fetching Forex rate:', error)
        return 0
    }
}

export async function getCompositeRate(base: 'GBP' | 'EUR'): Promise<{
    forexRate: number,
    cryptoRate: number,
    compositeRate: number
}> {
    // If base is EUR, we just need EUR -> USDT
    if (base === 'EUR') {
        const cryptoRate = await getCryptoPrice('EURUSDT')
        return {
            forexRate: 1,
            cryptoRate,
            compositeRate: cryptoRate
        }
    }

    // If base is GBP, we need GBP -> EUR -> USDT
    const [forexRate, cryptoRate] = await Promise.all([
        getForexRate('GBP', 'EUR'),
        getCryptoPrice('EURUSDT')
    ])

    return {
        forexRate,
        cryptoRate,
        compositeRate: forexRate * cryptoRate
    }
}
