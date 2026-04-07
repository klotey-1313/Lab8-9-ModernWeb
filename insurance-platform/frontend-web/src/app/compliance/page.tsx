"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import RoleGuard from "@/components/guards/RoleGuard";
import PageShell from "@/components/layout/PageShell";
import SectionHeader from "@/components/layout/SectionHeader";
import Alert from "@/components/feedback/Alert";
import StatusBadge from "@/components/tables/StatusBadge";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

interface UserSummary {
  _id: string;
  username: string;
  accountStatus: string;
  createdAt?: string;
  roles: { name?: string }[] | string[];
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    userType: string;
    department?: string;
    jobTitle?: string;
  };
}

interface RoleSummary {
  _id: string;
  name: string;
  description?: string;
}

function getRoleNames(roles: UserSummary["roles"]): string[] {
  return (roles || []).map((r) => {
    if (typeof r === "string") return r;
    if (r && typeof r === "object" && "name" in r) return String((r as { name?: string }).name ?? "");
    return String(r);
  });
}

export default function CompliancePage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roles, setRoles] = useState<RoleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [usersRes, rolesRes] = await Promise.all([
          api.get<UserSummary[]>("/admin/users"),
          api.get<RoleSummary[]>("/admin/rbac/roles")
        ]);
        setUsers(usersRes.data);
        setRoles(rolesRes.data);
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Failed to load compliance data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const activeCount = users.filter((u) => u.accountStatus === "ACTIVE").length;
  const internalCount = users.filter((u) => u.profile.userType === "INTERNAL").length;
  const customerCount = users.filter((u) => u.profile.userType === "CUSTOMER").length;

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["ADMIN", "COMPLIANCE_OFFICER"]}>
        <PageShell>
          <SectionHeader
            title="Compliance Overview"
            subtitle="Read-only view of platform users, roles, and access assignments."
          />

          {error && <div style={{ marginBottom: 16 }}><Alert variant="error" message={error} /></div>}

          {loading ? (
            <div className="panel">Loading compliance data…</div>
          ) : (
            <>
              {/* Summary stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                <div className="panel" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{users.length}</div>
                  <div>Total Users</div>
                </div>
                <div className="panel" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{activeCount}</div>
                  <div>Active Accounts</div>
                </div>
                <div className="panel" style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 32, fontWeight: 700 }}>{roles.length}</div>
                  <div>Roles Defined</div>
                </div>
              </div>

              {/* Roles table */}
              <div className="panel" style={{ marginBottom: 24 }}>
                <h3>Defined Roles</h3>
                <table className="data-table">
                  <thead>
                    <tr><th>Role Name</th><th>Description</th></tr>
                  </thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r._id}>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.description || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Users with role assignments */}
              <div className="panel">
                <h3>User Access Assignments</h3>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ marginRight: 16 }}><strong>{internalCount}</strong> internal staff</span>
                  <span><strong>{customerCount}</strong> customers</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Type</th>
                        <th>Department</th>
                        <th>Roles Assigned</th>
                        <th>Status</th>
                        <th>Member Since</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u._id}>
                          <td>{u.profile.firstName} {u.profile.lastName}</td>
                          <td>{u.profile.email}</td>
                          <td>{u.profile.userType}</td>
                          <td>{u.profile.department || "-"}</td>
                          <td>{getRoleNames(u.roles).join(", ") || "-"}</td>
                          <td><StatusBadge value={u.accountStatus} /></td>
                          <td>{u.createdAt ? formatDate(u.createdAt) : "-"}</td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr><td colSpan={7}><em>No users found.</em></td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </PageShell>
      </RoleGuard>
    </ProtectedRoute>
  );
}
