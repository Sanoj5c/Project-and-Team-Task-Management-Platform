"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import {
  CalendarDays,
  CheckCircle2,
  Eye,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  Users2,
  X,
} from "lucide-react";

import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
  type CreateProjectPayload,
} from "@/lib/projects-api";

import type {
  Project,
  ProjectStatus,
} from "@/types";

type ApiErrorResponse = {
  message?: string | string[];
};

type ProjectForm = {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
};

const emptyForm: ProjectForm = {
  name: "",
  description: "",
  status: "planning",
  startDate: "",
  endDate: "",
};

const statusStyles: Record<
  ProjectStatus,
  string
> = {
  planning: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-indigo-100 text-indigo-700",
  archived: "bg-gray-100 text-gray-500",
};

const statusLabels: Record<
  ProjectStatus,
  string
> = {
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

    const message = responseData?.message;

    if (Array.isArray(message)) {
      return message.join(", ");
    }

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function toDateInputValue(
  value?: string | null,
): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0];
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function PmProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [updating, setUpdating] =
    useState(false);

  const [deletingProjectId, setDeletingProjectId] =
    useState<string | null>(null);

  const [completingProjectId, setCompletingProjectId] =
    useState<string | null>(null);

  const [openActionProjectId, setOpenActionProjectId] =
    useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [editingProject, setEditingProject] =
    useState<Project | null>(null);

  const [form, setForm] =
    useState<ProjectForm>(emptyForm);

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    void loadProjects();
  }, []);

  async function loadProjects(): Promise<void> {
    try {
      setLoading(true);
      setError("");

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
    }
  }

  const statistics = useMemo(
    () => ({
      total: projects.length,
      active: projects.filter(
        (project) =>
          project.status === "active",
      ).length,
      completed: projects.filter(
        (project) =>
          project.status === "completed",
      ).length,
      members: new Set(
        projects.flatMap((project) =>
          (project.members ?? []).map(
            (member) => member.userId,
          ),
        ),
      ).size,
    }),
    [projects],
  );

  function updateForm<
    K extends keyof ProjectForm,
  >(
    field: K,
    value: ProjectForm[K],
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function openCreateModal(): void {
    setForm(emptyForm);
    setEditingProject(null);
    setOpenActionProjectId(null);
    setError("");
    setSuccess("");
    setShowCreateModal(true);
  }

  function closeCreateModal(): void {
    if (creating) {
      return;
    }

    setShowCreateModal(false);
    setForm(emptyForm);
  }

  function openEditModal(
    project: Project,
  ): void {
    setEditingProject(project);

    setForm({
      name: project.name,
      description:
        project.description ?? "",
      status: project.status,
      startDate: toDateInputValue(
        project.startDate,
      ),
      endDate: toDateInputValue(
        project.endDate,
      ),
    });

    setOpenActionProjectId(null);
    setError("");
    setSuccess("");
  }

  function closeEditModal(): void {
    if (updating) {
      return;
    }

    setEditingProject(null);
    setForm(emptyForm);
  }

  function validateForm(): boolean {
    if (form.name.trim().length < 2) {
      setError(
        "Project name must contain at least 2 characters.",
      );
      return false;
    }

    if (
      form.startDate &&
      form.endDate &&
      new Date(form.endDate) <
        new Date(form.startDate)
    ) {
      setError(
        "End date cannot be before the start date.",
      );
      return false;
    }

    return true;
  }

  async function handleCreate(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    const payload: CreateProjectPayload = {
      name: form.name.trim(),
      description:
        form.description.trim() || undefined,
      status: form.status,
    };

    if (form.startDate) {
      payload.startDate = new Date(
        `${form.startDate}T00:00:00`,
      ).toISOString();
    }

    if (form.endDate) {
      payload.endDate = new Date(
        `${form.endDate}T23:59:59`,
      ).toISOString();
    }

    try {
      const createdProject =
        await createProject(payload);

      setProjects((currentProjects) => [
        createdProject,
        ...currentProjects,
      ]);

      setForm(emptyForm);
      setShowCreateModal(false);

      setSuccess(
        "Project created successfully.",
      );
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Failed to create project.",
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!editingProject) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const updatedProject =
        await updateProject(
          editingProject.id,
          {
            name: form.name.trim(),
            description:
              form.description.trim(),
            status: form.status,
            startDate: form.startDate
              ? new Date(
                  `${form.startDate}T00:00:00`,
                ).toISOString()
              : null,
            endDate: form.endDate
              ? new Date(
                  `${form.endDate}T23:59:59`,
                ).toISOString()
              : null,
          },
        );

      setProjects((currentProjects) =>
        currentProjects.map((project) =>
          project.id ===
          updatedProject.id
            ? updatedProject
            : project,
        ),
      );

      setEditingProject(null);
      setForm(emptyForm);

      setSuccess(
        "Project updated successfully.",
      );
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Failed to update project.",
        ),
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleMarkCompleted(
    project: Project,
  ): Promise<void> {
    if (project.status === "completed") {
      setOpenActionProjectId(null);
      return;
    }

    const confirmed = window.confirm(
      `Mark "${project.name}" as completed?`,
    );

    if (!confirmed) {
      return;
    }

    setCompletingProjectId(project.id);
    setOpenActionProjectId(null);
    setError("");
    setSuccess("");

    try {
      const updatedProject =
        await updateProject(project.id, {
          status: "completed",
        });

      setProjects((currentProjects) =>
        currentProjects.map(
          (currentProject) =>
            currentProject.id === project.id
              ? updatedProject
              : currentProject,
        ),
      );

      setSuccess(
        `${project.name} was marked as completed.`,
      );
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Failed to complete project.",
        ),
      );
    } finally {
      setCompletingProjectId(null);
    }
  }

  async function handleDelete(
    project: Project,
  ): Promise<void> {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?\n\nThis may also remove related memberships and tasks. This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingProjectId(project.id);
    setOpenActionProjectId(null);
    setError("");
    setSuccess("");

    try {
      await deleteProject(project.id);

      setProjects((currentProjects) =>
        currentProjects.filter(
          (currentProject) =>
            currentProject.id !== project.id,
        ),
      );

      setSuccess(
        `${project.name} was deleted successfully.`,
      );
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Failed to delete project.",
        ),
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">
          Loading projects...
        </p>
      </div>
    );
  }

  return (
    <div
      onClick={() =>
        setOpenActionProjectId(null)
      }
    >
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Projects
          </h1>

          <p className="mt-1 text-gray-500">
            Projects you manage and their
            progress.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-start justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Projects"
          value={statistics.total}
          icon={
            <FolderOpen className="h-5 w-5 text-indigo-600" />
          }
        />

        <StatCard
          label="Active"
          value={statistics.active}
          icon={
            <FolderOpen className="h-5 w-5 text-emerald-600" />
          }
        />

        <StatCard
          label="Completed"
          value={statistics.completed}
          icon={
            <CheckCircle2 className="h-5 w-5 text-indigo-600" />
          }
        />

        <StatCard
          label="Team Members"
          value={statistics.members}
          icon={
            <Users2 className="h-5 w-5 text-amber-600" />
          }
        />
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <FolderOpen className="mx-auto h-10 w-10 text-gray-300" />

          <p className="mt-3 text-gray-500">
            You do not manage any projects yet.
          </p>

          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            Create your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.id}
              className="relative rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <FolderOpen className="h-5 w-5 text-indigo-600" />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      statusStyles[
                        project.status
                      ]
                    }`}
                  >
                    {
                      statusLabels[
                        project.status
                      ]
                    }
                  </span>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();

                      setOpenActionProjectId(
                        (currentId) =>
                          currentId === project.id
                            ? null
                            : project.id,
                      );
                    }}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                    aria-label={`Actions for ${project.name}`}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {openActionProjectId ===
                project.id && (
                <div
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                  className="absolute right-5 top-16 z-50 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        `/pm/projects/${project.id}`,
                      )
                    }
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="h-4 w-4" />
                    View project
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openEditModal(project)
                    }
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit project
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleMarkCompleted(
                        project,
                      )
                    }
                    disabled={
                      project.status ===
                        "completed" ||
                      completingProjectId ===
                        project.id
                    }
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />

                    {project.status ===
                    "completed"
                      ? "Already completed"
                      : completingProjectId ===
                          project.id
                        ? "Updating..."
                        : "Mark as completed"}
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    type="button"
                    onClick={() =>
                      void handleDelete(project)
                    }
                    disabled={
                      deletingProjectId ===
                      project.id
                    }
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />

                    {deletingProjectId ===
                    project.id
                      ? "Deleting..."
                      : "Delete project"}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/pm/projects/${project.id}`,
                  )
                }
                className="block w-full text-left"
              >
                <h2 className="text-lg font-semibold text-gray-900">
                  {project.name}
                </h2>

                <p className="mt-2 min-h-10 text-sm text-gray-500">
                  {project.description ||
                    "No description provided."}
                </p>

                <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Schedule
                    </span>

                    <span className="font-medium text-gray-600">
                      {formatDate(
                        project.startDate,
                      )}{" "}
                      –{" "}
                      {formatDate(
                        project.endDate,
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-400">
                      <Users2 className="h-3.5 w-3.5" />
                      {project.members?.length ??
                        0}{" "}
                      members
                    </span>

                    <span className="font-medium text-indigo-600">
                      View project
                    </span>
                  </div>
                </div>
              </button>
            </article>
          ))}
        </div>
      )}

      {showCreateModal && (
        <ProjectModal
          title="Create new project"
          description="Create a project for your team."
          form={form}
          saving={creating}
          submitLabel="Create Project"
          onClose={closeCreateModal}
          onSubmit={handleCreate}
          onChange={updateForm}
        />
      )}

      {editingProject && (
        <ProjectModal
          title="Edit project"
          description={`Update ${editingProject.name}.`}
          form={form}
          saving={updating}
          submitLabel="Save Changes"
          onClose={closeEditModal}
          onSubmit={handleUpdate}
          onChange={updateForm}
        />
      )}
    </div>
  );
}

function ProjectModal({
  title,
  description,
  form,
  saving,
  submitLabel,
  onClose,
  onSubmit,
  onChange,
}: {
  title: string;
  description: string;
  form: ProjectForm;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>,
  ) => Promise<void>;
  onChange: <
    K extends keyof ProjectForm,
  >(
    field: K,
    value: ProjectForm[K],
  ) => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {title}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(event) =>
            void onSubmit(event)
          }
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
                onChange(
                  "name",
                  event.target.value,
                )
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
              rows={3}
              value={form.description}
              onChange={(event) =>
                onChange(
                  "description",
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              placeholder="Describe the project"
            />
          </div>

          <div>
            <label
              htmlFor="project-status"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Status
            </label>

            <select
              id="project-status"
              value={form.status}
              onChange={(event) =>
                onChange(
                  "status",
                  event.target
                    .value as ProjectStatus,
                )
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="planning">
                Planning
              </option>
              <option value="active">
                Active
              </option>
              <option value="on_hold">
                On Hold
              </option>
              <option value="completed">
                Completed
              </option>
              <option value="archived">
                Archived
              </option>
            </select>
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
                  onChange(
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
                min={
                  form.startDate || undefined
                }
                onChange={(event) =>
                  onChange(
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
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {value}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
          {icon}
        </div>
      </div>
    </div>
  );
}