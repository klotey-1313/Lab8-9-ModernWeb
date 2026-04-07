"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import RoleGuard from "@/components/guards/RoleGuard";
import PageShell from "@/components/layout/PageShell";
import SectionHeader from "@/components/layout/SectionHeader";
import Alert from "@/components/feedback/Alert";
import StatusBadge from "@/components/tables/StatusBadge";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

interface CustomerRecord {
  _id: string;
  username: string;
  accountStatus: string;
  createdAt?: string;
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    customerNumber?: string;
    clientCategory?: string;
    preferredContactMethod?: string;
  };
}

interface PolicyRecord {
  _id: string;
  policyNumber: string;
  insuranceType: string;
  status: string;
  coverageAmount: number;
  premiumAmount: number;
  effectiveDate: string;
  expiryDate: string;
}

interface ClaimRecord {
  _id: string;
  claimType: string;
  status: string;
  createdAt: string;
  incidentDate: string;
}

export default function CustomerSupportPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [policies, setPolicies] = useState<PolicyRecord[]>([]);
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    void loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoadingCustomers(true);
    setError("");
    try {
      const res = await api.get<CustomerRecord[]>("/admin/users/customers");
      setCustomers(res.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load customers.");
    } finally {
      setLoadingCustomers(false);
    }
  }

  async function selectCustomer(customer: CustomerRecord) {
    setSelectedCustomer(customer);
    setLoadingDetails(true);
    setError("");
    try {
      const [polRes, claimRes] = await Promise.all([
        api.get<PolicyRecord[]>(`/policies?customerId=${customer._id}`),
        api.get<ClaimRecord[]>(`/claims?customerId=${customer._id}`)
      ]);
      setPolicies(polRes.data);
      setClaims(claimRes.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load customer details.");
    } finally {
      setLoadingDetails(false);
    }
  }

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      `${c.profile.firstName} ${c.profile.lastName}`.toLowerCase().includes(q) ||
      c.profile.email.toLowerCase().includes(q) ||
      (c.profile.customerNumber || "").toLowerCase().includes(q)
    );
  });

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={["ADMIN", "CUSTOMER_SERVICE"]}>
        <PageShell>
          <SectionHeader
            title="Customer Support"
            subtitle="Look up customers, review their policies and claims, and provide support."
          />

          {error && <div style={{ marginBottom: 16 }}><Alert variant="error" message={error} /></div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
            {/* Customer list panel */}
            <div className="panel" style={{ height: "fit-content" }}>
              <h3>Customer Lookup</h3>
              <input
                className="form-control"
                placeholder="Search by name, email or customer number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 12 }}
              />
              {loadingCustomers ? (
                <p>Loading customers…</p>
              ) : (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {filtered.map((c) => (
                    <li key={c._id} style={{ marginBottom: 8 }}>
                      <button
                        className={`btn ${selectedCustomer?._id === c._id ? "btn-primary" : "btn-secondary"}`}
                        style={{ width: "100%", textAlign: "left" }}
                        onClick={() => void selectCustomer(c)}
                      >
                        {c.profile.firstName} {c.profile.lastName}
                        <span style={{ display: "block", fontSize: 12, opacity: 0.7 }}>{c.profile.email}</span>
                      </button>
                    </li>
                  ))}
                  {filtered.length === 0 && <li><em>No customers found.</em></li>}
                </ul>
              )}
            </div>

            {/* Customer detail panel */}
            <div>
              {!selectedCustomer && (
                <div className="panel"><em>Select a customer to view their details.</em></div>
              )}

              {selectedCustomer && (
                <>
                  <div className="panel" style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <h3>{selectedCustomer.profile.firstName} {selectedCustomer.profile.lastName}</h3>
                      <StatusBadge value={selectedCustomer.accountStatus} />
                    </div>
                    <p><strong>Email:</strong> {selectedCustomer.profile.email}</p>
                    <p><strong>Phone:</strong> {selectedCustomer.profile.phone || "-"}</p>
                    <p><strong>Customer #:</strong> {selectedCustomer.profile.customerNumber || "-"}</p>
                    <p><strong>Category:</strong> {selectedCustomer.profile.clientCategory || "-"}</p>
                    <p><strong>Preferred Contact:</strong> {selectedCustomer.profile.preferredContactMethod || "-"}</p>
                    <p><strong>Member Since:</strong> {selectedCustomer.createdAt ? formatDate(selectedCustomer.createdAt) : "-"}</p>
                    <div style={{ marginTop: 12 }}>
                      <Link className="btn btn-secondary" href={`/admin/users/${selectedCustomer._id}`}>
                        View Full Profile
                      </Link>
                    </div>
                  </div>

                  {loadingDetails ? (
                    <div className="panel">Loading details…</div>
                  ) : (
                    <>
                      <div className="panel" style={{ marginBottom: 16 }}>
                        <h3>Policies ({policies.length})</h3>
                        {policies.length === 0 ? <em>No policies found.</em> : (
                          <table className="data-table">
                            <thead>
                              <tr><th>Number</th><th>Type</th><th>Status</th><th>Effective</th><th>Expiry</th></tr>
                            </thead>
                            <tbody>
                              {policies.map((p) => (
                                <tr key={p._id}>
                                  <td>{p.policyNumber}</td>
                                  <td>{p.insuranceType}</td>
                                  <td><StatusBadge value={p.status} /></td>
                                  <td>{formatDate(p.effectiveDate)}</td>
                                  <td>{formatDate(p.expiryDate)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div className="panel">
                        <h3>Claims ({claims.length})</h3>
                        {claims.length === 0 ? <em>No claims found.</em> : (
                          <table className="data-table">
                            <thead>
                              <tr><th>Type</th><th>Incident Date</th><th>Submitted</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                              {claims.map((c) => (
                                <tr key={c._id}>
                                  <td>{c.claimType}</td>
                                  <td>{formatDate(c.incidentDate)}</td>
                                  <td>{formatDate(c.createdAt)}</td>
                                  <td><StatusBadge value={c.status} /></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </PageShell>
      </RoleGuard>
    </ProtectedRoute>
  );
}
