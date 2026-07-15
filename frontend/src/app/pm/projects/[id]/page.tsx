"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus, UserPlus, ArrowLeft } from "lucide-react";
import { getProject, addProjectMember } from "@/lib/projects-api";
import {
  getTasksForProject,
  createTask,
  updateTaskStatus,
} from "@/lib/tasks-api";
import { Project, Task, TaskStatus, TaskPriority } from "@/types";

const columns: { status: TaskStatus; label: string; dot: string }[] = [
  { status: "todo", label: "To Do", dot: "bg-gray-400" },
  { status: "in_progress", label: "In Progress", dot: "bg-blue-500" },
  { status: "in_review", label: "In Review", dot: "bg-amber-500" },
  { status: "done", label: "Done", dot: "bg-emerald-500" },
];

const priorityStyles: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberUserId, setMemberUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadData();
  }, [projectId]);

  async function loadData() {
    try {
      const [projectData, tasksData] = await Promise.all([
        getProject(projectId),
        getTasksForProject(projectId),
      ]);
      setProject(projectData);
      setTasks(tasksData);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load project.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    setCreatingTask(true);
    try {
      await createTask({
        title: taskTitle,
        description: taskDescription || undefined,
        priority: taskPriority,
        projectId,
        assigneeId: taskAssigneeId || undefined,
      });
      setShowTaskModal(false);
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskAssigneeId("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create task.");
    } finally {
      setCreatingTask(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setAddingMember(true);
    try {
      await addProjectMember(projectId, memberUserId);
      setShowMemberModal(false);
      setMemberUserId("");
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  }

  async function handleStatusChange(taskId: string, newStatus: TaskStatus) {
    try {
      await updateTaskStatus(taskId, newStatus);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update status.");
    }
  }

  if (loading) return <p className="text-gray-500">Loading project...</p>;
  if (!project) return <p className="text-gray-500">Project not found.</p>;

  return (
    <div>
      <button
        onClick={() => router.push("/pm")}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to projects
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500 mt-1">
            {project.description || "No description"}
          </p>
          <div className="flex items-center gap-2 mt-3">
            {project.members.map((m) => (
              <span
                key={m.id}
                className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full"
              >
                {m.user.name}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowMemberModal(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <UserPlus className="w-4 h-4" />
            Add Member
          </button>
          <button
            onClick={() => setShowTaskModal(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-4 gap-4">
        {columns.map((col) => {
          const columnTasks = tasks.filter((t) => t.status === col.status);
          return (
            <div key={col.status} className="bg-gray-100/60 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                <h3 className="text-sm font-semibold text-gray-700">
                  {col.label}
                </h3>
                <span className="text-xs text-gray-400">
                  {columnTasks.length}
                </span>
              </div>

              <div className="space-y-2">
                {columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-lg border border-gray-100 shadow-sm p-3"
                  >
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {task.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${priorityStyles[task.priority]}`}
                      >
                        {task.priority}
                      </span>
                      {task.assignee && (
                        <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold">
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) =>
                        handleStatusChange(
                          task.id,
                          e.target.value as TaskStatus
                        )
                      }
                      className="mt-2 w-full text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600"
                    >
                      {columns.map((c) => (
                        <option key={c.status} value={c.status}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Add Task
            </h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Design homepage mockup"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Description
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) =>
                    setTaskPriority(e.target.value as TaskPriority)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase mb-1.5">
                  Assign to (member User ID, optional)
                </label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Unassigned</option>
                  {project.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creatingTask ? "Adding..." : "Add Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Add Team Member
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Paste the member&apos;s User ID (ask an Admin for this from the
              Users page).
            </p>
            <form onSubmit={handleAddMember} className="space-y-4">
              <input
                type="text"
                required
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. e92c496d-fbf6-43bc-9c6f-1d66c056d16b"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingMember}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {addingMember ? "Adding..." : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}