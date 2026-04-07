"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import RoleGuard from "@/components/guards/RoleGuard";
import PageShell from "@/components/layout/PageShell";
import SectionHeader from "@/components/layout/SectionHeader";
import Alert from "@/components/feedback/Alert";
import StatusBadge from "@/components/tables/StatusBadge";
import UserForm from "@/components/forms/UserForm";
import { api } from "@/lib/api";
import type { User } from "@/types/user";

function getRoleNames(roles: unknown[]): string[] {
  return (roles || []).map((r) => {
    if (typeof r === "string") return r;
    if (r && typeof r === "object" && "name" in r) return String((r as { name?: string }).name ?? "");
    return String(r);
  });
}

export default function AdminUserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await api.get<User>(`/admin/users/${id}`);
        setUser(response.data);
      } catch {
        setError("Failed to load user.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [id]);

  const roleNames = getRoleNames((user?.roles as unknown[]) ?? []);

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["ADMIN"]}>
        <PageShell>
          <SectionHeader
            title="User Details"
            subtitle="View and manage user profile, roles, and account status."
          />

          {error && <Alert variant="error" message={error} />}

          {loading && <div className="panel">Loading user...</div>}

          {!loading && user && mode === "view" && (
            <>
              <div className="profile-grid">
                <div className="panel">
                  <h3>Account</h3>
                  <p><strong>Username:</strong> {user.username}</p>
                  <p><strong>Status:</strong> <StatusBadge value={user.accountStatus} /></p>
                  <p><strong>Roles:</strong> {roleNames.join(", ") || "-"}</p>
                  <p><strong>Created:</strong> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</p>
                </div>

                <div className="panel">
                  <h3>Profile</h3>
                  <p><strong>Name:</strong> {user.profile.firstName} {user.profile.lastName}</p>
                  <p><strong>Email:</strong> {user.profile.email}</p>
                  <p><strong>Phone:</strong> {user.profile.phone || "-"}</p>
                  <p><strong>Date of Birth:</strong> {user.profile.dateOfBirth ?? "-"}</p>
                  <p><strong>Address:</strong> {[user.profile.addressLine1, user.profile.city, user.profile.province, user.profile.country].filter(Boolean).join(", ") || "-"}</p>
                  <p><strong>User Type:</strong> {user.profile.userType}</p>
                  {user.profile.department && <p><strong>Department:</strong> {user.profile.department}</p>}
                  {user.profile.jobTitle && <p><strong>Job Title:</strong> {user.profile.jobTitle}</p>}
                </div>
              </div>

              <div className="actions-row" style={{ marginTop: 20 }}>
                <button className="btn btn-primary" onClick={() => setMode("edit")}>
                  Edit User
                </button>
                <button className="btn btn-secondary" onClick={() => router.push("/admin/users")}>
                  Back to Users
                </button>
              </div>
            </>
          )}

          {!loading && user && mode === "edit" && (
            <>
              <UserForm
                initialData={{
                  _id: user._id,
                  fullName: `${user.profile.firstName} ${user.profile.lastName}`.trim(),
                  email: user.profile.email,
                  roles: roleNames,
                  status: user.accountStatus as "ACTIVE" | "INACTIVE"
                }}
                isEdit
              />
              <div className="actions-row" style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={() => setMode("view")}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </PageShell>
      </RoleGuard>
    </ProtectedRoute>
  );
}