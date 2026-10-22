import { connection } from "next/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import ProfileInformation from "@/components/dashboard/ProfileInformation";
import SecuritySettings from "@/components/dashboard/SecuritySettings";
import CurrencyPreference, { isDisplayCurrency, type DisplayCurrency } from "@/components/dashboard/CurrencyPreference";

export const instant = false;

function SettingSection({ title, description, children, badge = "Coming soon" }: { title: string; description: string; children: React.ReactNode; badge?: string | null }) {
  return (
    <section className="dashboard-card settings-section">
      <div className="settings-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {badge ? <span className="dashboard-badge">{badge}</span> : null}
      </div>
      <div className="settings-section-content">{children}</div>
    </section>
  );
}

export default async function SettingsPage() {
  await connection();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/settings");
  if (await getCurrentAdmin()) redirect("/admin");

  const metadata = user.user_metadata as { display_name?: unknown; full_name?: unknown; name?: unknown; display_currency?: unknown } | undefined;
  const displayName = [metadata?.display_name, metadata?.full_name, metadata?.name]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim() ?? null;
  const selectedCurrency: DisplayCurrency = isDisplayCurrency(metadata?.display_currency) ? metadata.display_currency : "USD";

  return (
    <DashboardShell userEmail={user.email ?? "Authenticated account"} displayName={displayName}>
      <div className="settings-page">
        <header className="settings-intro">
          <span className="dashboard-eyebrow">Private workspace</span>
          <h2>SETTINGS</h2>
          <p>Manage your personal information and account security.</p>
        </header>
        <div className="settings-grid">
          <SettingSection title="Profile Information" description="Review and update the personal information associated with your account." badge={null}>
            <ProfileInformation
              fullName={displayName ?? ""}
              email={user.email ?? ""}
              userId={user.id}
              createdAt={user.created_at ?? null}
            />
          </SettingSection>
          <SettingSection title="Security" description="Manage your password and active session." badge={null}>
            <SecuritySettings email={user.email ?? ""} />
          </SettingSection>
          <SettingSection title="Account Preferences" description="Choose how supported account information will be displayed." badge={null}>
            <CurrencyPreference initialCurrency={selectedCurrency} />
          </SettingSection>
        </div>
      </div>
    </DashboardShell>
  );
}
