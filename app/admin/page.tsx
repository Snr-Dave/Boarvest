import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import AdminDashboard from "@/components/admin/AdminDashboard";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const instant = false;

export default async function AdminPage() {
  await connection();
  const user = await getCurrentUser();

  if (!user) redirect("/login?next=/admin");
  if (!(await getCurrentAdmin())) notFound();

  return <AdminDashboard />;
}
