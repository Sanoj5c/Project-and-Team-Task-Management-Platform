"use client";

import { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

type ProjectMember = {
  id?: string;
  userId?: string;
  user: User;
};

type Project = {
  id: string;
  name: string;
  manager?: User;
  members?: ProjectMember[];
};

type TeamMember = User & {
  projects: string[];
};

type ApiError = {
  message?: string | string[];
};

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000/api/v1"
).replace(/\/$/, "");

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

function getErrorMessage(error: ApiError, fallback: string): string {
  if (Array.isArray(error.message)) {
    return error.message.join(", ");
  }

  return error.message ?? fallback;
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
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

export default function PmTeamPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProjects() {
      const token = getAccessToken();

      if (!token) {
        setError("You are not logged in. Please log in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/projects`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const responseBody = (await response.json()) as
          | Project[]
          | ApiError;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              responseBody as ApiError,
              "Failed to load team members.",
            ),
          );
        }

        setProjects(responseBody as Project[]);
      } catch (caughtError: unknown) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to load team members.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProjects();
  }, []);

  const teamMembers = useMemo<TeamMember[]>(() => {
    const memberMap = new Map<string, TeamMember>();

    projects.forEach((project) => {
      project.members?.forEach((membership) => {
        const user = membership.user;

        if (!user) {
          return;
        }

        const existingMember = memberMap.get(user.id);

        if (existingMember) {
          if (!existingMember.projects.includes(project.name)) {
            existingMember.projects.push(project.name);
          }

          return;
        }

        memberMap.set(user.id, {
          ...user,
          projects: [project.name],
        });
      });
    });

    return Array.from(memberMap.values()).sort((first, second) =>
      first.name.localeCompare(second.name),
    );
  }, [projects]);

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-gray-900">Team</h1>
        <p className="mt-2 text-gray-500">
          View members assigned to your projects.
        </p>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8">
          <p className="text-gray-500">Loading team members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team</h1>

        <p className="mt-2 text-gray-500">
          View members assigned to your managed projects.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {!error && (
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Project members
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {teamMembers.length}{" "}
                {teamMembers.length === 1 ? "member" : "members"}
              </p>
            </div>
          </div>

          {teamMembers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <h3 className="text-base font-medium text-gray-900">
                No team members found
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Add members to one of your projects to see them here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Member
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Role
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Projects
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 bg-white">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                            {getInitials(member.name)}
                          </div>

                          <div>
                            <p className="font-medium text-gray-900">
                              {member.name}
                            </p>

                            <p className="text-sm text-gray-500">
                              {member.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {formatRole(member.role)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {member.projects.map((projectName) => (
                            <span
                              key={projectName}
                              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
                            >
                              {projectName}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            member.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}