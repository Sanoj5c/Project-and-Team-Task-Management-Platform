"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { AxiosError } from "axios";
import {
  CheckCircle2,
  ClipboardCopy,
  ClipboardList,
  Download,
  MoreVertical,
  Plus,
  Rocket,
  Trash2,
  Users as UsersIcon,
  X,
} from "lucide-react";

import {
  createUser,
  deleteUser,
  getUsers,
  type CreateUserPayload,
} from "@/lib/users-api";
import { getProjects } from "@/lib/projects-api";
import type { Project, User } from "@/types";

type UserFilter = "all" | "active" | "inactive";

type ApiErrorResponse = {
  message?: string | string[];
};

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

const initialForm: CreateUserPayload = {
  name: "",
  email: "",
  password: "",
  role: "team_member",
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

function escapeCsvValue(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatRole(role: string): string {
  return roleLabels[role] ?? role;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] =
    useState<UserFilter>("all");

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddUserModal, setShowAddUserModal] =
    useState(false);

  const [form, setForm] =
    useState<CreateUserPayload>(initialForm);

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [openActionUserId, setOpenActionUserId] =
    useState<string | null>(null);

  const [deletingUserId, setDeletingUserId] =
    useState<string | null>(null);

  async function loadData(): Promise<void> {
    try {
      setLoading(true);
      setError("");

      const [usersData, projectsData] =
        await Promise.all([
          getUsers(),
          getProjects(),
        ]);

      setUsers(usersData);
      setProjects(projectsData);
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Failed to load users.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (filter === "active") {
        return user.isActive;
      }

      if (filter === "inactive") {
        return !user.isActive;
      }

      return true;
    });
  }, [filter, users]);

  const activeProjectsCount = projects.filter(
    (project) => project.status === "active",
  ).length;

  function updateForm<K extends keyof CreateUserPayload>(
    field: K,
    value: CreateUserPayload[K],
  ): void {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function openAddUserModal(): void {
    setForm(initialForm);
    setConfirmPassword("");
    setError("");
    setSuccess("");
    setShowAddUserModal(true);
  }

  function closeAddUserModal(): void {
    if (creating) {
      return;
    }

    setShowAddUserModal(false);
    setForm(initialForm);
    setConfirmPassword("");
  }

  async function handleCreateUser(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.name.trim().length < 2) {
      setError(
        "Name must contain at least 2 characters.",
      );
      return;
    }

    if (!form.email.trim()) {
      setError("Email address is required.");
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Password must contain at least 8 characters.",
      );
      return;
    }

    if (form.password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setCreating(true);

    try {
      const newUser = await createUser({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      setUsers((currentUsers) => [
        newUser,
        ...currentUsers,
      ]);

      setShowAddUserModal(false);
      setForm(initialForm);
      setConfirmPassword("");
      setSuccess("User created successfully.");
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Failed to create user.",
        ),
      );
    } finally {
      setCreating(false);
    }
  }

  function handleExport(): void {
    if (users.length === 0) {
      setError("There are no users to export.");
      return;
    }

    setError("");
    setSuccess("");

    const headers = [
      "ID",
      "Name",
      "Email",
      "Role",
      "Status",
      "Created At",
      "Updated At",
    ];

    const rows = users.map((user) => [
      user.id,
      user.name,
      user.email,
      formatRole(user.role),
      user.isActive ? "Active" : "Inactive",
      user.createdAt ?? "",
      user.updatedAt ?? "",
    ]);

    const csvContent = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) =>
        row
          .map((value) =>
            escapeCsvValue(String(value)),
          )
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `taskflow-users-${
      new Date().toISOString().split("T")[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    setSuccess("Users exported successfully.");
  }

  async function handleCopyEmail(
    email: string,
  ): Promise<void> {
    try {
      await navigator.clipboard.writeText(email);
      setOpenActionUserId(null);
      setError("");
      setSuccess("Email copied successfully.");
    } catch {
      setError("Failed to copy email.");
    }
  }

  async function handleDeleteUser(
    user: User,
  ): Promise<void> {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name}?`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(user.id);
    setOpenActionUserId(null);
    setError("");
    setSuccess("");

    try {
      await deleteUser(user.id);

      setUsers((currentUsers) =>
        currentUsers.filter(
          (currentUser) => currentUser.id !== user.id,
        ),
      );

      setSuccess(
        `${user.name} was deleted successfully.`,
      );
    } catch (caughtError: unknown) {
      setError(
        getErrorMessage(
          caughtError,
          "Failed to delete user.",
        ),
      );
    } finally {
      setDeletingUserId(null);
    }
  }

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading users...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            User Management
          </h1>

          <p className="mt-1 text-gray-500">
            Manage your team members and their access
            levels.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <button
            type="button"
            onClick={openAddUserModal}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
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
        <div
          role="status"
          className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Users"
          value={users.length.toLocaleString()}
          icon={
            <UsersIcon className="h-4 w-4 text-indigo-600" />
          }
          iconBg="bg-indigo-100"
        />

        <StatCard
          label="Active Projects"
          value={activeProjectsCount.toString()}
          icon={
            <Rocket className="h-4 w-4 text-amber-600" />
          }
          iconBg="bg-amber-100"
        />

        <StatCard
          label="Total Projects"
          value={projects.length.toString()}
          icon={
            <ClipboardList className="h-4 w-4 text-gray-600" />
          }
          iconBg="bg-gray-100"
        />

        <StatCard
          label="Active Users"
          value={users
            .filter((user) => user.isActive)
            .length.toString()}
          icon={
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          }
          iconBg="bg-emerald-100"
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 px-6 py-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Users
            </h2>

            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {users.length} Total
            </span>
          </div>

          <div className="flex rounded-lg bg-gray-100 p-1 text-sm">
            {(
              [
                "all",
                "active",
                "inactive",
              ] as const
            ).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`rounded-md px-3 py-1 capitalize transition-colors ${
                  filter === item
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-gray-400">
                <th className="px-6 py-3 font-medium">
                  Name
                </th>
                <th className="px-6 py-3 font-medium">
                  Email
                </th>
                <th className="px-6 py-3 font-medium">
                  Role
                </th>
                <th className="px-6 py-3 font-medium">
                  Status
                </th>
                <th className="px-6 py-3 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-t border-gray-50"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                        {user.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <span className="font-medium text-gray-900">
                        {user.name}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-gray-500">
                    {user.email}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        roleBadgeStyles[user.role] ??
                        "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {roleLabels[user.role] ??
                        user.role}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          user.isActive
                            ? "bg-emerald-500"
                            : "bg-gray-300"
                        }`}
                      />

                      {user.isActive
                        ? "Active"
                        : "Inactive"}
                    </span>
                  </td>
                  <td className="relative px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpenActionUserId((currentId) =>
                          currentId === user.id ? null : user.id,
                        );
                      }}
                      disabled={deletingUserId === user.id}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Actions for ${user.name}`}
                      aria-expanded={openActionUserId === user.id}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {openActionUserId === user.id && (
                      <div
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        className="absolute right-6 top-12 z-[100] w-48 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-left shadow-xl"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void handleCopyEmail(user.email)
                          }
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <ClipboardCopy className="h-4 w-4" />
                          Copy email
                        </button>

                        <div className="my-1 border-t border-gray-100" />

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteUser(user)
                          }
                          disabled={deletingUserId === user.id}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />

                          {deletingUserId === user.id
                            ? "Deleting..."
                            : "Delete user"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="border-t border-gray-100 px-6 py-10 text-center text-sm text-gray-500">
            No users match this filter.
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 text-sm text-gray-500">
          <span>
            Showing {filteredUsers.length} of{" "}
            {users.length} users
          </span>
        </div>
      </div>

      {showAddUserModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-user-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeAddUserModal();
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
              <div>
                <h2
                  id="add-user-title"
                  className="text-xl font-semibold text-gray-900"
                >
                  Add new user
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Create an account and assign its role.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddUserModal}
                disabled={creating}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateUser}
              className="space-y-4 p-6"
            >
              <div>
                <label
                  htmlFor="user-name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Full name
                </label>

                <input
                  id="user-name"
                  type="text"
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      "name",
                      event.target.value,
                    )
                  }
                  minLength={2}
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label
                  htmlFor="user-email"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>

                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateForm(
                      "email",
                      event.target.value,
                    )
                  }
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="name@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="user-role"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Role
                </label>

                <select
                  id="user-role"
                  value={form.role}
                  onChange={(event) =>
                    updateForm(
                      "role",
                      event.target
                        .value as CreateUserPayload["role"],
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="team_member">
                    Team Member
                  </option>
                  <option value="project_manager">
                    Project Manager
                  </option>
                  <option value="admin">
                    Admin
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="user-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>

                <input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    updateForm(
                      "password",
                      event.target.value,
                    )
                  }
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Confirm password
                </label>

                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  minLength={8}
                  required
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  placeholder="Re-enter password"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeAddUserModal}
                  disabled={creating}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating
                    ? "Creating..."
                    : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
  icon: ReactNode;
  iconBg: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </span>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}
        >
          {icon}
        </div>
      </div>

      <p className="text-3xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}