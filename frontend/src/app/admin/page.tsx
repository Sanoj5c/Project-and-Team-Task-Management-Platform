"use client";

import { useEffect, useState } from "react";
import { Users as UsersIcon, Rocket, ClipboardList, CheckCircle2 } from "lucide-react";
import { getUsers } from "@/lib/users-api";
import { getProjects } from "@/lib/projects-api";
import { User, Project } from "@/types";

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [usersData, projectsData] = await Promise.all([
          getUsers(),
          getProjects(),
        ]);
        setUsers(usersData);
        setProjects(projectsData);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading dashboard...</p>;
  }

  const activeProjectsCount = projects.filter((p) => p.status === "active").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 mb-6">Overview of your organization.</p>

      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Users"
          value={users.length.toString()}
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