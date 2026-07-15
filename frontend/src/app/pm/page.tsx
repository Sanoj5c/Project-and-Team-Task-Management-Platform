"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FolderOpen, Users2 } from "lucide-react";
import { getProjects, createProject } from "@/lib/projects-api";
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

export default function PmDashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await createProject({ name: newName, description: newDescription });
      setShowModal(false);
      setNewName("");
      setNewDescription("");
      await loadProjects();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create project.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500">Loading projects...</p>;
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
          <p className="text-gray-500 mt-1">
            Projects you manage and their progress.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
          You don&apos;t manage any projects yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => router.push(`/pm/projects/${project.id}`)}
              className="text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
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
                <span className="flex items-center gap-1">
                  <Users2 className="w-3.5 h-3.5" />
                  {project.members?.length || 0} members
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Project
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Project name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Website Redesign"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Brief description of the project"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}