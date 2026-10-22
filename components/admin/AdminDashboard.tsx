"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import SignOutButton from "@/components/auth/SignOutButton";

type Section = "Overview" | "Users" | "Deposits" | "Withdrawals" | "Audit Log" | "Settings";

type AdminUser = { id: string; name: string; email: string };
type UserDetails = AdminUser & { totalDeposit: number; totalWithdrawals: number | null; withdrawalWalletAddress: string | null };
type Deposit = { id: string; reference: string; user_id: string; asset: string; network: string; requested_usd: number; estimated_token_amount: number | null; destination_wallet: string; status: "pending" | "approved" | "declined"; created_at: string; review_note: string | null };
type Counts = { pending: number; approved: number; declined: number; totalUsers: number };

const navigation: { label: Section; icon: string }[] = [
  { label: "Overview", icon: "◈" }, { label: "Users", icon: "◌" }, { label: "Deposits", icon: "↓" },
  { label: "Withdrawals", icon: "↑" }, { label: "Audit Log", icon: "⌁" }, { label: "Settings", icon: "⚙" },
];

const emptyCounts: Counts = { pending: 0, approved: 0, declined: 0, totalUsers: 0 };

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<Section>("Overview");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const loadDeposits = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/deposits", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Deposits are unavailable.");
      setDeposits(body.deposits ?? []);
      setCounts(body.counts ?? emptyCounts);
      setLastSynced(body.updatedAt ?? null);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Deposits are unavailable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const task = Promise.resolve().then(loadDeposits);
    return () => { void task; };
  }, [loadDeposits]);

  function selectSection(section: Section) { setActiveSection(section); setIsMenuOpen(false); }

  return <div className="admin-frame">
    <aside className={`admin-sidebar ${isMenuOpen ? "admin-sidebar-open" : ""}`}>
      <div className="admin-brand"><span className="admin-brand-mark" aria-hidden="true">B</span><span>Boarvest</span><span className="admin-brand-tag">ADMIN</span><button className="admin-close" type="button" aria-label="Close navigation" onClick={() => setIsMenuOpen(false)}>×</button></div>
      <nav className="admin-nav" aria-label="Admin navigation"><p className="admin-nav-label">Control center</p>{navigation.map((item) => <button className={`admin-nav-item ${activeSection === item.label ? "admin-nav-item-active" : ""}`} type="button" key={item.label} onClick={() => selectSection(item.label)} aria-current={activeSection === item.label ? "page" : undefined}><span className="admin-nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>{item.label === "Deposits" && counts.pending > 0 && <span className="admin-nav-dot" aria-label={`${counts.pending} pending deposits`} />}</button>)}</nav>
      <div className="admin-sidebar-footer"><div className="admin-secure-note"><span aria-hidden="true">◉</span><span><strong>Secure workspace</strong><small>Admin access verified</small></span></div><SignOutButton /></div>
    </aside>
    {isMenuOpen && <button className="admin-overlay" type="button" aria-label="Close navigation" onClick={() => setIsMenuOpen(false)} />}
    <div className="admin-content"><header className="admin-header"><button className="admin-menu-button" type="button" aria-label="Open navigation" onClick={() => setIsMenuOpen(true)}><span /><span /><span /></button><div><p className="admin-kicker">Boarvest / Administration</p><h1>{activeSection}</h1></div><div className="admin-header-meta"><span className="admin-status-dot" /> <span>Live workspace</span></div></header>
      <main className="admin-main">{activeSection === "Overview" ? <Overview counts={counts} error={error} lastSynced={lastSynced} /> : activeSection === "Deposits" ? <DepositManagement deposits={deposits} error={error} isLoading={isLoading} onReviewed={loadDeposits} /> : activeSection === "Users" ? <UsersSection /> : <PlaceholderSection section={activeSection} />}</main>
    </div>
  </div>;
}

function Overview({ counts, error, lastSynced }: { counts: Counts; error: string | null; lastSynced: string | null }) {
  const cards = [
    { label: "Total Users", value: counts.totalUsers, note: "Registered accounts", icon: "◌" },
    { label: "Pending Deposits", value: counts.pending, note: "Awaiting review", icon: "↓" },
    { label: "Approved Deposits", value: counts.approved, note: "Approved records", icon: "✓" },
    { label: "Declined Deposits", value: counts.declined, note: "Declined records", icon: "×" },
  ];
  return <><section className="admin-welcome" aria-labelledby="overview-title"><div><p className="admin-eyebrow">Operations overview</p><h2 id="overview-title">Good morning, admin.</h2><p>Monitor verified deposit activity from one secure workspace.</p></div><div className="admin-data-badge"><span className="admin-status-dot" /> Live Supabase data</div></section>
    <div className="admin-notice" role={error ? "alert" : "status"}><span className="admin-notice-icon" aria-hidden="true">i</span><p>{error ?? "Approval is only for deposits independently verified against incoming funds. Pending requests never affect user balances."}</p></div>
    <section aria-labelledby="summary-title"><div className="admin-section-heading"><div><p className="admin-eyebrow">At a glance</p><h2 id="summary-title">Deposit summary</h2></div><span className="admin-updated">{lastSynced ? `Synced ${new Date(lastSynced).toLocaleTimeString()}` : "Not synced"}</span></div><div className="admin-summary-grid">{cards.map((card) => <article className="admin-summary-card" key={card.label}><div className="admin-card-top"><span className="admin-card-icon" aria-hidden="true">{card.icon}</span><span className="admin-card-placeholder">Live</span></div><p>{card.label}</p><strong>{card.value.toLocaleString()}</strong><span>{card.note}</span></article>)}</div></section>
    <section className="admin-lower-grid" aria-label="Admin activity"><div className="admin-panel admin-status-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">System</p><h2>Platform status</h2></div><span className="admin-status-pill">Ready</span></div><div className="admin-system-row"><span className="admin-system-icon" aria-hidden="true">◉</span><span><strong>Authentication</strong><small>Supabase session active</small></span><span className="admin-check" aria-label="Operational">✓</span></div><div className="admin-system-row"><span className="admin-system-icon" aria-hidden="true">◇</span><span><strong>Financial ledger</strong><small>Credits are created by the secure review operation</small></span><span className="admin-check" aria-label="Operational">✓</span></div></div></section></>;
}

function DepositManagement({ deposits, error, isLoading, onReviewed }: { deposits: Deposit[]; error: string | null; isLoading: boolean; onReviewed: () => Promise<void> }) {
  const [filter, setFilter] = useState<"all" | Deposit["status"]>("pending");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const filtered = useMemo(() => filter === "all" ? deposits : deposits.filter((deposit) => deposit.status === filter), [deposits, filter]);

  async function review(deposit: Deposit, decision: "approved" | "declined") {
    const verb = decision === "approved" ? "approve" : "decline";
    if (!window.confirm(`Confirm ${verb} ${deposit.reference}? Verify incoming funds before approving.`)) return;
    setReviewing(deposit.id); setActionError(null);
    try {
      const response = await fetch(`/api/admin/deposits/${deposit.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "The review could not be completed.");
      await onReviewed();
    } catch (reviewError) { setActionError(reviewError instanceof Error ? reviewError.message : "The review could not be completed."); } finally { setReviewing(null); }
  }

  return <section className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Financial controls</p><h2>Deposit management</h2></div><span className="admin-status-pill">Verify funds first</span></div><p>{error ?? actionError ?? "Review pending requests only after independently confirming the incoming payment. Approval credits the user's balance atomically."}</p><div className="admin-filter-row" role="tablist" aria-label="Deposit status filter">{(["pending", "approved", "declined", "all"] as const).map((value) => <button key={value} type="button" className={`admin-filter-button ${filter === value ? "admin-filter-button-active" : ""}`} onClick={() => setFilter(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>{isLoading ? <div className="admin-empty"><strong>Loading deposit records…</strong></div> : <div className="admin-deposit-list">{filtered.length === 0 ? <div className="admin-empty"><strong>No {filter === "all" ? "deposit" : filter} requests</strong><p>Requests submitted by users will appear here.</p></div> : filtered.map((deposit) => <article className="admin-deposit-row" key={deposit.id}><div><strong>{deposit.reference}</strong><small>User {deposit.user_id}</small><small>{deposit.asset} · {deposit.network} · ${Number(deposit.requested_usd).toLocaleString("en-US", { minimumFractionDigits: 2 })}</small><small>Estimate: {deposit.estimated_token_amount ? Number(deposit.estimated_token_amount).toLocaleString(undefined, { maximumFractionDigits: 8 }) : "Unavailable"} · {new Date(deposit.created_at).toLocaleString()}</small><small className="admin-wallet-value">Wallet: {deposit.destination_wallet}</small>{deposit.review_note && <small>Note: {deposit.review_note}</small>}</div><div><span className="admin-status-pill">{deposit.status}</span>{deposit.status === "pending" && <div className="admin-deposit-actions"><button className="admin-action-button" type="button" disabled={reviewing === deposit.id} onClick={() => void review(deposit, "approved")}>{reviewing === deposit.id ? "Reviewing…" : "Approve verified"}</button><button className="admin-action-button" type="button" disabled={reviewing === deposit.id} onClick={() => void review(deposit, "declined")}>Decline</button></div>}</div></article>)}</div>}</section>;
}

function UsersSection() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<UserDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "User records are unavailable.");
        setUsers(body.users ?? []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "User records are unavailable."))
      .finally(() => setIsLoading(false));
  }, []);

  async function selectUser(user: AdminUser) {
    setSelected(null);
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/users?userId=${encodeURIComponent(user.id)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "User details are unavailable.");
      setSelected(body.user);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "User details are unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  if (selected) return <section className="admin-panel" aria-labelledby="user-details-title"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Account details</p><h2 id="user-details-title">{selected.name}</h2></div><button className="admin-filter-button" type="button" onClick={() => setSelected(null)}>Back to users</button></div><div className="admin-summary-grid"><article className="admin-summary-card"><p>Name</p><strong>{selected.name}</strong></article><article className="admin-summary-card"><p>Email</p><strong>{selected.email}</strong></article><article className="admin-summary-card"><p>Account ID</p><strong className="admin-wallet-value">{selected.id}</strong></article><article className="admin-summary-card"><p>Total Deposit</p><strong>${selected.totalDeposit.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong><span>Approved ledger credits only</span></article><article className="admin-summary-card"><p>Total Withdrawals</p><strong>{selected.totalWithdrawals === null ? "Not implemented" : `$${selected.totalWithdrawals.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}</strong></article><article className="admin-summary-card"><p>Withdrawal Wallet</p><strong>{selected.withdrawalWalletAddress ?? "Not configured"}</strong></article></div></section>;

  return <section className="admin-panel" aria-labelledby="users-title"><div className="admin-panel-heading"><div><p className="admin-eyebrow">Account directory</p><h2 id="users-title">Users</h2></div><span className="admin-panel-muted">{users.length} registered</span></div>{error ? <div className="admin-notice" role="alert"><p>{error}</p></div> : isLoading ? <div className="admin-empty"><strong>Loading user records…</strong></div> : users.length === 0 ? <div className="admin-empty"><strong>No registered users</strong><p>Users will appear here after they create an account.</p></div> : <div className="admin-deposit-list">{users.map((user) => <button className="admin-deposit-row" type="button" key={user.id} onClick={() => void selectUser(user)}><span><strong>{user.name}</strong><small>{user.email}</small></span><span className="admin-status-pill">View details</span></button>)}</div>}</section>;
}

function PlaceholderSection({ section }: { section: Section }) { return <section className="admin-placeholder" aria-labelledby="placeholder-title"><span className="admin-placeholder-icon" aria-hidden="true">{navigation.find((item) => item.label === section)?.icon}</span><p className="admin-eyebrow">Admin module</p><h2 id="placeholder-title">{section}</h2><p>This workspace is reserved for {section.toLowerCase()} management. The interface will be connected to secure backend data in a later phase.</p><span className="admin-status-pill">Not implemented</span></section>; }
