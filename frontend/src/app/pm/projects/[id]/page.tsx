"use client";



import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
  usePathname,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckSquare,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import {
  createTask,
  deleteTask,
  getTasksForProject,
  type CreateTaskPayload,
} from "@/lib/tasks-api";

import type {
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  User,
} from "@/types";


type ApiErrorResponse = {
  message?: string | string[];
};

type TaskForm = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assigneeId: string;
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api/v1"
).replace(/\/$/, "");

const initialTaskForm: TaskForm = {
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  assigneeId: "",
};

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const taskPriorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
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

function getCaughtErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
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

function getProjectStatusClasses(
  status?: string | null,
): string {
  const normalized = status?.toLowerCase();

  if (normalized === "completed") {
    return "bg-green-100 text-green-700";
  }

  if (
    normalized === "active" ||
    normalized === "in_progress"
  ) {
    return "bg-blue-100 text-blue-700";
  }

  if (normalized === "on_hold") {
    return "bg-yellow-100 text-yellow-700";
  }

  if (normalized === "archived") {
    return "bg-gray-100 text-gray-600";
  }

  return "bg-purple-100 text-purple-700";
}

function getTaskStatusClasses(
  status: TaskStatus,
): string {
  const styles: Record<TaskStatus, string> = {
    todo: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    in_review: "bg-amber-100 text-amber-700",
    done: "bg-green-100 text-green-700",
  };

  return styles[status];
}

function getTaskPriorityClasses(
  priority: TaskPriority,
): string {
  const styles: Record<TaskPriority, string> = {
    low: "bg-slate-100 text-slate-600",
    medium: "bg-indigo-100 text-indigo-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  return styles[priority];
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

function toDateInputValue(
  date?: string | null,
): string {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().split("T")[0];
}

function formatRole(role?: string): string {
  if (!role) {
    return "Member";
  }

  return role
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function ProjectDetailsPage() {
 const router = useRouter();
 const pathname = usePathname();
 const params = useParams<{ id: string }>();

 const projectId = params.id;

 const projectsRoute = pathname.startsWith("/admin")
  ? "/admin/projects"
  : "/pm/projects";

  const [project, setProject] =
    useState<Project | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedUserId, setSelectedUserId] =
    useState("");

  const [taskForm, setTaskForm] =
    useState<TaskForm>(initialTaskForm);

  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] =
    useState(true);

  const [addingMember, setAddingMember] =
    useState(false);

  const [removingUserId, setRemovingUserId] =
    useState<string | null>(null);

  const [creatingTask, setCreatingTask] =
    useState(false);

  const [deletingTaskId, setDeletingTaskId] =
    useState<string | null>(null);

  const [showAddMember, setShowAddMember] =
    useState(false);

  const [showCreateTask, setShowCreateTask] =
    useState(false);

  const [showEditDates, setShowEditDates] =
    useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [savingDates, setSavingDates] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadProject = useCallback(
    async (): Promise<void> => {
      const token = getAccessToken();

      if (!token) {
        setError(
          "You are not logged in. Please log in again.",
        );
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/projects/${projectId}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const body = (await response.json()) as
          | Project
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              body as ApiErrorResponse,
              "Failed to load project.",
            ),
          );
        }

        setProject(body as Project);
      } catch (caughtError: unknown) {
        setError(
          getCaughtErrorMessage(
            caughtError,
            "Failed to load project.",
          ),
        );
      } finally {
        setLoading(false);
      }
    },
    [projectId],
  );

  const loadUsers =
    useCallback(async (): Promise<void> => {
      const token = getAccessToken();

      if (!token) {
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/users`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        const body = (await response.json()) as
          | User[]
          | ApiErrorResponse;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              body as ApiErrorResponse,
              "Failed to load users.",
            ),
          );
        }

        const teamMembers = (body as User[]).filter(
          (user) =>
            user.isActive &&
            user.role === "team_member",
        );

        setUsers(teamMembers);
      } catch (caughtError: unknown) {
        setError(
          getCaughtErrorMessage(
            caughtError,
            "Failed to load users.",
          ),
        );
      }
    }, []);

  const loadTasks =
    useCallback(async (): Promise<void> => {
      try {
        setLoadingTasks(true);

        const taskData =
          await getTasksForProject(projectId);

        setTasks(taskData);
      } catch (caughtError: unknown) {
        setError(
          getCaughtErrorMessage(
            caughtError,
            "Failed to load project tasks.",
          ),
        );
      } finally {
        setLoadingTasks(false);
      }
    }, [projectId]);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    void Promise.all([
      loadProject(),
      loadUsers(),
      loadTasks(),
    ]);
  }, [
    loadProject,
    loadTasks,
    loadUsers,
    projectId,
  ]);

  const availableUsers = useMemo(() => {
    const existingMemberIds = new Set(
      project?.members?.map(
        (member) =>
          member.user?.id ?? member.userId,
      ) ?? [],
    );

    return users.filter(
      (user) => !existingMemberIds.has(user.id),
    );
  }, [project, users]);

  function updateTaskForm<
    K extends keyof TaskForm,
  >(field: K, value: TaskForm[K]): void {
    setTaskForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function openEditDates(): void {
    setStartDate(
      toDateInputValue(project?.startDate),
    );

    setEndDate(
      toDateInputValue(project?.endDate),
    );

    setError("");
    setSuccess("");
    setShowEditDates(true);
  }

  function closeEditDates(): void {
    if (savingDates) {
      return;
    }

    setShowEditDates(false);
  }

  function openCreateTaskModal(): void {
    setTaskForm(initialTaskForm);
    setError("");
    setSuccess("");
    setShowCreateTask(true);
  }

  function closeCreateTaskModal(): void {
    if (creatingTask) {
      return;
    }

    setShowCreateTask(false);
    setTaskForm(initialTaskForm);
  }

  async function handleSaveDates(): Promise<void> {
    if (
      startDate &&
      endDate &&
      new Date(endDate) < new Date(startDate)
    ) {
      setError(
        "End date cannot be before the start date.",
      );
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setError(
        "You are not logged in. Please log in again.",
      );
      return;
    }

    setSavingDates(true);
    setError("");
    setSuccess("");

    const requestBody: {
      startDate?: string;
      endDate?: string;
    } = {};

    if (startDate) {
      requestBody.startDate = new Date(
        `${startDate}T00:00:00`,
      ).toISOString();
    }

    if (endDate) {
      requestBody.endDate = new Date(
        `${endDate}T23:59:59`,
      ).toISOString();
    }

    try {
      const response = await fetch(
        `${API_URL}/projects/${projectId}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      const body = (await response.json()) as
        | Project
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            body as ApiErrorResponse,
            "Failed to update project dates.",
          ),
        );
      }

      setProject(body as Project);
      setShowEditDates(false);
      setSuccess(
        "Project dates updated successfully.",
      );
    } catch (caughtError: unknown) {
      setError(
        getCaughtErrorMessage(
          caughtError,
          "Failed to update project dates.",
        ),
      );
    } finally {
      setSavingDates(false);
    }
  }

  async function handleAddMember(): Promise<void> {
    if (!selectedUserId) {
      setError("Please select a team member.");
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setError(
        "You are not logged in. Please log in again.",
      );
      return;
    }

    setAddingMember(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/projects/${projectId}/members`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: selectedUserId,
          }),
        },
      );

      const body = (await response.json()) as
        | Project
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            body as ApiErrorResponse,
            "Failed to add member.",
          ),
        );
      }

      setProject(body as Project);
      setSelectedUserId("");
      setShowAddMember(false);

      setSuccess(
        "Team member added successfully.",
      );
    } catch (caughtError: unknown) {
      setError(
        getCaughtErrorMessage(
          caughtError,
          "Failed to add member.",
        ),
      );
    } finally {
      setAddingMember(false);
    }
  }

  async function handleRemoveMember(
    userId: string,
  ): Promise<void> {
    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the project?",
    );

    if (!confirmed) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setError(
        "You are not logged in. Please log in again.",
      );
      return;
    }

    setRemovingUserId(userId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/projects/${projectId}/members/${userId}`,
        {
          method: "DELETE",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const body = (await response.json()) as
        | Project
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            body as ApiErrorResponse,
            "Failed to remove member.",
          ),
        );
      }

      setProject(body as Project);

      setSuccess(
        "Team member removed successfully.",
      );
    } catch (caughtError: unknown) {
      setError(
        getCaughtErrorMessage(
          caughtError,
          "Failed to remove member.",
        ),
      );
    } finally {
      setRemovingUserId(null);
    }
  }

  async function handleCreateTask(): Promise<void> {
    if (taskForm.title.trim().length < 2) {
      setError(
        "Task title must contain at least 2 characters.",
      );
      return;
    }

    if (!taskForm.assigneeId) {
      setError(
        "Please choose a project member as the assignee.",
      );
      return;
    }

    setCreatingTask(true);
    setError("");
    setSuccess("");

    const payload: CreateTaskPayload = {
      title: taskForm.title.trim(),
      description:
        taskForm.description.trim() || undefined,
      status: taskForm.status,
      priority: taskForm.priority,
      projectId,
      assigneeId: taskForm.assigneeId,
    };

    if (taskForm.dueDate) {
      payload.dueDate = new Date(
        `${taskForm.dueDate}T23:59:59`,
      ).toISOString();
    }

    try {
      await createTask(payload);

      await loadTasks();

      setTaskForm(initialTaskForm);
      setShowCreateTask(false);

      setSuccess(
        "Task created and assigned successfully.",
      );
    } catch (caughtError: unknown) {
      setError(
        getCaughtErrorMessage(
          caughtError,
          "Failed to create task.",
        ),
      );
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleDeleteTask(
    task: Task,
  ): Promise<void> {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingTaskId(task.id);
    setError("");
    setSuccess("");

    try {
      await deleteTask(task.id);

      setTasks((currentTasks) =>
        currentTasks.filter(
          (currentTask) =>
            currentTask.id !== task.id,
        ),
      );

      setSuccess("Task deleted successfully.");
    } catch (caughtError: unknown) {
      setError(
        getCaughtErrorMessage(
          caughtError,
          "Failed to delete task.",
        ),
      );
    } finally {
      setDeletingTaskId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">
          Loading project details...
        </p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="p-8">
        <button
          type="button"
          onClick={() =>
            router.push(projectsRoute)
          }
          className="mb-6 flex items-center gap-2 text-sm font-medium text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to projects
        </button>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="p-8">
      <button
        type="button"
        onClick={() =>
          router.push(projectsRoute)
        }
        className="mb-6 flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to projects
      </button>

      {error && (
        <div className="mb-5 flex items-start justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
        <div className="mb-5 flex items-start justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
              <FolderOpen className="h-6 w-6 text-indigo-600" />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>

              <p className="mt-2 max-w-2xl text-gray-500">
                {project.description ||
                  "No description provided."}
              </p>
            </div>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${getProjectStatusClasses(
              project.status,
            )}`}
          >
            {formatStatus(project.status)}
          </span>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">
              Project schedule
            </h2>

            <button
              type="button"
              onClick={openEditDates}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              <Pencil className="h-4 w-4" />
              Edit Dates
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarDays className="h-4 w-4" />
                Start date
              </div>

              <p className="mt-2 font-medium text-gray-900">
                {formatDate(project.startDate)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <CalendarDays className="h-4 w-4" />
                End date
              </div>

              <p className="mt-2 font-medium text-gray-900">
                {formatDate(project.endDate)}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="h-4 w-4" />
                Team members
              </div>

              <p className="mt-2 font-medium text-gray-900">
                {project.members?.length ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Project team
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add or remove members assigned to this
              project.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowAddMember(
                (current) => !current,
              );

              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {showAddMember ? (
              <X className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            {showAddMember
              ? "Cancel"
              : "Add Member"}
          </button>
        </div>

        {showAddMember && (
          <div className="mt-6 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
            <label
              htmlFor="team-member"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Select team member
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <select
                id="team-member"
                value={selectedUserId}
                onChange={(event) =>
                  setSelectedUserId(
                    event.target.value,
                  )
                }
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">
                  Choose a team member
                </option>

                {availableUsers.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                  >
                    {user.name} — {user.email}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() =>
                  void handleAddMember()
                }
                disabled={
                  addingMember ||
                  !selectedUserId
                }
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {addingMember
                  ? "Adding..."
                  : "Add to Project"}
              </button>
            </div>
          </div>
        )}

        {!project.members ||
        project.members.length === 0 ? (
          <div className="mt-6 rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
            No team members are assigned to this project.
          </div>
        ) : (
          <div className="mt-6 divide-y divide-gray-100 rounded-xl border border-gray-200">
            {project.members.map((member) => {
              const userId =
                member.user?.id ?? member.userId;

              return (
                <div
                  key={member.id}
                  className="flex flex-col justify-between gap-4 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                      {getInitials(
                        member.user?.name ??
                          "Member",
                      )}
                    </div>

                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user?.name ??
                          "Unnamed member"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {member.user?.email ??
                          "Email unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      {formatRole(
                        member.user?.role,
                      )}
                    </span>

                    {userId && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleRemoveMember(
                            userId,
                          )
                        }
                        disabled={
                          removingUserId === userId
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />

                        {removingUserId === userId
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Project tasks
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Create tasks and assign them to project
              members.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateTaskModal}
            disabled={
              !project.members ||
              project.members.length === 0
            }
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Create Task
          </button>
        </div>

        {!project.members ||
        project.members.length === 0 ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
            Add at least one team member before creating
            a task.
          </div>
        ) : loadingTasks ? (
          <div className="mt-6 rounded-xl bg-gray-50 p-8 text-center text-sm text-gray-500">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <div className="mt-6 rounded-xl bg-gray-50 p-10 text-center">
            <CheckSquare className="mx-auto h-8 w-8 text-gray-300" />

            <p className="mt-3 text-sm text-gray-500">
              No tasks have been created for this
              project.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[850px] text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                  <th className="px-5 py-3 font-medium">
                    Task
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Assignee
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Status
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Priority
                  </th>

                  <th className="px-5 py-3 font-medium">
                    Due date
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-t border-gray-100"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">
                        {task.title}
                      </p>

                      <p className="mt-1 max-w-xs truncate text-xs text-gray-500">
                        {task.description ||
                          "No description"}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {task.assignee?.name ??
                        "Unassigned"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getTaskStatusClasses(
                          task.status,
                        )}`}
                      >
                        {
                          taskStatusLabels[
                            task.status
                          ]
                        }
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getTaskPriorityClasses(
                          task.priority,
                        )}`}
                      >
                        {
                          taskPriorityLabels[
                            task.priority
                          ]
                        }
                      </span>
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {formatDate(task.dueDate)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteTask(task)
                        }
                        disabled={
                          deletingTaskId === task.id
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />

                        {deletingTaskId === task.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showEditDates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <h2 className="text-xl font-semibold text-gray-900">
                Edit project dates
              </h2>

              <button
                type="button"
                onClick={closeEditDates}
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Start date
                </label>

                <input
                  type="date"
                  value={startDate}
                  onChange={(event) =>
                    setStartDate(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  End date
                </label>

                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) =>
                    setEndDate(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeEditDates}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleSaveDates()
                  }
                  disabled={savingDates}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {savingDates
                    ? "Saving..."
                    : "Save Dates"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreateTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Create task
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Create and assign a task to a project
                  member.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateTaskModal}
                disabled={creatingTask}
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Task title
                </label>

                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(event) =>
                    updateTaskForm(
                      "title",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={taskForm.description}
                  onChange={(event) =>
                    updateTaskForm(
                      "description",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                  placeholder="Describe the task"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Assignee
                </label>

                <select
                  value={taskForm.assigneeId}
                  onChange={(event) =>
                    updateTaskForm(
                      "assigneeId",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5"
                >
                  <option value="">
                    Choose a project member
                  </option>

                  {project.members.map((member) => (
                    <option
                      key={member.id}
                      value={member.userId}
                    >
                      {member.user.name} —{" "}
                      {member.user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Status
                  </label>

                  <select
                    value={taskForm.status}
                    onChange={(event) =>
                      updateTaskForm(
                        "status",
                        event.target
                          .value as TaskStatus,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5"
                  >
                    <option value="todo">
                      To Do
                    </option>

                    <option value="in_progress">
                      In Progress
                    </option>

                    <option value="in_review">
                      In Review
                    </option>

                    <option value="done">
                      Done
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Priority
                  </label>

                  <select
                    value={taskForm.priority}
                    onChange={(event) =>
                      updateTaskForm(
                        "priority",
                        event.target
                          .value as TaskPriority,
                      )
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5"
                  >
                    <option value="low">
                      Low
                    </option>

                    <option value="medium">
                      Medium
                    </option>

                    <option value="high">
                      High
                    </option>

                    <option value="urgent">
                      Urgent
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Due date
                </label>

                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(event) =>
                    updateTaskForm(
                      "dueDate",
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeCreateTaskModal}
                  disabled={creatingTask}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleCreateTask()
                  }
                  disabled={creatingTask}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                >
                  {creatingTask
                    ? "Creating..."
                    : "Create Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
