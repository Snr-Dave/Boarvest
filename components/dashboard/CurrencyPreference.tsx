"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const DISPLAY_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "SOL", name: "Solana" },
  { code: "ETH", name: "Ethereum" },
  { code: "BNB", name: "BNB" },
] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number]["code"];

export function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return DISPLAY_CURRENCIES.some((currency) => currency.code === value);
}

export function currencyLabel(currency: DisplayCurrency) {
  return DISPLAY_CURRENCIES.find((option) => option.code === currency)?.name ?? "US Dollar";
}

export default function CurrencyPreference({ initialCurrency }: { initialCurrency: DisplayCurrency }) {
  const router = useRouter();
  const [currency, setCurrency] = useState(initialCurrency);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function savePreference(nextCurrency: DisplayCurrency) {
    setCurrency(nextCurrency);
    setStatus("");
    setError("");
    const { error: updateError } = await createClient().auth.updateUser({
      data: { display_currency: nextCurrency },
    });

    if (updateError) {
      setCurrency(initialCurrency);
      setError("Unable to save your display currency.");
      return;
    }

    setStatus(`Display currency saved as ${nextCurrency}.`);
    router.refresh();
  }

  return (
    <div className="settings-currency-control">
      <label htmlFor="display-currency">Display currency</label>
      <select
        id="display-currency"
        value={currency}
        onChange={(event) => {
          const nextCurrency = event.target.value;
          if (isDisplayCurrency(nextCurrency)) void savePreference(nextCurrency);
        }}
      >
        {DISPLAY_CURRENCIES.map((option) => (
          <option value={option.code} key={option.code}>{option.code} — {option.name}</option>
        ))}
      </select>
      <p className="settings-placeholder-copy">USD remains the accounting currency. Other options are display-only equivalents.</p>
      {status ? <p className="settings-form-status" role="status">{status}</p> : null}
      {error ? <p className="settings-form-error" role="alert">{error}</p> : null}
    </div>
  );
}
