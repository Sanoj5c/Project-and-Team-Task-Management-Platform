"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Users2 } from "lucide-react";
import { getProjects } from "@/lib/projects-api";
import { Project, ProjectStatus } from "@/types";

const statusStyles: Record<ProjectStatus, string> = {
  planning: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-indigo-100 text-indigo-700",
  archived: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load projects.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p className="text-gray-500">Loading projects...</p>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Projects</h1>
        <p className="text-gray-500 mt-1">
          Every project across the organization.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          No projects yet.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyles[project.status]}`}
                >
                  {statusLabels[project.status]}
                </span>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">
                {project.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {project.description || "No description provided."}
              </p>

              <div className="flex items-center justify-between text-xs text-gray-400 border-t border-gray-50 pt-3">
                <span>Manager: {project.manager?.name || "Unassigned"}</span>
                <span className="flex items-center gap-1">
                  <Users2 className="w-3.5 h-3.5" />
                  {project.members?.length || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}