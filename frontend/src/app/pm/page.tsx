"use client";

import { useEffect, useState } from "react";
import { AxiosError } from "axios";
import { MoreHorizontal, Plus, CheckCircle2 } from "lucide-react";
import { getProjects } from "@/lib/projects-api";
import { Project } from "@/types";

const statusBadgeStyles: Record<string, string> = {
  planning: "bg-gray-100 text-gray-600",
  active: "bg-indigo-100 text-indigo-700",
  on_hold: "bg-orange-100 text-orange-700",
  completed: "bg-violet-100 text-violet-700",
};

const progressBarColor: Record<string, string> = {
  planning: "bg-gray-300",
  active: "bg-indigo-600",
  on_hold: "bg-orange-500",
  completed: "bg-gray-200",
};

// Placeholder pool — swap for real assignee data once the Tasks module
// exposes per-project members and completion counts.
const TEAM_POOL = [
  "Nimali Perera",
  "Chamara Silva",
  "Sanduni Fernando",
  "Isuru Bandara",
  "Tharushi Jayawardena",
  "Dinesh Kumarasinghe",
];

function placeholderProgress(id: string, status: string) {
  if (status === "completed") return 100;
  // deterministic pseudo-random so it doesn't jump around on re-render
  const hash = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0);
  return status === "planning" ? hash % 25 : 30 + (hash % 60);
}

function placeholderTeam(id: string) {
  const hash = Array.from(id).reduce((a, c) => a + c.charCodeAt(0), 0);
  const count = 2 + (hash % 3);
  return TEAM_POOL.slice(hash % 3, hash % 3 + count);
}

export default function PmDashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err) {
        const message =
          err instanceof AxiosError
            ? err.response?.data?.message
            : "Failed to load projects.";
        setError(message || "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading projects...</p>;
  }

  // Static placeholder data — replace once weekly-activity and
  // team-workload endpoints exist on the backend.
  const weeklyActivity = [
    { day: "Mon", value: 4 },
    { day: "Tue", value: 7 },
    { day: "Wed", value: 6 },
    { day: "Thu", value: 8 },
    { day: "Fri", value: 11 },
    { day: "Sat", value: 5 },
    { day: "Sun", value: 3 },
  ];
  const maxActivity = Math.max(...weeklyActivity.map((d) => d.value));

  const teamWorkload = [
    { name: "Nimali Perera", pct: 95 },
    { name: "Chamara Silva", pct: 42 },
    { name: "Isuru Bandara", pct: 15 },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
          <p className="text-gray-500 mt-1">
            Manage and track your active workflow across {projects.length}{" "}
            current projects.
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Project cards */}
      <div className="grid grid-cols-3 gap-5 mb-6">
        {projects.map((project) => {
          const progress = placeholderProgress(project.id, project.status);
          const team = placeholderTeam(project.id);
          const totalTasks = 20 + (progress % 20);
          const doneTasks = Math.round((progress / 100) * totalTasks);

          return (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusBadgeStyles[project.status]}`}
                >
                  {project.status.replace("_", " ")}
                </span>
                <button className="text-gray-300 hover:text-gray-500">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {project.name}
              </h3>

              <div className="flex items-center justify-between text-xs font-medium text-gray-400 mb-1.5">
                <span>PROGRESS</span>
                <span className="text-gray-900">{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4">
                <div
                  className={`h-1.5 rounded-full ${progressBarColor[project.status]}`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {team.slice(0, 3).map((name) => (
                    <div
                      key={name}
                      className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-semibold border-2 border-white"
                    >
                      {name.charAt(0)}
                    </div>
                  ))}
                  {team.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[11px] font-semibold border-2 border-white">
                      +{team.length - 3}
                    </div>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {doneTasks}/{totalTasks} tasks
                </span>
              </div>
            </div>
          );
        })}

        {/* Start new project tile */}
        <button
          onClick={() => (window.location.href = "/pm/projects/new")}
          className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center py-10 text-center hover:border-indigo-300 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <Plus className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-900">
            Start New Project
          </p>
          <p className="text-xs text-gray-400 mt-1 max-w-[180px]">
            Initialize a new workflow and invite your team.
          </p>
        </button>
      </div>

      {/* Bottom row: weekly activity + team workload */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Weekly Activity
            </h2>
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              Tasks Done
            </span>
          </div>
          <div className="flex items-end justify-between gap-3 h-40">
            {weeklyActivity.map((d) => (
              <div
                key={d.day}
                className="flex-1 flex flex-col items-center gap-2"
              >
                <div
                  className={`w-full rounded-t-md ${
                    d.value === maxActivity ? "bg-indigo-600" : "bg-indigo-100"
                  }`}
                  style={{ height: `${(d.value / maxActivity) * 100}%` }}
                />
                <span className="text-xs text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">
            Team Workload
          </h2>
          <div className="space-y-5">
            {teamWorkload.map((member) => (
              <div key={member.name} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold shrink-0">
                  {member.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      {member.name}
                    </span>
                    <span className="text-sm text-gray-500">
                      {member.pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                    <div
                      className={`h-1.5 rounded-full ${
                        member.pct > 90
                          ? "bg-red-500"
                          : member.pct > 50
                            ? "bg-indigo-600"
                            : "bg-gray-300"
                      }`}
                      style={{ width: `${member.pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="text-sm text-indigo-600 font-medium mt-5 hover:underline">
            View All Members
          </button>
        </div>
      </div>
    </div>
  );
}