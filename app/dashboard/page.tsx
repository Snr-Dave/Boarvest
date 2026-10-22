import { connection } from "next/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import CurrencyDisplay from "@/components/dashboard/CurrencyDisplay";
import type { DisplayCurrency } from "@/components/dashboard/CurrencyPreference";

const DISPLAY_CURRENCY_CODES: readonly DisplayCurrency[] = ["USD", "SOL", "ETH", "BNB"];

function isDisplayCurrency(value: unknown): value is DisplayCurrency {
  return typeof value === "string" && DISPLAY_CURRENCY_CODES.includes(value as DisplayCurrency);
}

export const instant = false;

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="dashboard-empty-state"><div className="dashboard-empty-icon" aria-hidden="true">◌</div><h3>{title}</h3><p>{description}</p></div>;
}

const summaryCards = [
  ["Total Balance", "BALANCE_PLACEHOLDER", "Available approved funds from the trusted ledger."],
  ["Earned Profit", "$0.00", "Verified investment returns will appear here."],
] as const;

export default async function DashboardPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");
  if (await getCurrentAdmin()) redirect("/admin");

  const metadata = user.user_metadata as { display_name?: unknown; full_name?: unknown; name?: unknown; display_currency?: unknown } | undefined;
  const selectedCurrency: DisplayCurrency = isDisplayCurrency(metadata?.display_currency) ? metadata.display_currency : "USD";
  const displayName = [metadata?.display_name, metadata?.full_name, metadata?.name].find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
  const { data: ledgerRows } = await supabase.from("account_ledger").select("amount_usd").eq("user_id", user.id);
  const availableBalance = (ledgerRows ?? []).reduce((total, row) => total + Number(row.amount_usd), 0);
  const greeting = displayName ? `Welcome back, ${displayName}.` : "Welcome to your private workspace.";

  return <DashboardShell userEmail={user.email ?? "Authenticated account"} displayName={displayName}>
    <section className="dashboard-welcome"><div><span className="dashboard-eyebrow">Account overview</span><h2>{greeting}</h2><p>Keep an eye on your Boarvest account from one clear, secure workspace.</p></div><div className="dashboard-status"><span className="dashboard-status-dot" /> Account active</div></section>
    <section aria-labelledby="summary-heading"><div className="sr-only"><h2 id="summary-heading">Account summary</h2></div><div className="dashboard-summary-grid">
      {summaryCards.map(([label, value, note]) => <article className="dashboard-card dashboard-summary-card" key={label}><div className="dashboard-card-top"><span className="dashboard-card-label">{label}</span><span className="dashboard-card-icon" aria-hidden="true">{label === "Total Balance" ? "◈" : "↗"}</span></div><strong className="dashboard-summary-value">{value === "BALANCE_PLACEHOLDER" ? <CurrencyDisplay usdAmount={availableBalance} currency={selectedCurrency} /> : value}</strong><p>{note}</p></article>)}
    </div></section>
    <div className="dashboard-section-grid"><section className="dashboard-card" aria-labelledby="portfolio-heading"><div className="dashboard-section-heading"><div><span className="dashboard-card-label">Your holdings</span><h2 id="portfolio-heading">Portfolio overview</h2></div><span className="dashboard-badge">Coming soon</span></div><div className="dashboard-portfolio-empty"><p><strong>Invested capital:</strong> $0.00</p><p><strong>Active investments:</strong> None recorded</p><p><strong>Investment dates:</strong> Not available</p><p><strong>Status:</strong> No active investment</p><p><strong>Accumulated earned profit:</strong> $0.00</p><EmptyState title="Your portfolio is taking shape" description="Verified investment records will appear here when the investment backend is available." /></div></section><section className="dashboard-card" aria-labelledby="activity-heading"><div className="dashboard-section-heading"><div><span className="dashboard-card-label">Account history</span><h2 id="activity-heading">Recent activity</h2></div><span className="dashboard-badge">Coming soon</span></div><EmptyState title="No transactions yet" description="Your account activity will appear here when verified transactions are available." /></section></div>
    <section className="dashboard-card dashboard-actions" aria-labelledby="actions-heading"><div className="dashboard-section-heading"><div><span className="dashboard-card-label">Shortcuts</span><h2 id="actions-heading">Quick actions</h2></div></div><div className="dashboard-action-grid"><a className="dashboard-action-item" href="/dashboard/portfolio"><span>◒</span><strong>View portfolio</strong><small>Open portfolio</small></a><a className="dashboard-action-item" href="/dashboard/transactions"><span>≡</span><strong>View transactions</strong><small>Open transactions</small></a><a className="dashboard-action-item" href="/dashboard/settings"><span>⚙</span><strong>Account settings</strong><small>Open settings</small></a></div></section>
  </DashboardShell>;
}
