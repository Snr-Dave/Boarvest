"use client";

import { useEffect, useState } from "react";
import type { DisplayCurrency } from "@/components/dashboard/CurrencyPreference";

const MAX_RATE_AGE_MS = 2 * 60 * 1000;

type Props = { usdAmount: number; currency: DisplayCurrency };

type PriceResponse = { prices?: Partial<Record<Exclude<DisplayCurrency, "USD">, number | null>>; updatedAt?: string };

export default function CurrencyDisplay({ usdAmount, currency }: Props) {
  const [rateState, setRateState] = useState<{ currency: Exclude<DisplayCurrency, "USD"> | null; rate: number | null }>({ currency: null, rate: null });

  useEffect(() => {
    if (currency === "USD") return;

    let active = true;
    fetch("/api/market-prices", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("rate unavailable");
        return response.json() as Promise<PriceResponse>;
      })
      .then((data) => {
        const candidate = data.prices?.[currency];
        const timestamp = data.updatedAt ? Date.parse(data.updatedAt) : NaN;
        if (!active || typeof candidate !== "number" || !Number.isFinite(candidate) || candidate <= 0 || !Number.isFinite(timestamp) || Date.now() - timestamp > MAX_RATE_AGE_MS) return;
        setRateState({ currency, rate: candidate });
      })
      .catch(() => {
        if (active) setRateState({ currency, rate: null });
      });

    return () => { active = false; };
  }, [currency]);

  if (currency === "USD") return <>{formatAmount(usdAmount, "USD")}</>;
  const rate = rateState.currency === currency ? rateState.rate : null;
  if (rate === null) return <span title="A current exchange rate is unavailable">Rate unavailable</span>;

  return <>{formatAmount(usdAmount / rate, currency)} <small>≈ {currency}</small></>;
}

function formatAmount(amount: number, currency: DisplayCurrency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: currency === "USD" ? 2 : 6 }).format(amount);
}
