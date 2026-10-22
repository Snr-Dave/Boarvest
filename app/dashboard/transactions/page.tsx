import { connection } from "next/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import TransactionsList from "./TransactionsList";
import { createClient } from "@/lib/supabase/server";

export const instant = false;
export default async function TransactionsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = typeof user?.user_metadata?.display_name === "string" ? user.user_metadata.display_name : null;
  return <DashboardShell userEmail={user?.email ?? ""} displayName={displayName}><section className="dashboard-welcome"><div><span className="dashboard-eyebrow">Account history</span><h2>Transactions</h2><p>Your deposit requests and review statuses are shown here.</p></div></section><section className="dashboard-card"><TransactionsList /></section></DashboardShell>;
}
