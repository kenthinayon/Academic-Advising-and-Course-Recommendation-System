import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const DEPARTMENTS = [
    {
        name: "College of Accountancy",
        programs: [
            {
                code: "BSA",
                name: "Accountancy",
                description:
                    "Professional accounting program focused on financial reporting, auditing, taxation, and accounting standards.",
            },
            {
                code: "BSAIS",
                name: "Accounting Information System",
                description:
                    "Accounting + IT program focused on designing, implementing, and auditing computerized accounting systems.",
            },
            {
                code: "BSA-IA",
                name: "Internal Auditing",
                description:
                    "Focuses on risk management, internal controls, compliance, and audit assurance within organizations.",
            },
            {
                code: "BSA-MA",
                name: "Management Accounting",
                description:
                    "Emphasizes decision support, cost/management accounting, budgeting, performance analysis, and planning.",
            },
        ],
    },
    {
        name: "College of Business Administration",
        programs: [
            {
                code: "BSBA-OM",
                name: "Operations Management",
                description:
                    "Covers production/operations planning, quality management, supply chain, logistics, and process improvement.",
            },
            {
                code: "BSBA-FM",
                name: "Financial Management",
                description:
                    "Focuses on corporate finance, investments, financial analysis, capital budgeting, and risk management.",
            },
            {
                code: "BSBA-MM",
                name: "Marketing Management",
                description:
                    "Develops skills in consumer behavior, branding, sales, digital marketing, and market research.",
            },
            {
                code: "BSBA-HRM",
                name: "Human Resource Management",
                description:
                    "Focuses on recruitment, employee development, labor relations, compensation, and organizational behavior.",
            },
        ],
    },
    {
        name: "College of Computer Studies",
        programs: [
            {
                code: "BSCS",
                name: "Computer Science",
                description:
                    "Strong foundation in algorithms, programming, software engineering, data structures, AI, and computing theory.",
            },
            {
                code: "BSIT",
                name: "Information Technology",
                description:
                    "Focus on IT infrastructure, networking, databases, web/mobile development, system administration, and cybersecurity basics.",
            },
            {
                code: "BSIT-CA",
                name: "IT with Computer Animation",
                description:
                    "Combines IT fundamentals with 2D/3D animation, motion graphics, and interactive media production.",
            },
            {
                code: "DIT",
                name: "Diploma in Information Technology",
                description:
                    "A shorter-track program focused on practical computer applications, programming basics, and IT support skills.",
            },
            {
                code: "BLIS",
                name: "Library and Information Science",
                description:
                    "Covers information organization, cataloging, archives, records management, and modern library systems.",
            },
            {
                code: "BSEMC",
                name: "Entertainment and Multimedia Computing",
                description:
                    "Focuses on game development, multimedia systems, interactive design, and content production pipelines.",
            },
        ],
    },
    {
        name: "College of Engineering and Technology",
        programs: [
            {
                code: "BSCE",
                name: "Civil Engineering",
                description:
                    "Design and construction of infrastructure: structures, roads, bridges, water resources, and project management.",
            },
            {
                code: "BSIE",
                name: "Industrial Engineering",
                description:
                    "Optimizes systems and processes using operations research, ergonomics, quality, and production planning.",
            },
        ],
    },
    {
        name: "College of Nursing",
        programs: [
            {
                code: "BSN",
                name: "Nursing",
                description:
                    "Prepares students for professional nursing practice: patient care, clinical skills, community health, and evidence-based practice.",
            },
        ],
    },
    {
        name: "College of Teacher Education",
        programs: [
            {
                code: "BEEd",
                name: "Elementary Education",
                description:
                    "Training for elementary teachers: pedagogy, curriculum design, classroom management, and teaching practice.",
            },
            {
                code: "BECEd",
                name: "Early Childhood Education",
                description:
                    "Focuses on child development, early learning strategies, play-based instruction, and family/community engagement.",
            },
            {
                code: "BPEd",
                name: "Physical Education",
                description:
                    "Covers fitness, sports coaching, movement education, health, and PE teaching methods.",
            },
            {
                code: "BSNEd",
                name: "Special Needs Education",
                description:
                    "Prepares teachers to support diverse learners through inclusive education, interventions, and specialized strategies.",
            },
        ],
    },
    {
        name: "College of Arts and Sciences",
        programs: [
            {
                code: "BAPSY",
                name: "Psychology",
                description:
                    "Study of human behavior and mental processes, including psychological assessment, counseling basics, and research methods.",
            },
            {
                code: "BACOMM",
                name: "Communication",
                description:
                    "Develops skills in media, journalism, public relations, strategic communication, and content production.",
            },
            {
                code: "BAENG",
                name: "English",
                description:
                    "Focuses on language and literature, writing, linguistics, and professional communication skills.",
            },
            {
                code: "BSBIO",
                name: "Biology",
                description:
                    "Covers life sciences, laboratory techniques, research, ecology, and foundational courses for health and science careers.",
            },
        ],
    },
];

function pct(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return "0%";
    return `${x}%`;
}

function statusPill(status) {
    const s = (status || "pending").toLowerCase();
    if (s === "approved") return { label: "Approved", cls: "am-pill am-pill--good" };
    if (s === "rejected") return { label: "Rejected", cls: "am-pill am-pill--bad" };
    return { label: "Pending", cls: "am-pill" };
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);
    const role = useMemo(() => localStorage.getItem("userRole"), []);

    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [stats, setStats] = useState({
        totalStudents: 0,
        completedAssessments: 0,
        pendingReview: 0,
        averageGpa: 0.0,
    });

    const [analytics, setAnalytics] = useState({
        completionRate: 0,
        approvalRate: 0,
        pendingReviews: 0,
        topRecommendedPrograms: [],
    });

    const [studentQ, setStudentQ] = useState("");
    const [studentFilter, setStudentFilter] = useState("all"); // all | pending | approved | rejected
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [students, setStudents] = useState([]);

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}`, Accept: "application/json" }),
        [token]
    );

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }
        if (role !== "admin") {
            // Non-admins shouldn't access this page.
            navigate(role === "advisor" ? "/advisor" : "/student");
        }
    }, [navigate, role, token]);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const [s1, s2] = await Promise.all([
                axios.get("/api/admin/stats", { headers, withCredentials: true }),
                axios.get("/api/admin/analytics", { headers, withCredentials: true }),
            ]);
            setStats(s1.data || stats);
            setAnalytics(s2.data || analytics);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load admin dashboard.");
        } finally {
            setLoading(false);
        }
    };

    const loadStudents = async (search = "") => {
        setStudentsLoading(true);
        setError(null);
        try {
            // Reuse advisor endpoint for student listing (already includes advisor_status and key profile fields).
            const res = await axios.get(`/api/advisor/students?q=${encodeURIComponent(search)}`, {
                headers,
                withCredentials: true,
            });
            setStudents(res.data?.students || []);
        } catch (e) {
            setError(e?.response?.data?.message || "Failed to load students.");
        } finally {
            setStudentsLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredStudents = useMemo(() => {
        const f = (studentFilter || "all").toLowerCase();
        if (f === "all") return students;
        return (students || []).filter((s) => (s.advisor_status || "pending").toLowerCase() === f);
    }, [studentFilter, students]);

    return (
        <div className="admin">
            <header className="am-topbar">
                <div className="am-brand">
                    <div className="am-logo" aria-hidden="true">
                        <span />
                    </div>
                    <div>
                        <div className="am-name">URIOS-ADVise</div>
                        <div className="am-sub">Administrator Dashboard</div>
                    </div>
                </div>

                <button
                    type="button"
                    className="am-logout"
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

            <main className="am-main">
                <div className="am-hero">
                    <h1>Welcome, System Administrator!</h1>
                    <p>System overview and analytics</p>
                </div>

                {error ? <div className="am-alert am-alert--error">{error}</div> : null}
                {loading ? <div className="am-muted">Loading…</div> : null}

                <div className="am-stats">
                    <div className="am-stat">
                        <div className="am-stat-meta">
                            <div className="am-stat-label">Total Students</div>
                            <div className="am-stat-icon am-stat-icon--blue" aria-hidden="true" />
                        </div>
                        <div className="am-stat-value">{stats.totalStudents}</div>
                    </div>
                    <div className="am-stat">
                        <div className="am-stat-meta">
                            <div className="am-stat-label">Completed Assessments</div>
                            <div className="am-stat-icon am-stat-icon--green" aria-hidden="true" />
                        </div>
                        <div className="am-stat-value am-stat-value--green">{stats.completedAssessments}</div>
                    </div>
                    <div className="am-stat">
                        <div className="am-stat-meta">
                            <div className="am-stat-label">Pending Review</div>
                            <div className="am-stat-icon am-stat-icon--orange" aria-hidden="true" />
                        </div>
                        <div className="am-stat-value am-stat-value--orange">{stats.pendingReview}</div>
                    </div>
                    <div className="am-stat">
                        <div className="am-stat-meta">
                            <div className="am-stat-label">Average GPA</div>
                            <div className="am-stat-icon am-stat-icon--purple" aria-hidden="true" />
                        </div>
                        <div className="am-stat-value am-stat-value--purple">{stats.averageGpa}</div>
                    </div>
                </div>

                <div className="am-tabs" role="tablist" aria-label="Admin tabs">
                    <button
                        type="button"
                        className={activeTab === "overview" ? "am-tab am-tab--active" : "am-tab"}
                        onClick={() => setActiveTab("overview")}
                        role="tab"
                        aria-selected={activeTab === "overview"}
                    >
                        Overview
                    </button>
                    <button
                        type="button"
                        className={activeTab === "students" ? "am-tab am-tab--active" : "am-tab"}
                        onClick={() => setActiveTab("students")}
                        role="tab"
                        aria-selected={activeTab === "students"}
                    >
                        Students
                    </button>
                    <button
                        type="button"
                        className={activeTab === "analytics" ? "am-tab am-tab--active" : "am-tab"}
                        onClick={() => setActiveTab("analytics")}
                        role="tab"
                        aria-selected={activeTab === "analytics"}
                    >
                        Analytics
                    </button>
                </div>

                {activeTab === "overview" ? (
                    <section className="am-panel">
                        <div className="am-panel-head">
                            <h2>Department Summary</h2>
                            <div className="am-muted">Click a department to view available courses</div>
                        </div>

                        <div className="am-depts">
                            {DEPARTMENTS.map((d) => (
                                <details key={d.name} className="am-dept">
                                    <summary className="am-dept-summary">
                                        <div className="am-dept-left">
                                            <div className="am-dept-icon" aria-hidden="true" />
                                            <div className="am-dept-name">{d.name}</div>
                                        </div>
                                        <div className="am-dept-right">
                                            <span className="am-badge">{d.programs.length} Programs</span>
                                            <span className="am-chevron" aria-hidden="true" />
                                        </div>
                                    </summary>

                                    <div className="am-dept-body">
                                        <ul className="am-prog-list">
                                            {d.programs.map((p) => (
                                                <li key={`${p.code}-${p.name}`} className="am-prog">
                                                    <div className="am-prog-title">
                                                        <strong>{p.code}</strong> — {p.name}
                                                    </div>
                                                    <div className="am-prog-desc">{p.description}</div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </details>
                            ))}
                        </div>
                    </section>
                ) : null}

                {activeTab === "students" ? (
                    <section className="am-panel">
                        <div className="am-panel-head">
                            <h2>Students</h2>
                            <div className="am-muted">View and filter students by review status</div>
                        </div>

                        <div className="am-student-tools">
                            <div className="am-search">
                                <input
                                    value={studentQ}
                                    placeholder="Search students (name/email)…"
                                    onChange={(e) => setStudentQ(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") loadStudents(studentQ);
                                    }}
                                />
                                <button type="button" className="am-btn" onClick={() => loadStudents(studentQ)}>
                                    Search
                                </button>
                            </div>

                            <div className="am-filters" role="tablist" aria-label="Student filters">
                                {[
                                    { key: "all", label: "All" },
                                    { key: "pending", label: "Pending" },
                                    { key: "approved", label: "Approved" },
                                    { key: "rejected", label: "Rejected" },
                                ].map((x) => (
                                    <button
                                        key={x.key}
                                        type="button"
                                        className={
                                            studentFilter === x.key
                                                ? "am-filter am-filter--active"
                                                : "am-filter"
                                        }
                                        onClick={() => setStudentFilter(x.key)}
                                        role="tab"
                                        aria-selected={studentFilter === x.key}
                                    >
                                        {x.label}
                                    </button>
                                ))}
                            </div>

                            <button type="button" className="am-btn am-btn--ghost" onClick={() => loadStudents(studentQ)}>
                                Refresh
                            </button>
                        </div>

                        <div className="am-student-head">
                            <div className="am-muted">All Students</div>
                            <div className="am-muted">Complete list of registered students</div>
                        </div>

                        {studentsLoading ? <div className="am-muted">Loading…</div> : null}

                        <div className="am-student-list">
                            {filteredStudents.map((s) => {
                                const pill = statusPill(s.advisor_status);
                                return (
                                    <div key={s.id} className="am-student-row">
                                        <div className="am-student-main">
                                            <div className="am-student-name">{s.name}</div>
                                            <div className="am-student-email">{s.email}</div>
                                            <div className="am-student-meta">
                                                {s.strand ? `${s.strand} • ` : ""}
                                                {s.gwa ? `GPA: ${s.gwa}` : "GPA: —"}
                                            </div>
                                        </div>

                                        <div className={pill.cls}>{pill.label}</div>

                                        <div className="am-student-actions">
                                            <button
                                                type="button"
                                                className="am-btn am-btn--ghost"
                                                onClick={() => navigate(`/advisor/students/${s.id}`)}
                                            >
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                className="am-btn"
                                                onClick={() => navigate(`/advisor/students/${s.id}`)}
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}

                            {!studentsLoading && !filteredStudents.length ? (
                                <div className="am-muted">No students registered yet</div>
                            ) : null}
                        </div>
                    </section>
                ) : null}

                {activeTab === "analytics" ? (
                    <section className="am-grid">
                        <div className="am-panel">
                            <div className="am-panel-head">
                                <h2>System Metrics</h2>
                            </div>

                            <div className="am-metrics">
                                <div className="am-metric">
                                    <div className="am-metric-label">Completion Rate</div>
                                    <div className="am-metric-value">{pct(analytics.completionRate)}</div>
                                </div>
                                <div className="am-divider" />
                                <div className="am-metric">
                                    <div className="am-metric-label">Approval Rate</div>
                                    <div className="am-metric-value">{pct(analytics.approvalRate)}</div>
                                </div>
                                <div className="am-divider" />
                                <div className="am-metric">
                                    <div className="am-metric-label">Pending Reviews</div>
                                    <div className="am-metric-value">{analytics.pendingReviews}</div>
                                </div>
                            </div>
                        </div>

                        <div className="am-panel">
                            <div className="am-panel-head">
                                <h2>Top Recommended Programs</h2>
                            </div>

                            {analytics.topRecommendedPrograms?.length ? (
                                <div className="am-top">
                                    {analytics.topRecommendedPrograms.map((r) => (
                                        <div key={r.name} className="am-top-row">
                                            <div className="am-top-name">{r.name}</div>
                                            <div className="am-top-count">{r.count}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="am-muted">No recommendations yet.</div>
                            )}
                        </div>
                    </section>
                ) : null}
            </main>
        </div>
    );
}
