import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getCurrentAdmin } from "@/lib/auth/admin";

function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !serviceKey) return { client: null, missing: !url ? "SUPABASE_URL" : "SUPABASE_SERVICE_ROLE_KEY" };
  return { client: createSupabaseClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }), missing: null };
}

export async function GET(request: Request) {
  if (!await getCurrentAdmin()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const { client, missing } = getServiceClient();
  if (!client) {
    const message = missing === "SUPABASE_SERVICE_ROLE_KEY"
      ? "User management is unavailable because SUPABASE_SERVICE_ROLE_KEY is not configured on the server."
      : "User management is unavailable because the Supabase URL is not configured on the server.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const url = new URL(request.url);
  const selectedUserId = url.searchParams.get("userId");
  if (selectedUserId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedUserId)) {
    return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
  }

  if (selectedUserId) {
    const [{ data: userData, error: userError }, { data: ledger, error: ledgerError }] = await Promise.all([
      client.auth.admin.getUserById(selectedUserId),
      client.from("account_ledger").select("amount_usd").eq("user_id", selectedUserId).eq("entry_type", "deposit_credit"),
    ]);
    if (userError || !userData.user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (ledgerError) return NextResponse.json({ error: "User accounting details are unavailable." }, { status: 503 });
    return NextResponse.json({
      user: {
        id: userData.user.id,
        email: userData.user.email ?? "Not provided",
        name: getDisplayName(userData.user.user_metadata),
        totalDeposit: (ledger ?? []).reduce((total, entry) => total + Number(entry.amount_usd), 0),
        totalWithdrawals: null,
        withdrawalWalletAddress: null,
      },
    });
  }

  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: "User records are unavailable." }, { status: 503 });

    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      email: user.email ?? "Not provided",
      name: getDisplayName(user.user_metadata),
    })),
  });
}

function getDisplayName(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.display_name ?? metadata?.full_name ?? metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : "Not provided";
}
