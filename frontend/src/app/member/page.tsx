"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ClipboardList } from "lucide-react";
import { getCurrentUser, clearAuthSession } from "@/lib/auth-api";
import { getMyTasks, updateTaskStatus } from "@/lib/tasks-api";
import { Task, TaskStatus, TaskPriority } from "@/types";

const statusLabels: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const statusDotStyles: Record<TaskStatus, string> = {
  todo: "bg-gray-400",
  in_progress: "bg-blue-500",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
};

export default function MemberDashboard() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "team_member") {
      router.push("/login");
      return;
    }
    setUserEmail(user.email);
    loadTasks();
  }, [router]);

  async function loadTasks() {
    try {
      const data = await getMyTasks();
      setTasks(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    try {
      await updateTaskStatus(taskId, newStatus);
      await loadTasks();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status.");
    }
  }

  function handleLogout() {
    clearAuthSession();
    router.push("/login");
  }

  if (!userEmail) return null;

  const filteredTasks =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Your Tasks</h1>
          <p className="text-xs text-gray-400">{userEmail}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex bg-gray-100 rounded-lg p-1 text-sm w-fit mb-5">
          {(["all", "todo", "in_progress", "in_review", "done"] as const).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md capitalize transition-colors ${
                  filter === f
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                {f === "all" ? "All" : statusLabels[f]}
              </button>
            )
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Loading tasks...</p>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No tasks here yet.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDotStyles[task.status]}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        {task.project.name}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${priorityStyles[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-gray-400">
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <select
                  value={task.status}
                  onChange={(e) =>
                    handleStatusChange(task.id, e.target.value as TaskStatus)
                  }
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-shrink-0 ml-4"
                >
                  {(
                    ["todo", "in_progress", "in_review", "done"] as const
                  ).map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}