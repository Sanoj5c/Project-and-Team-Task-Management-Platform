"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderOpen,
  LayoutList,
  LoaderCircle,
  LogOut,
  Mail,
  Save,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { clearAuthSession, getCurrentUser } from "@/lib/auth-api";
import { getProjects } from "@/lib/projects-api";
import { getMyTasks, updateTaskStatus } from "@/lib/tasks-api";
import { getMyProfile, updateMyProfile } from "@/lib/users-api";
import type {
  Project,
  ProjectStatus,
  Task,
  TaskPriority,
  TaskStatus,
  User,
} from "@/types";

type MemberTab = "tasks" | "projects" | "profile";
type TaskFilter = "all" | TaskStatus;
type ProfileForm = { name: string; email: string };
type ApiErrorResponse = { message?: string | string[] };

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const taskStatusDotStyles: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
};

const projectStatusLabels: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

const projectStatusStyles: Record<ProjectStatus, string> = {
  planning: "bg-gray-100 text-gray-700",
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-indigo-100 text-indigo-700",
  archived: "bg-gray-100 text-gray-500",
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: ApiErrorResponse } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : fallback;
}

function formatDate(date?: string | null): string {
  if (!date) return "Not set";
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "Not set";
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

export default function MemberDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MemberTab>("tasks");
  const [profile, setProfile] = useState<User | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileForm>({ name: "", email: "" });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "team_member") {
      router.replace("/login");
      return;
    }
    void loadMemberData();
  }, [router]);

  async function loadMemberData(): Promise<void> {
    try {
      setLoading(true);
      setError("");
      const [profileData, taskData, projectData] = await Promise.all([
        getMyProfile(),
        getMyTasks(),
        getProjects(),
      ]);
      setProfile(profileData);
      setTasks(taskData);
      setProjects(projectData);
      setProfileForm({ name: profileData.name, email: profileData.email });
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError, "Failed to load your account data."));
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus): Promise<void> {
    try {
      setUpdatingTaskId(taskId);
      setError("");
      setSuccess("");
      const updatedTask = await updateTaskStatus(taskId, newStatus);
      setTasks((currentTasks) =>
        currentTasks.map((task) => (task.id === taskId ? updatedTask : task)),
      );
      setSuccess("Task status updated successfully.");
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError, "Failed to update task status."));
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const name = profileForm.name.trim();
    const email = profileForm.email.trim();
    if (name.length < 2) {
      setError("Name must contain at least 2 characters.");
      return;
    }
    if (!email) {
      setError("Email address is required.");
      return;
    }

    try {
      setSavingProfile(true);
      setError("");
      setSuccess("");
      const updatedProfile = await updateMyProfile({ name, email });
      setProfile(updatedProfile);
      setProfileForm({ name: updatedProfile.name, email: updatedProfile.email });
      setSuccess("Profile updated successfully.");
    } catch (caughtError: unknown) {
      setError(getErrorMessage(caughtError, "Failed to update profile."));
    } finally {
      setSavingProfile(false);
    }
  }

  function handleLogout(): void {
    clearAuthSession();
    router.push("/login");
  }

  const filteredTasks = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((task) => task.status === filter)),
    [filter, tasks],
  );

  const taskStatistics = useMemo(
    () => ({
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "todo").length,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      done: tasks.filter((task) => task.status === "done").length,
    }),
    [tasks],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
          <p className="mt-3 text-sm text-gray-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error || "Unable to load your profile."}</p>
          <button type="button" onClick={handleLogout} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white">
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-indigo-600">TaskFlow</h1>
            <p className="text-xs text-gray-400">Team Member Workspace</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-gray-900">{profile.name}</p>
              <p className="text-xs text-gray-400">{profile.email}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {getInitials(profile.name)}
            </div>
            <button type="button" onClick={handleLogout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-73px)]">
        <aside className="hidden w-64 flex-shrink-0 border-r border-gray-200 bg-white p-4 md:block">
          <nav className="space-y-2">
            <SidebarButton active={activeTab === "tasks"} icon={<LayoutList className="h-5 w-5" />} label="My Tasks" onClick={() => setActiveTab("tasks")} />
            <SidebarButton active={activeTab === "projects"} icon={<FolderOpen className="h-5 w-5" />} label="Assigned Projects" onClick={() => setActiveTab("projects")} />
            <SidebarButton active={activeTab === "profile"} icon={<UserRound className="h-5 w-5" />} label="Profile" onClick={() => setActiveTab("profile")} />
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white p-2 shadow-sm md:hidden">
            <SidebarButton compact active={activeTab === "tasks"} icon={<LayoutList className="h-4 w-4" />} label="Tasks" onClick={() => setActiveTab("tasks")} />
            <SidebarButton compact active={activeTab === "projects"} icon={<FolderOpen className="h-4 w-4" />} label="Projects" onClick={() => setActiveTab("projects")} />
            <SidebarButton compact active={activeTab === "profile"} icon={<UserRound className="h-4 w-4" />} label="Profile" onClick={() => setActiveTab("profile")} />
          </div>

          {error && <Message kind="error" text={error} onClose={() => setError("")} />}
          {success && <Message kind="success" text={success} onClose={() => setSuccess("")} />}

          {activeTab === "tasks" && (
            <section>
              <PageHeader title="My Tasks" description="View your assigned work and update task progress." />
              <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total Tasks" value={taskStatistics.total} icon={<ClipboardList className="h-5 w-5 text-indigo-600" />} />
                <StatCard label="To Do" value={taskStatistics.todo} icon={<LayoutList className="h-5 w-5 text-gray-600" />} />
                <StatCard label="In Progress" value={taskStatistics.inProgress} icon={<LoaderCircle className="h-5 w-5 text-blue-600" />} />
                <StatCard label="Completed" value={taskStatistics.done} icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />} />
              </div>

              <div className="mb-5 flex w-fit max-w-full overflow-x-auto rounded-lg bg-gray-100 p-1 text-sm">
                {(["all", "todo", "in_progress", "in_review", "done"] as const).map((item) => (
                  <button key={item} type="button" onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-md px-3 py-1.5 transition ${filter === item ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>
                    {item === "all" ? "All" : taskStatusLabels[item]}
                  </button>
                ))}
              </div>

              {filteredTasks.length === 0 ? (
                <EmptyState icon={<ClipboardList className="h-9 w-9 text-gray-300" />} text="No tasks match this filter." />
              ) : (
                <div className="space-y-4">
                  {filteredTasks.map((task) => (
                    <article key={task.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-3">
                            <span className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${taskStatusDotStyles[task.status]}`} />
                            <div className="min-w-0 flex-1">
                              <h3 className="text-base font-semibold text-gray-900">{task.title}</h3>
                              <div className="mt-3 flex items-start gap-2 rounded-lg bg-gray-50 px-3 py-2.5">
                                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{task.description?.trim() || "No description provided for this task."}</p>
                              </div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">{task.project?.name ?? "Unknown project"}</span>
                                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[task.priority]}`}>{priorityLabels[task.priority]}</span>
                                {task.dueDate && <span className="text-xs text-gray-400">Due {formatDate(task.dueDate)}</span>}
                              </div>
                            </div>
                          </div>
                        </div>

                        <select value={task.status} onChange={(event) => void handleStatusChange(task.id, event.target.value as TaskStatus)} disabled={updatingTaskId === task.id} className="flex-shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
                          {(["todo", "in_progress", "in_review", "done"] as const).map((status) => <option key={status} value={status}>{taskStatusLabels[status]}</option>)}
                        </select>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "projects" && (
            <section>
              <PageHeader title="Assigned Projects" description="Projects where you are currently a team member." />
              {projects.length === 0 ? (
                <EmptyState icon={<FolderOpen className="h-9 w-9 text-gray-300" />} text="You are not assigned to any projects yet." />
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project) => (
                    <article key={project.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50"><FolderOpen className="h-5 w-5 text-indigo-600" /></div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${projectStatusStyles[project.status]}`}>{projectStatusLabels[project.status]}</span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-gray-900">{project.name}</h3>
                      <p className="mt-2 min-h-10 text-sm text-gray-500">{project.description || "No description provided."}</p>
                      <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                        <ProjectInfo icon={<CalendarDays className="h-4 w-4" />} label="Start" value={formatDate(project.startDate)} />
                        <ProjectInfo icon={<CalendarDays className="h-4 w-4" />} label="End" value={formatDate(project.endDate)} />
                        <ProjectInfo icon={<UserRound className="h-4 w-4" />} label="Manager" value={project.manager?.name ?? "Unassigned"} />
                        <ProjectInfo icon={<Users className="h-4 w-4" />} label="Members" value={String(project.members?.length ?? 0)} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === "profile" && (
            <section>
              <PageHeader title="My Profile" description="View and update your account information." />
              <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700">{getInitials(profile.name)}</div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{profile.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{profile.email}</p>
                  <span className="mt-4 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">Team Member</span>
                  <div className="mt-6 border-t border-gray-100 pt-5 text-left">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Account status</p>
                    <p className={`mt-2 flex items-center gap-2 text-sm font-medium ${profile.isActive ? "text-emerald-600" : "text-red-600"}`}><CheckCircle2 className="h-4 w-4" />{profile.isActive ? "Active" : "Inactive"}</p>
                  </div>
                </div>

                <form onSubmit={handleProfileSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">Personal information</h3>
                  <p className="mt-1 text-sm text-gray-500">Update your name and email address.</p>
                  <div className="mt-6 space-y-5">
                    <div>
                      <label htmlFor="member-name" className="mb-2 block text-sm font-medium text-gray-700">Full name</label>
                      <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input id="member-name" type="text" value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} minLength={2} required className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="member-email" className="mb-2 block text-sm font-medium text-gray-700">Email address</label>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input id="member-email" type="email" value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} required className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
                    <button type="submit" disabled={savingProfile} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
                      {savingProfile ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {savingProfile ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function SidebarButton({ active, compact = false, icon, label, onClick }: { active: boolean; compact?: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-3 rounded-xl text-left text-sm font-medium transition ${compact ? "flex-shrink-0 px-3 py-2" : "w-full px-4 py-3"} ${active ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{icon}{label}</button>;
}

function PageHeader({ title, description }: { title: string; description: string }) {
  return <div className="mb-6"><h2 className="text-2xl font-bold text-gray-900">{title}</h2><p className="mt-1 text-gray-500">{description}</p></div>;
}

function Message({ kind, text, onClose }: { kind: "error" | "success"; text: string; onClose: () => void }) {
  const classes = kind === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700";
  return <div role={kind === "error" ? "alert" : "status"} className={`mb-5 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${classes}`}><span>{text}</span><button type="button" onClick={onClose}><X className="h-4 w-4" /></button></div>;
}

function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm"><div className="flex justify-center">{icon}</div><p className="mt-3 text-sm text-gray-500">{text}</p></div>;
}

function ProjectInfo({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2 text-gray-500">{icon}{label}</span><span className="text-right font-medium text-gray-700">{value}</span></div>;
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p><p className="mt-2 text-3xl font-bold text-gray-900">{value}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">{icon}</div></div></div>;
}