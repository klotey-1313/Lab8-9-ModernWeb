"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import RoleGuard from "@/components/guards/RoleGuard";
import PageShell from "@/components/layout/PageShell";
import SectionHeader from "@/components/layout/SectionHeader";
import Alert from "@/components/feedback/Alert";
import StatusBadge from "@/components/tables/StatusBadge";
import { api, ApiRequestError } from "@/lib/api";
import type { User } from "@/types/user";

function getRoleNames(roles: unknown[]): string[] {
  return (roles || []).map((r) => {
    if (typeof r === "string") return r;
    if (r && typeof r === "object" && "name" in r) return String((r as { name?: string }).name ?? "");
    return String(r);
  });
}

export default function AdminAccountStatusPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const response = await api.get<User[]>("/admin/users");
      setUsers(response.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function toggleStatus(user: User) {
    const nextStatus = user.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmed = window.confirm(
      `${nextStatus === "ACTIVE" ? "Activate" : "Deactivate"} account for ${user.profile.firstName} ${user.profile.lastName}?`
    );
    if (!confirmed) return;

    setBusyId(user._id);
    setError("");
    setSuccess("");

    try {
      await api.put(`/admin/users/${user._id}/status`, { accountStatus: nextStatus });
      setSuccess(`Account ${nextStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to update account status.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["ADMIN"]}>
        <PageShell>
          <SectionHeader
            title="Account Status Management"
            subtitle="Activate or deactivate user accounts across the platform."
          />

          {error && <div style={{ marginBottom: 16 }}><Alert variant="error" message={error} /></div>}
          {success && <div style={{ marginBottom: 16 }}><Alert variant="success" message={success} /></div>}

          {loading ? (
            <div className="panel">Loading users...</div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isBusy = busyId === u._id;
                    const roleNames = getRoleNames(u.roles as unknown[]);
                    const isActive = u.accountStatus === "ACTIVE";

                    return (
                      <tr key={u._id}>
                        <td>{u.profile.firstName} {u.profile.lastName}</td>
                        <td>{u.profile.email}</td>
                        <td>{roleNames.join(", ") || "-"}</td>
                        <td><StatusBadge value={u.accountStatus} /></td>
                        <td>
                          <button
                            className={`btn ${isActive ? "btn-secondary" : "btn-primary"}`}
                            disabled={isBusy}
                            onClick={() => void toggleStatus(u)}
                          >
                            {isBusy ? "Working..." : isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {users.length === 0 && (
                    <tr><td colSpan={5}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </PageShell>
      </RoleGuard>
    </ProtectedRoute>
  );
}