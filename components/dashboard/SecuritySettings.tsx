"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import SignOutButton from "@/components/auth/SignOutButton";

type SecuritySettingsProps = {
  email: string;
};

export default function SecuritySettings({ email }: SecuritySettingsProps) {
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    setError("");
    setStatus("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Complete all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current password.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) {
      setLoading(false);
      setError("Current password is incorrect.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setError("We could not update your password. Please try again.");
      return;
    }

    formElement.reset();
    setStatus("Password updated successfully.");
  }

  return (
    <div className="settings-security-content">
      <form className="settings-profile-form" onSubmit={handleSubmit} noValidate aria-describedby="security-status">
        <div className="settings-detail-grid">
          <div className="settings-field settings-field-full">
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" name="currentPassword" type={showPasswords ? "text" : "password"} autoComplete="current-password" />
          </div>
          <div className="settings-field">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" name="newPassword" type={showPasswords ? "text" : "password"} autoComplete="new-password" />
            <small>At least 8 characters.</small>
          </div>
          <div className="settings-field">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" name="confirmPassword" type={showPasswords ? "text" : "password"} autoComplete="new-password" />
          </div>
        </div>
        <div className="settings-form-actions">
          <button type="button" className="button button-secondary" onClick={() => setShowPasswords((visible) => !visible)}>
            {showPasswords ? "Hide passwords" : "Show passwords"}
          </button>
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? "Updating…" : "Change Password"}
          </button>
          <p id="security-status" className={error ? "settings-form-error" : "settings-form-status"} aria-live="polite">
            {error || status}
          </p>
        </div>
      </form>
      <div className="settings-security-links">
        <Link href="/forgot-password">Forgot your password? Use the password reset flow.</Link>
        <SignOutButton />
      </div>
    </div>
  );
}
