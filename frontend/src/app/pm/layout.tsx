"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  Search,
  Bell,
  HelpCircle,
  Plus,
} from "lucide-react";
import { getCurrentUser, clearAuthSession } from "@/lib/auth-api";

const navItems = [
  { href: "/pm", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pm/projects", label: "My Projects", icon: FolderOpen },
  { href: "/pm/team", label: "Team", icon: Users },
  { href: "/pm/settings", label: "Settings", icon: Settings },
];

export default function PmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "project_manager") {
      router.push("/login");
      return;
    }
    setUser(currentUser);
  }, [router]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col justify-between">
        <div>
          <div className="px-6 py-6">
            <h1 className="text-xl font-bold text-indigo-600">TaskFlow</h1>
            <p className="text-xs text-gray-400 mt-0.5">Enterprise Tier</p>
          </div>

          <nav className="px-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="px-3 pb-6">
          <button
            onClick={() => router.push("/pm/projects/new")}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks, projects, or team members..."
              className="w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-5">
            <button className="text-gray-400 hover:text-gray-600">
              <Bell className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-gray-600">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                clearAuthSession();
                router.push("/login");
              }}
              className="flex items-center gap-3"
            >
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400">Project Lead</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}