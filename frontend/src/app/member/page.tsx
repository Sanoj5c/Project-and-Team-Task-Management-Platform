"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, clearAuthSession } from "@/lib/auth-api";

export default function MemberDashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "team_member") {
      // Wrong dashboard for this role
      router.push("/login");
      return;
    }
    setUserEmail(user.email);
  }, [router]);

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  if (!userEmail) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-gray-900">
          Team Member Dashboard
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-red-600 hover:underline"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="p-6">
        <p className="text-gray-500">
          Your assigned tasks will appear here.
        </p>
      </main>
    </div>
  );
}