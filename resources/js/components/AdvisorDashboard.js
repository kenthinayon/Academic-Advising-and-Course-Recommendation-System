import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function clampText(str, max = 80) {
    const s = String(str || "");
    return s.length > max ? `${s.slice(0, max)}…` : s;
}

function statusPill(status) {
    const s = (status || "pending").toLowerCase();
    if (s === "approved") return { label: "Approved", cls: "ad-pill ad-pill--good" };
    if (s === "rejected") return { label: "Rejected", cls: "ad-pill ad-pill--bad" };
    return { label: "Pending", cls: "ad-pill" };
}

export default function AdvisorDashboard() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);
    const role = useMemo(() => localStorage.getItem("userRole"), []);

    const [stats, setStats] = useState({ totalStudents: 0, pending: 0, approved: 0 });
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [error, setError] = useState(null);

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}`, Accept: "application/json" }),
        [token]
    );

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        if (role !== "advisor" && role !== "admin") {
            // if user somehow hits this route, send them back.
            navigate("/student");
        }
    }, [navigate, role, token]);

    const load = async (search = "") => {
        setLoading(true);
        setError(null);
        try {
            const [s1, s2] = await Promise.all([
                axios.get("/api/advisor/stats", { headers, withCredentials: true }),
                axios.get(`/api/advisor/students?q=${encodeURIComponent(search)}`, {
                    headers,
                    withCredentials: true,
                }),
            ]);

            setStats(s1.data || { totalStudents: 0, pending: 0, approved: 0 });
            setStudents(s2.data?.students || []);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load advisor dashboard.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="advisor">
            <header className="ad-topbar">
                <div className="ad-brand">
                    <img className="ad-logo" src="/images/logo.png" alt="URIOS-ADVise" />
                    <div>
                        <div className="ad-name">URIOS-ADVise</div>
                        <div className="ad-sub">Academic Advisor Portal</div>
                    </div>
                </div>

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
            </header>

            <main className="ad-main">
                <div className="ad-hero">
                    <h1>Welcome, Academic Advisor!</h1>
                    <p>Review and approve student course recommendations</p>
                </div>

                <div className="ad-stats">
                    <div className="ad-stat">
                        <div className="ad-stat-label">Total Students</div>
                        <div className="ad-stat-value">{stats.totalStudents}</div>
                    </div>
                    <div className="ad-stat">
                        <div className="ad-stat-label">Pending Review</div>
                        <div className="ad-stat-value ad-stat-value--warn">{stats.pending}</div>
                    </div>
                    <div className="ad-stat">
                        <div className="ad-stat-label">Approved</div>
                        <div className="ad-stat-value ad-stat-value--good">{stats.approved}</div>
                    </div>
                </div>

                <div className="ad-search">
                    <input
                        value={q}
                        placeholder="Search students by name or email..."
                        onChange={(e) => setQ(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") load(q);
                        }}
                    />
                    <button type="button" className="ad-btn" onClick={() => load(q)}>
                        Search
                    </button>
                </div>

                <h2 className="ad-section-title">Student Recommendations</h2>

                {error ? <div className="ad-alert ad-alert--error">{error}</div> : null}
                {loading ? <div className="ad-muted">Loading…</div> : null}

                <div className="ad-list">
                    {students.map((s) => {
                        const pill = statusPill(s.advisor_status);
                        const rec = (s.advisor_recommended_degrees?.length
                            ? s.advisor_recommended_degrees
                            : s.recommended_degrees) || [];
                        const headline = rec?.[0]?.name || rec?.[0]?.code || "No recommendation yet";
                        const body = rec?.[0]?.track ? `Track: ${rec[0].track}` : s.strand ? `Strand: ${s.strand}` : "";

                        return (
                            <div key={s.id} className="ad-card">
                                <div className="ad-card-head">
                                    <div>
                                        <div className="ad-student-name">{s.name}</div>
                                        <div className="ad-student-email">{s.email}</div>
                                        <div className="ad-student-meta">
                                            {s.strand ? `${s.strand} • ` : ""}
                                            {s.gwa ? `GPA: ${s.gwa}` : "GPA: —"}
                                        </div>
                                    </div>
                                    <div className={pill.cls}>{pill.label}</div>
                                </div>

                                <div className="ad-rec">
                                    <div className="ad-rec-title">
                                        Recommended: {clampText(headline, 60)}
                                    </div>
                                    {body ? <div className="ad-rec-sub">{body}</div> : null}
                                    <div className="ad-rec-sub">
                                        Match Score: — &nbsp;•&nbsp; Assessment: {s.assessment_score_preview ?? "—"}%
                                    </div>
                                </div>

                                <div className="ad-actions">
                                    <button
                                        type="button"
                                        className="ad-btn ad-btn--ghost"
                                        onClick={() => navigate(`/advisor/students/${s.id}`)}
                                    >
                                        View Details
                                    </button>
                                    <button
                                        type="button"
                                        className="ad-btn"
                                        onClick={() => navigate(`/advisor/students/${s.id}`)}
                                    >
                                        {s.advisor_status === "approved" ? "Approved" : "Awaiting Review"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {!loading && !students.length ? (
                        <div className="ad-muted">No students found.</div>
                    ) : null}
                </div>
            </main>
        </div>
    );
}
