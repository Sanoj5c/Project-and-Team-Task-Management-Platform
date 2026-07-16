"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

type ProjectMemberUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

type ProjectMember = {
  id?: string;
  projectId?: string;
  userId?: string;
  user?: ProjectMemberUser;
};

type ProjectManager = {
  id: string;
  name: string;
  email: string;
};

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
  managerId?: string;
  manager?: ProjectManager;
  members?: ProjectMember[];
};

type ApiErrorResponse = {
  message?: string | string[];
};

type CreateProjectForm = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api/v1"
).replace(/\/$/, "");

const initialForm: CreateProjectForm = {
  name: "",
  description: "",
  startDate: "",
  endDate: "",
};

function getAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("accessToken") ??
    localStorage.getItem("access_token") ??
    localStorage.getItem("token")
  );
}

function getErrorMessage(
  body: ApiErrorResponse,
  fallback: string,
): string {
  if (Array.isArray(body.message)) {
    return body.message.join(", ");
  }

  return body.message ?? fallback;
}

function formatStatus(status?: string | null): string {
  if (!status) {
    return "Planning";
  }

  return status
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function getStatusClasses(status?: string | null): string {
  const normalizedStatus = status?.toLowerCase();

  if (
    normalizedStatus === "completed" ||
    normalizedStatus === "done"
  ) {
    return "bg-green-100 text-green-700";
  }

  if (
    normalizedStatus === "in_progress" ||
    normalizedStatus === "active"
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (
    normalizedStatus === "on_hold" ||
    normalizedStatus === "paused"
  ) {
    return "bg-yellow-100 text-yellow-700";
  }

  if (normalizedStatus === "cancelled") {
    return "bg-red-100 text-red-700";
  }

  return "bg-purple-100 text-purple-700";
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function ProjectManagerProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [form, setForm] =
    useState<CreateProjectForm>(initialForm);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProjects(
    showRefreshLoader = false,
  ): Promise<void> {
    const token = getAccessToken();

    if (!token) {
      setError(
        "You are not logged in. Please log in again.",
      );
      setLoading(false);
      return;
    }

    if (showRefreshLoader) {
      setRefreshing(true);
    }

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const body = (await response.json()) as
        | Project[]
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            body as ApiErrorResponse,
            "Failed to load projects.",
          ),
        );
      }

      setProjects(body as Project[]);
      setError("");
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to load projects.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return projects;
    }

    return projects.filter((project) => {
      const projectName = project.name.toLowerCase();
      const description =
        project.description?.toLowerCase() ?? "";
      const status = project.status?.toLowerCase() ?? "";

      return (
        projectName.includes(query) ||
        description.includes(query) ||
        status.includes(query)
      );
    });
  }, [projects, search]);

  const totalMembers = useMemo(() => {
    const memberIds = new Set<string>();

    projects.forEach((project) => {
      project.members?.forEach((membership) => {
        const id =
          membership.user?.id ?? membership.userId;

        if (id) {
          memberIds.add(id);
        }
      });
    });

    return memberIds.size;
  }, [projects]);

  const activeProjects = projects.filter((project) => {
    const status = project.status?.toLowerCase();

    return (
      status === "active" ||
      status === "in_progress" ||
      status === "in progress"
    );
  }).length;

  const completedProjects = projects.filter((project) => {
    const status = project.status?.toLowerCase();

    return status === "completed" || status === "done";
  }).length;

  function updateForm(
    field: keyof CreateProjectForm,
    value: string,
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function openCreateModal(): void {
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowCreateModal(true);
  }

  function closeCreateModal(): void {
    if (!creating) {
      setShowCreateModal(false);
      setForm(initialForm);
    }
  }

  async function handleCreateProject(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      setError(
        "You are not logged in. Please log in again.",
      );
      return;
    }

    if (form.name.trim().length < 2) {
      setError(
        "Project name must contain at least 2 characters.",
      );
      return;
    }

    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate) < new Date(form.startDate)
    ) {
      setError(
        "The end date cannot be before the start date.",
      );
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    const requestBody: Record<string, string> = {
      name: form.name.trim(),
      description: form.description.trim(),
    };

    if (form.startDate) {
      requestBody.startDate = new Date(
        `${form.startDate}T00:00:00`,
      ).toISOString();
    }

    if (form.endDate) {
      requestBody.endDate = new Date(
        `${form.endDate}T23:59:59`,
      ).toISOString();
    }

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const body = (await response.json()) as
        | Project
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            body as ApiErrorResponse,
            "Failed to create project.",
          ),
        );
      }

      setShowCreateModal(false);
      setForm(initialForm);
      setSuccess("Project created successfully.");

      await loadProjects();
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to create project.",
      );
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">
          My Projects
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your assigned projects and team members.
        </p>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-10 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />

          <p className="mt-4 text-sm text-gray-500">
            Loading projects...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            My Projects
          </h1>

          <p className="mt-2 text-gray-500">
            Manage your projects, deadlines, and assigned
            team members.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 5v14M5 12h14"
            />
          </svg>

          New Project
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            className="font-semibold"
          >
            ×
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mt-6 flex items-start justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            className="font-semibold"
          >
            ×
          </button>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Total Projects
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {projects.length}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Active Projects
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {activeProjects}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Completed
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {completedProjects}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-medium text-gray-500">
            Team Members
          </p>

          <p className="mt-2 text-3xl font-bold text-purple-600">
            {totalMembers}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Project list
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {filteredProjects.length}{" "}
              {filteredProjects.length === 1
                ? "project"
                : "projects"}
            </p>
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m21 21-4.35-4.35m1.35-5.65a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
                />
              </svg>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search projects..."
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 sm:w-64"
              />
            </div>

            <button
              type="button"
              onClick={() => void loadProjects(true)}
              disabled={refreshing}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                className="h-7 w-7 text-indigo-600"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                />
              </svg>
            </div>

            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {search
                ? "No matching projects"
                : "No projects yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
              {search
                ? "Try searching using another project name, description, or status."
                : "Create your first project to begin assigning team members and managing tasks."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Create Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 p-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProjects.map((project) => (
              <article
                key={project.id}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-100 text-lg font-bold text-indigo-700">
                    {getInitials(project.name)}
                  </div>

                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                      project.status,
                    )}`}
                  >
                    {formatStatus(project.status)}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {project.name}
                </h3>

                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-gray-500">
                  {project.description ||
                    "No project description provided."}
                </p>

                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Start date
                    </span>

                    <span className="font-medium text-gray-700">
                      {formatDate(project.startDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      End date
                    </span>

                    <span className="font-medium text-gray-700">
                      {formatDate(project.endDate)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      Members
                    </span>

                    <span className="font-medium text-gray-700">
                      {project.members?.length ?? 0}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/pm/projects/${project.id}`}
                    className="inline-flex w-full items-center justify-center rounded-lg border border-indigo-200 px-4 py-2.5 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
                  >
                    View Project
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-project-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateModal();
            }
          }}
        >
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2
                  id="create-project-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  Create new project
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the initial project information.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={creating}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleCreateProject}
              className="space-y-5 p-6"
            >
              <div>
                <label
                  htmlFor="project-name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Project name
                </label>

                <input
                  id="project-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateForm("name", event.target.value)
                  }
                  minLength={2}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Enter project name"
                />
              </div>

              <div>
                <label
                  htmlFor="project-description"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>

                <textarea
                  id="project-description"
                  value={form.description}
                  onChange={(event) =>
                    updateForm(
                      "description",
                      event.target.value,
                    )
                  }
                  rows={4}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Describe the project"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="project-start-date"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Start date
                  </label>

                  <input
                    id="project-start-date"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      updateForm(
                        "startDate",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="project-end-date"
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    End date
                  </label>

                  <input
                    id="project-end-date"
                    type="date"
                    value={form.endDate}
                    min={form.startDate || undefined}
                    onChange={(event) =>
                      updateForm(
                        "endDate",
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={creating}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating
                    ? "Creating..."
                    : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}