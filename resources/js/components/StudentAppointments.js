import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "./ui/toast";

function formatApptDate(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatApptTime(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status) {
    const s = String(status || "scheduled").toLowerCase();
    const cls = s === "completed" ? "sp-badge sp-badge--done" : s === "cancelled" ? "sp-badge sp-badge--muted" : "sp-badge sp-badge--info";
    const label = s.charAt(0).toUpperCase() + s.slice(1);
    return <span className={cls}>{label}</span>;
}

export default function StudentAppointments() {
    const navigate = useNavigate();
    const [tab, setTab] = useState("upcoming");
    const [loading, setLoading] = useState(false);
    const [appts, setAppts] = useState([]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [bookOpen, setBookOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [bookForm, setBookForm] = useState({
        session_type: "Initial Consultation",
        date: "",
        time: "",
        notes: "",
    });

    const token = useMemo(() => localStorage.getItem("authToken"), []);

    const fetchAppts = async (scope) => {
        if (!token) {
            navigate("/login");
            return;
        }
        setLoading(true);
        try {
            const res = await axios.get(`/api/appointments?scope=${encodeURIComponent(scope)}`, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
            });
            setAppts(res.data?.appointments || []);
        } catch (e) {
            toast.error("Couldn’t load appointments.");
            setAppts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAppts(tab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    useEffect(() => {
        // Reset status filter when changing tabs to keep the UI predictable.
        setStatusFilter("all");
    }, [tab]);

    const visibleAppts = useMemo(() => {
        const now = Date.now();
        const withinTab = (a) => {
            const st = String(a?.status || "requested").toLowerCase();
            const scheduled = a?.scheduled_at ? new Date(a.scheduled_at).getTime() : null;

            if (tab === "all") return true;
            if (tab === "past") {
                // Past is any finished appointment, or a scheduled appointment whose time has passed.
                if (st === "completed" || st === "cancelled") return true;
                if (scheduled != null && scheduled < now) return true;
                return false;
            }

            // Upcoming tab
            if (st === "requested" || st === "rejected") return true;
            if (scheduled != null && scheduled >= now) return true;
            return false;
        };

        const withinStatus = (a) => {
            if (statusFilter === "all") return true;
            return String(a?.status || "requested").toLowerCase() === statusFilter;
        };

        return (Array.isArray(appts) ? appts : []).filter((a) => withinTab(a) && withinStatus(a));
    }, [appts, statusFilter, tab]);

    const requestAppointment = async () => {
        if (!token) {
            toast.error("Your session expired. Please log in again.");
            navigate("/login");
            return;
        }

        if (submitting) return;

        const date = String(bookForm.date || "").trim();
        const time = String(bookForm.time || "").trim();
        if (!date || !time) {
            toast.error("Please select a date and time.");
            return;
        }

        const preferredAt = `${date}T${time}:00`;

        try {
            setSubmitting(true);
            const res = await axios.post(
                "/api/appointments",
                {
                    session_type: String(bookForm.session_type || "Initial Consultation"),
                    preferred_at: preferredAt,
                    notes: String(bookForm.notes || "").trim() || null,
                },
                {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
                }
            );
            toast.success(res.data?.message || "Appointment request sent.");
            setBookOpen(false);
            setBookForm((p) => ({ ...p, date: "", time: "", notes: "" }));
            fetchAppts(tab);
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t send request.";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="student-portal">
            <header className="sp-topbar">
                <div className="sp-brand" role="button" tabIndex={0} onClick={() => navigate("/student")}
                    onKeyDown={(e) => (e.key === "Enter" ? navigate("/student") : null)}>
                    <img className="sp-logo" src="/images/logo.png" alt="URIOS-ADVise" />
                    <div>
                        <div className="sp-title">URIOS-ADVise</div>
                        <div className="sp-subtitle">Student Portal</div>
                    </div>
                </div>

                <div style={{ marginLeft: "auto" }}>
                    <button type="button" className="sp-btn sp-btn--ghost" onClick={() => navigate("/student")}
                        style={{ padding: "8px 12px" }}
                    >
                        ← Back to Dashboard
                    </button>
                </div>
            </header>

            <main className="sp-main">
                <div className="sp-pagehead">
                    <div>
                        <h1 className="sp-welcome">Appointments</h1>
                        <p className="sp-caption">Manage your upcoming and past sessions.</p>
                    </div>
                    <button className="sp-btn sp-btn--primary" type="button" onClick={() => {
                        setBookOpen(true);
                    }}>
                        + Book
                    </button>
                </div>

                <div className="sp-appt-controls">
                    <div className="sp-tabs" aria-label="Appointment time filters">
                        <button type="button" className={`sp-tab ${tab === "upcoming" ? "is-active" : ""}`} onClick={() => setTab("upcoming")}>Upcoming</button>
                        <button type="button" className={`sp-tab ${tab === "past" ? "is-active" : ""}`} onClick={() => setTab("past")}>Past</button>
                        <button type="button" className={`sp-tab ${tab === "all" ? "is-active" : ""}`} onClick={() => setTab("all")}>All</button>
                    </div>

                    <div className="sp-filter" aria-label="Appointment status filter">
                        <div className="sp-filter-label">Status</div>
                        <select
                            className="sp-filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="Filter by status"
                        >
                            <option value="all">All</option>
                            <option value="requested">Requested</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <section className="sp-list">
                    {loading ? (
                        <div className="sp-muted">Loading…</div>
                    ) : visibleAppts.length === 0 ? (
                        <div className="sp-empty">
                            <div className="sp-empty-title">No appointments found</div>
                            <div className="sp-muted">Try booking your first session.</div>
                        </div>
                    ) : (
                        <div className="sp-appt-grid">
                            {visibleAppts.map((a) => (
                                <div key={a.id} className="sp-appt-card">
                                    <div className="sp-appt-top">
                                        {statusBadge(a.status)}
                                        <div className="sp-appt-when">
                                            <div className="sp-appt-date">
                                                {a.scheduled_at ? formatApptDate(a.scheduled_at) : "Awaiting schedule"}
                                            </div>
                                            <div className="sp-appt-time">
                                                {a.scheduled_at ? formatApptTime(a.scheduled_at) : (a.session_type || "Advising Session")}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="sp-appt-row">
                                        <div className="sp-muted">Advisor</div>
                                        <div className="sp-strong">{a.advisor?.name || "TBA"}</div>
                                    </div>

                                    {a.scheduled_at && a.location ? (
                                        <div className="sp-appt-row" style={{ marginTop: 8 }}>
                                            <div className="sp-muted">Location</div>
                                            <div className="sp-strong">{a.location}</div>
                                        </div>
                                    ) : null}

                                    {a.advisor_comment ? (
                                        <div className="sp-appt-row" style={{ marginTop: 8, alignItems: "start" }}>
                                            <div className="sp-muted">Advisor note</div>
                                            <div className="sp-strong" style={{ whiteSpace: "pre-wrap" }}>{a.advisor_comment}</div>
                                        </div>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {bookOpen ? (
                    <div className="sp-modal" role="dialog" aria-modal="true">
                        <div className="sp-modal-card">
                            <div className="sp-modal-head">
                                <div>
                                    <div className="sp-modal-title">Book an Appointment</div>
                                    <div className="sp-muted">Schedule a consultation with an academic advisor</div>
                                </div>
                                <button type="button" className="sp-iconbtn" onClick={() => setBookOpen(false)} aria-label="Close">✕</button>
                            </div>

                            <div className="sp-modal-body">
                                <div className="sp-modal-avatar">
                                    <div className="sp-avatar sp-avatar--lg">📅</div>
                                </div>

                                <div className="sp-form">
                                    <label className="sp-field">
                                        <span>Session Type</span>
                                        <select
                                            value={bookForm.session_type}
                                            onChange={(e) => setBookForm((p) => ({ ...p, session_type: e.target.value }))}
                                        >
                                            <option>Initial Consultation</option>
                                            <option>Course Selection Help</option>
                                            <option>Follow-up Session</option>
                                            <option>General Inquiry</option>
                                        </select>
                                    </label>

                                    <label className="sp-field">
                                        <span>Date</span>
                                        <input
                                            type="date"
                                            value={bookForm.date}
                                            onChange={(e) => setBookForm((p) => ({ ...p, date: e.target.value }))}
                                        />
                                    </label>

                                    <label className="sp-field">
                                        <span>Time</span>
                                        <input
                                            type="time"
                                            value={bookForm.time}
                                            onChange={(e) => setBookForm((p) => ({ ...p, time: e.target.value }))}
                                        />
                                    </label>

                                    <label className="sp-field">
                                        <span>Notes (Optional)</span>
                                        <textarea
                                            rows={4}
                                            value={bookForm.notes}
                                            onChange={(e) => setBookForm((p) => ({ ...p, notes: e.target.value }))}
                                            placeholder="Add any specific topics or questions you'd like to discuss…"
                                        />
                                    </label>

                                    <div className="sp-callout" style={{ gridColumn: "1 / -1" }}>
                                        <strong>Note:</strong> Your request will be reviewed by an advisor. The advisor may adjust the time/date before confirming.
                                    </div>
                                </div>
                            </div>

                            <div className="sp-modal-foot">
                                <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setBookOpen(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="sp-btn sp-btn--primary" onClick={requestAppointment} disabled={submitting}>
                                    {submitting ? "Requesting…" : "Request Appointment"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
}
