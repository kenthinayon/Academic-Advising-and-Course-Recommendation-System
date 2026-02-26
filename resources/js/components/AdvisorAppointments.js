import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "./ui/toast";

function fmtWhen(iso) {
    if (!iso) return "Awaiting schedule";
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch {
        return String(iso);
    }
}

function fmtPreferred(iso) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleString();
    } catch {
        return String(iso);
    }
}

function statusBadge(status) {
    const s = String(status || "requested").toLowerCase();
    if (s === "scheduled") return { cls: "ad-badge ad-badge--good", label: "Scheduled" };
    if (s === "cancelled") return { cls: "ad-badge ad-badge--bad", label: "Cancelled" };
    if (s === "rejected") return { cls: "ad-badge ad-badge--bad", label: "Rejected" };
    if (s === "completed") return { cls: "ad-badge", label: "Completed" };
    return { cls: "ad-badge ad-badge--warn", label: "Requested" };
}

export default function AdvisorAppointments() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);
    const role = useMemo(() => localStorage.getItem("userRole"), []);

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}`, Accept: "application/json" }),
        [token]
    );

    const [status, setStatus] = useState("requested");
    const [loading, setLoading] = useState(true);
    const [appts, setAppts] = useState([]);
    const [error, setError] = useState(null);

    const [actionOpen, setActionOpen] = useState(false);
    const [actionAppt, setActionAppt] = useState(null);
    const [approveForm, setApproveForm] = useState({ date: "", time: "", location: "", advisor_comment: "" });
    const [saving, setSaving] = useState(false);

    const updateStatus = async (nextStatus) => {
        if (!actionAppt?.id) return;

        setSaving(true);
        try {
            const endpoint =
                nextStatus === "cancelled"
                    ? "cancel"
                    : nextStatus === "completed"
                        ? "complete"
                        : "reject";

            const res = await axios.put(
                `/api/advisor/appointments/${actionAppt.id}/${endpoint}`,
                {
                    advisor_comment: String(approveForm.advisor_comment || "").trim() || null,
                },
                { headers, withCredentials: true }
            );
            toast.success(res.data?.message || "Updated.");
            setActionOpen(false);
            setActionAppt(null);
            await load(status);
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t update this appointment.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        if (role !== "advisor" && role !== "admin") {
            navigate("/student");
            return;
        }
    }, [navigate, role, token]);

    const load = async (nextStatus = status) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(
                `/api/advisor/appointments?status=${encodeURIComponent(nextStatus)}`,
                { headers, withCredentials: true }
            );
            setAppts(res.data?.appointments || []);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load appointment requests.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(status);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const openAction = (a) => {
        setActionAppt(a);
        setApproveForm({
            date: a?.scheduled_at ? new Date(a.scheduled_at).toISOString().slice(0, 10) : "",
            time: a?.scheduled_at ? new Date(a.scheduled_at).toISOString().slice(11, 16) : "",
            location: a?.location || "",
            advisor_comment: a?.advisor_comment || "",
        });
        setActionOpen(true);
    };

    const closeAction = () => {
        if (saving) return;
        setActionOpen(false);
        setActionAppt(null);
    };

    const submitApprove = async () => {
        if (!actionAppt?.id) return;
        const date = String(approveForm.date || "").trim();
        const time = String(approveForm.time || "").trim();
        if (!date || !time) {
            toast.error("Please select a date and time.");
            return;
        }

        // Build ISO string. Using local time by default.
    const iso = `${date}T${time}:00`;

        setSaving(true);
        try {
            const res = await axios.put(
                `/api/advisor/appointments/${actionAppt.id}/approve`,
                {
                    scheduled_at: iso,
                    location: String(approveForm.location || "").trim() || null,
                    advisor_comment: String(approveForm.advisor_comment || "").trim() || null,
                },
                { headers, withCredentials: true }
            );
            toast.success(res.data?.message || "Appointment scheduled.");
            setActionOpen(false);
            setActionAppt(null);
            await load(status);
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t schedule this appointment.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="advisor">
            <header className="ad-topbar">
                <div className="ad-brand">
                    <img className="ad-logo" src="/images/logo.png" alt="URIOS-ADVise" />
                    <div>
                        <div className="ad-name">URIOS-ADVise</div>
                        <div className="ad-sub">Appointment Requests</div>
                    </div>
                </div>

                <div className="ad-topbar-actions">
                    <button
                        type="button"
                        className="ad-btn ad-btn--ghost"
                        onClick={() => navigate("/advisor")}
                    >
                        ← Dashboard
                    </button>

                    <button
                        type="button"
                        className="ad-logout"
                        onClick={() => {
                            localStorage.removeItem("authToken");
                            localStorage.removeItem("user");
                            localStorage.removeItem("userRole");
                            navigate("/login");
                        }}
                    >
                        Logout
                    </button>
                </div>
            </header>

            <main className="ad-main">
                <div className="ad-hero" style={{ marginBottom: 16 }}>
                    <h1>Manage appointments</h1>
                    <p>Approve requests by selecting a schedule. Students will be emailed automatically.</p>
                </div>

                <div className="ad-filterbar">
                    <div className="ad-filter">
                        <span className="ad-filter-label">View</span>
                        <select value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="requested">Requested</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">All</option>
                        </select>
                    </div>

                    <button type="button" className="ad-btn ad-btn--ghost" onClick={() => load(status)}>
                        Refresh
                    </button>
                </div>

                {error ? <div className="ad-alert ad-alert--error">{error}</div> : null}
                {loading ? <div className="ad-muted">Loading…</div> : null}

                <div className="ad-appt-list">
                    {appts.map((a) => {
                        const b = statusBadge(a.status);
                        return (
                            <div key={a.id} className="ad-appt-card">
                                <div className="ad-appt-head">
                                    <div>
                                        <div className="ad-appt-title">{a.student?.name || "Student"}</div>
                                        <div className="ad-muted">{a.student?.email || ""}</div>
                                    </div>
                                    <div className={b.cls}>{b.label}</div>
                                </div>

                                <div className="ad-appt-kv">
                                    <div>
                                        <div className="ad-k">Session type</div>
                                        <div className="ad-v">{a.session_type || "—"}</div>
                                    </div>
                                    <div>
                                        <div className="ad-k">Schedule</div>
                                        <div className="ad-v">{fmtWhen(a.scheduled_at)}</div>
                                    </div>
                                </div>

                                {a.notes ? (
                                    <div className="ad-appt-notes">
                                        <div className="ad-k">Student notes</div>
                                        <div className="ad-v">{a.notes}</div>
                                    </div>
                                ) : null}

                                <div className="ad-actions">
                                    {String(a.status).toLowerCase() === "requested" ? (
                                        <div className="ad-dropdown">
                                            <button
                                                type="button"
                                                className="ad-btn"
                                                onClick={() => openAction(a)}
                                            >
                                                Action ▾
                                            </button>
                                            <div className="ad-hint">Schedule &amp; approve</div>
                                        </div>
                                    ) : (
                                        <button type="button" className="ad-btn ad-btn--ghost" onClick={() => openAction(a)}>
                                            View
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {!loading && !appts.length ? (
                        <div className="ad-empty">
                            <div className="ad-empty-title">No appointments found</div>
                            <div className="ad-muted">Try a different filter.</div>
                        </div>
                    ) : null}
                </div>

                {actionOpen ? (
                    <div className="sp-modal" role="dialog" aria-modal="true">
                        <div className="sp-modal-card" style={{ maxWidth: 640 }}>
                            <div className="sp-modal-head">
                                <div className="sp-modal-title">Appointment action</div>
                                <button
                                    type="button"
                                    className="sp-iconbtn"
                                    onClick={closeAction}
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="sp-modal-body sp-modal-body--single">
                                <div className="sp-form">
                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        <span>Student</span>
                                        <div style={{ fontWeight: 800, color: "#0f172a" }}>
                                            {actionAppt?.student?.name || "—"}
                                        </div>
                                        <div className="sp-muted">{actionAppt?.student?.email || ""}</div>
                                    </label>

                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        <span>Session type</span>
                                        <input value={actionAppt?.session_type || ""} readOnly />
                                    </label>

                                    <div className="sp-callout" style={{ gridColumn: "1 / -1" }}>
                                        <strong>Student requested:</strong> {fmtPreferred(actionAppt?.preferred_at)}
                                        {actionAppt?.notes ? (
                                            <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                                                <strong>Notes:</strong> {actionAppt.notes}
                                            </div>
                                        ) : (
                                            <div style={{ marginTop: 8 }}>
                                                <strong>Notes:</strong> (none)
                                            </div>
                                        )}
                                    </div>

                                    <label className="sp-field">
                                        <span>Date</span>
                                        <input
                                            type="date"
                                            value={approveForm.date}
                                            onChange={(e) => setApproveForm((p) => ({ ...p, date: e.target.value }))}
                                            disabled={saving}
                                        />
                                    </label>

                                    <label className="sp-field">
                                        <span>Time</span>
                                        <input
                                            type="time"
                                            value={approveForm.time}
                                            onChange={(e) => setApproveForm((p) => ({ ...p, time: e.target.value }))}
                                            disabled={saving}
                                        />
                                    </label>

                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        <span>Location (Optional)</span>
                                        <input
                                            value={approveForm.location}
                                            onChange={(e) => setApproveForm((p) => ({ ...p, location: e.target.value }))}
                                            placeholder="e.g., Guidance Office / Google Meet"
                                            disabled={saving}
                                        />
                                    </label>

                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        <span>Advisor comment (Optional)</span>
                                        <textarea
                                            rows={4}
                                            value={approveForm.advisor_comment}
                                            onChange={(e) => setApproveForm((p) => ({ ...p, advisor_comment: e.target.value }))}
                                            placeholder="Add a short note for the student (agenda, requirements, etc.)"
                                            disabled={saving}
                                        />
                                    </label>

                                    <div className="sp-callout" style={{ gridColumn: "1 / -1" }}>
                                        <strong>Tip:</strong> Pick a time the student can attend. When you approve, the student will receive an email confirmation.
                                    </div>

                                    
                                </div>
                            </div>

                            <div className="sp-modal-foot">
                                <button type="button" className="sp-btn sp-btn--ghost" onClick={closeAction} disabled={saving}>
                                    Close
                                </button>

                                {String(actionAppt?.status).toLowerCase() === "requested" ? (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button
                                            type="button"
                                            className="sp-btn sp-btn--ghost"
                                            onClick={() => updateStatus("rejected")}
                                            disabled={saving}
                                        >
                                            Reject
                                        </button>
                                        <button type="button" className="sp-btn sp-btn--primary" onClick={submitApprove} disabled={saving}>
                                            {saving ? "Scheduling…" : "Approve & Schedule"}
                                        </button>
                                    </div>
                                ) : null}

                                {String(actionAppt?.status).toLowerCase() === "scheduled" ? (
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                        <button
                                            type="button"
                                            className="sp-btn sp-btn--ghost"
                                            onClick={() => updateStatus("cancelled")}
                                            disabled={saving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="sp-btn sp-btn--primary"
                                            onClick={() => updateStatus("completed")}
                                            disabled={saving}
                                        >
                                            Mark Completed
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
