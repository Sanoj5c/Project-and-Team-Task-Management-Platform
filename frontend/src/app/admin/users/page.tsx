"use client";

import { useEffect, useState } from "react";
import { Users as UsersIcon, Rocket, ClipboardList, CheckCircle2, Download, Plus, MoreVertical } from "lucide-react";
import { getUsers } from "@/lib/users-api";
import { getProjects } from "@/lib/projects-api";
import { User, Project } from "@/types";

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-indigo-100 text-indigo-700",
  project_manager: "bg-amber-100 text-amber-700",
  team_member: "bg-gray-100 text-gray-700",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  project_manager: "Project Manager",
  team_member: "Team Member",
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const [usersData, projectsData] = await Promise.all([
          getUsers(),
          getProjects(),
        ]);
        setUsers(usersData);
        setProjects(projectsData);
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to load users."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (filter === "active") return u.isActive;
    if (filter === "inactive") return !u.isActive;
    return true;
  });

  const activeProjectsCount = projects.filter(
    (p) => p.status === "active"
  ).length;

  if (loading) {
    return <p className="text-gray-500">Loading users...</p>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            User Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage your team members and their access levels.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Users"
          value={users.length.toLocaleString()}
          icon={<UsersIcon className="w-4 h-4 text-indigo-600" />}
          iconBg="bg-indigo-100"
        />
        <StatCard
          label="Active Projects"
          value={activeProjectsCount.toString()}
          icon={<Rocket className="w-4 h-4 text-amber-600" />}
          iconBg="bg-amber-100"
        />
        <StatCard
          label="Total Projects"
          value={projects.length.toString()}
          icon={<ClipboardList className="w-4 h-4 text-gray-600" />}
          iconBg="bg-gray-100"
        />
        <StatCard
          label="Active Users"
          value={users.filter((u) => u.isActive).length.toString()}
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          iconBg="bg-emerald-100"
        />
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Users</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {users.length} Total
            </span>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1 text-sm">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md capitalize transition-colors ${
                  filter === f
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase text-gray-400 text-left">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-t border-gray-50">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900">
                    {user.name}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-500">{user.email}</td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleBadgeStyles[user.role]}`}
                  >
                    {roleLabels[user.role]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        user.isActive ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                    />
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-6 py-4 text-sm text-gray-500">
          <span>
            Showing {filteredUsers.length} of {users.length} users
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  iconBg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}