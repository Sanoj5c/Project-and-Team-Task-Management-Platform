"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import {
  FolderOpen,
  Users2,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

import { getProjects } from "@/lib/projects-api";
import type { Project, ProjectStatus } from "@/types";

type ApiErrorResponse = {
  message?: string | string[];
};

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

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof AxiosError) {
    const responseData = error.response
      ?.data as ApiErrorResponse | undefined;

    if (Array.isArray(responseData?.message)) {
      return responseData.message.join(", ");
    }

    return responseData?.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function formatDate(date?: string | null): string {
  if (!date) {
    return "Not set";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsedDate);
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function loadProjects(
    showRefreshLoader = false,
  ): Promise<void> {
    if (showRefreshLoader) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await getProjects();
      setProjects(data);
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Failed to load projects.",
        ),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const activeProjects = projects.filter(
    (project) => project.status === "active",
  ).length;

  const completedProjects = projects.filter(
    (project) => project.status === "completed",
  ).length;

  const totalMembers = new Set(
    projects.flatMap((project) =>
      (project.members ?? []).map(
        (member) => member.userId,
      ),
    ),
  ).size;

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          All Projects
        </h1>

        <p className="mt-1 text-gray-500">
          Every project across the organization.
        </p>

        <div className="mt-8 rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />

          <p className="mt-4 text-sm text-gray-500">
            Loading projects...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            All Projects
          </h1>

          <p className="mt-1 text-gray-500">
            View and manage every project across the
            organization.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadProjects(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Total Projects
          </p>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {projects.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Active Projects
          </p>

          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {activeProjects}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Completed
          </p>

          <p className="mt-3 text-3xl font-bold text-indigo-600">
            {completedProjects}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Team Members
          </p>

          <p className="mt-3 text-3xl font-bold text-amber-600">
            {totalMembers}
          </p>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center text-gray-400 shadow-sm">
          No projects have been created yet.
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/admin/projects/${project.id}`}
              className="group block rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <FolderOpen className="h-5 w-5 text-indigo-600" />
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    statusStyles[project.status]
                  }`}
                >
                  {statusLabels[project.status]}
                </span>
              </div>

              <h3 className="mb-1 text-lg font-semibold text-gray-900">
                {project.name}
              </h3>

              <p className="mb-5 line-clamp-2 min-h-10 text-sm text-gray-500">
                {project.description ||
                  "No description provided."}
              </p>

              <div className="space-y-3 border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Manager
                  </span>

                  <span className="font-medium text-gray-700">
                    {project.manager?.name || "Unassigned"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Schedule
                  </span>

                  <span className="font-medium text-gray-700">
                    {formatDate(project.startDate)} –{" "}
                    {formatDate(project.endDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-gray-400">
                    <Users2 className="h-3.5 w-3.5" />
                    {project.members?.length || 0} members
                  </span>

                  <span className="inline-flex items-center gap-1 font-medium text-indigo-600">
                    View project
                    <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}