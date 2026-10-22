"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileInformationProps = {
  fullName: string;
  email: string;
  userId: string;
  createdAt: string | null;
};

export default function ProfileInformation({ fullName, email, userId, createdAt }: ProfileInformationProps) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    setError("");
    setStatus("");

    if (!trimmedName) {
      setError("Enter your full name.");
      return;
    }
    if (trimmedName.length > 120) {
      setError("Full name must be 120 characters or fewer.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      data: { full_name: trimmedName },
    });
    setLoading(false);

    if (updateError) {
      setError("We could not save your profile. Please try again.");
      return;
    }

    setName(trimmedName);
    setStatus("Profile changes saved.");
    router.refresh();
  }

  return (
    <form className="settings-profile-form" onSubmit={handleSubmit} noValidate aria-describedby="profile-status">
      <div className="settings-detail-grid">
        <div className="settings-field">
          <label htmlFor="profile-full-name">Full name</label>
          <input
            id="profile-full-name"
            name="fullName"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="name"
            maxLength={120}
            aria-invalid={Boolean(error)}
          />
        </div>
        <div className="settings-field">
          <span>Email address</span>
          <strong>{email || "Not provided"}</strong>
          <small>Read-only</small>
        </div>
        <div className="settings-field">
          <span>Account ID</span>
          <strong className="settings-value-mono">{userId}</strong>
          <small>Read-only</small>
        </div>
        <div className="settings-field">
          <span>Account created</span>
          <strong>{createdAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(createdAt)) : "Not available"}</strong>
        </div>
      </div>
      <div className="settings-form-actions">
        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? "Saving…" : "Save Changes"}
        </button>
        <p id="profile-status" className={error ? "settings-form-error" : "settings-form-status"} aria-live="polite">
          {error || status}
        </p>
      </div>
    </form>
  );
}
