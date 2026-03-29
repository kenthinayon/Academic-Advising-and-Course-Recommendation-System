import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "./ui/toast";

function initials(nameOrEmail) {
    const s = String(nameOrEmail || "").trim();
    if (!s) return "A";
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}


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
    if (s === "interview") return { label: "Interview", cls: "am-pill" };
    return { label: "Pending", cls: "am-pill" };
}

export default function AdminDashboard() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);
    const role = useMemo(() => localStorage.getItem("userRole"), []);

    const [user, setUser] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [avatarSaving, setAvatarSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
    });

    const [pwForm, setPwForm] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    const [pwSaving, setPwSaving] = useState(false);

    const [darkMode, setDarkMode] = useState(() => {
        try {
            return localStorage.getItem("theme") === "dark";
        } catch {
            return false;
        }
    });
    const [schoolCalOpen, setSchoolCalOpen] = useState(false);

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
    const [studentFilter, setStudentFilter] = useState("all"); // all | pending | interview | approved | rejected
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [students, setStudents] = useState([]);

    const [carouselSlides, setCarouselSlides] = useState([]);
    const [carouselLoading, setCarouselLoading] = useState(false);
    const [carouselOpen, setCarouselOpen] = useState(false);
    const [carouselEditing, setCarouselEditing] = useState(null);
    const [carouselSaving, setCarouselSaving] = useState(false);
    const [carouselImageFile, setCarouselImageFile] = useState(null);
    const [carouselImagePreview, setCarouselImagePreview] = useState("");
    const [carouselForm, setCarouselForm] = useState({
        category: "featured",
        badge: "",
        title: "",
        greeting: "",
        story: "",
        sort_order: "",
        is_active: true,
    });

    const carouselThumbSrc = (s) => {
        const p = String(s?.image_path || "").trim();
        if (p) return `/storage/${p.replace(/^\/+/, "")}`;
        const u = String(s?.image_url || "").trim();
        return u || "";
    };

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}`, Accept: "application/json" }),
        [token]
    );

    const handleLogout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        localStorage.removeItem("userRole");
        navigate("/login");
    };

    useEffect(() => {
        try {
            const raw = localStorage.getItem("user");
            setUser(raw ? JSON.parse(raw) : null);
        } catch {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        try {
            document.body.dataset.theme = darkMode ? "dark" : "light";
            localStorage.setItem("theme", darkMode ? "dark" : "light");
        } catch {
            // ignore
        }
    }, [darkMode]);

    const refreshMe = async () => {
        if (!token) return;
        try {
            const me = await axios.get("/api/profile", { headers, withCredentials: true });
            const serverUser = me.data?.user || null;
            const avatarUrl = serverUser?.avatar_url;
            const cacheBusted = avatarUrl ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}` : null;
            const nextUser = serverUser ? { ...serverUser, avatar_url: cacheBusted || avatarUrl } : null;
            if (nextUser) {
                setUser(nextUser);
                try {
                    localStorage.setItem("user", JSON.stringify(nextUser));
                } catch {
                    // ignore
                }
            }
        } catch {
            // ignore
        }
    };

    const openEdit = () => {
        setMenuOpen(false);
        setEditForm({
            name: user?.name || "",
            email: user?.email || "",
        });
        setAvatarFile(null);
        setAvatarPreview("");
        setEditOpen(true);
    };

    const openAccount = () => {
        setMenuOpen(false);
        setPwForm({ current_password: "", password: "", password_confirmation: "" });
        setAccountOpen(true);
    };

    const onPickAvatar = (file) => {
        setAvatarFile(file || null);
        if (!file) {
            setAvatarPreview("");
            return;
        }
        try {
            const url = URL.createObjectURL(file);
            setAvatarPreview(url);
        } catch {
            setAvatarPreview("");
        }
    };

    const saveAvatar = async () => {
        if (!token) return;
        if (!avatarFile) {
            toast.info("Please choose an image first.");
            return;
        }

        try {
            setAvatarSaving(true);
            const form = new FormData();
            form.append("avatar", avatarFile);
            await axios.post("/api/profile/avatar", form, {
                headers: { ...headers, "Content-Type": "multipart/form-data" },
                withCredentials: true,
            });
            await refreshMe();
            toast.success("Profile photo updated.");
            setAvatarFile(null);
            setAvatarPreview("");
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t update photo.";
            toast.error(msg);
        } finally {
            setAvatarSaving(false);
        }
    };

    const saveProfile = async () => {
        if (!token) return;
        const payload = {
            name: String(editForm.name || "").trim(),
            email: String(editForm.email || "").trim(),
        };

        try {
            setSaving(true);
            const res = await axios.put("/api/account/profile", payload, { headers, withCredentials: true });
            const nextUser = res.data?.user || user;
            if (nextUser) {
                setUser(nextUser);
                try {
                    localStorage.setItem("user", JSON.stringify(nextUser));
                } catch {
                    // ignore
                }
            }
            toast.success(res.data?.message || "Profile updated.");
            setEditOpen(false);
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t save profile.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const changePassword = async () => {
        if (!token) return;
        if (!pwForm.current_password) {
            toast.error("Please enter your current password.");
            return;
        }
        if ((pwForm.password || "").length < 8) {
            toast.error("New password must be at least 8 characters.");
            return;
        }
        if (pwForm.password !== pwForm.password_confirmation) {
            toast.error("New password confirmation does not match.");
            return;
        }

        try {
            setPwSaving(true);
            const res = await axios.put(
                "/api/account/password",
                {
                    current_password: pwForm.current_password,
                    password: pwForm.password,
                    password_confirmation: pwForm.password_confirmation,
                },
                { headers, withCredentials: true }
            );
            toast.success(res.data?.message || "Password updated.");
            setAccountOpen(false);
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t change password.";
            toast.error(msg);
        } finally {
            setPwSaving(false);
        }
    };

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

    const loadStudents = async (search = "", { showLoading } = { showLoading: true }) => {
        if (showLoading) setStudentsLoading(true);
        if (showLoading) setError(null);
        try {
            // Reuse advisor endpoint for student listing (already includes advisor_status and key profile fields).
            const res = await axios.get(`/api/advisor/students?q=${encodeURIComponent(search)}`, {
                headers,
                withCredentials: true,
            });
            setStudents(res.data?.students || []);
        } catch (e) {
            if (showLoading) setError(e?.response?.data?.message || "Failed to load students.");
        } finally {
            if (showLoading) setStudentsLoading(false);
        }
    };

    const loadCarouselSlides = async ({ showLoading } = { showLoading: true } ) => {
        if (!token) return;
        if (showLoading) setCarouselLoading(true);
        try {
            const res = await axios.get("/api/admin/carousel-slides", { headers, withCredentials: true });
            setCarouselSlides(res.data?.slides || []);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to load highlights.");
            setCarouselSlides([]);
        } finally {
            if (showLoading) setCarouselLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab !== "highlights") return;
        loadCarouselSlides({ showLoading: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    const onPickCarouselImage = (file) => {
        setCarouselImageFile(file || null);
        if (!file) {
            setCarouselImagePreview("");
            return;
        }
        try {
            const url = URL.createObjectURL(file);
            setCarouselImagePreview(url);
        } catch {
            setCarouselImagePreview("");
        }
    };

    const openNewCarouselSlide = () => {
        setCarouselEditing(null);
        setCarouselForm({
            category: "featured",
            badge: "",
            title: "",
            greeting: "",
            story: "",
            sort_order: "",
            is_active: true,
        });
        setCarouselImageFile(null);
        setCarouselImagePreview("");
        setCarouselOpen(true);
    };

    const openEditCarouselSlide = (s) => {
        setCarouselEditing(s);
        setCarouselForm({
            category: s?.category || "featured",
            badge: s?.badge || "",
            title: s?.title || "",
            greeting: s?.greeting || "",
            story: s?.story || "",
            sort_order: s?.sort_order != null ? String(s.sort_order) : "",
            is_active: Boolean(s?.is_active),
        });
        setCarouselImageFile(null);
        setCarouselImagePreview("");
        setCarouselOpen(true);
    };

    const saveCarouselSlide = async () => {
        if (!token) return;
        if (!String(carouselForm.title || "").trim()) {
            toast.error("Title is required.");
            return;
        }

        const form = new FormData();
        form.append("category", String(carouselForm.category || "featured").trim());
        form.append("badge", String(carouselForm.badge || "").trim());
        form.append("title", String(carouselForm.title || "").trim());
        form.append("greeting", String(carouselForm.greeting || "").trim());
        form.append("story", String(carouselForm.story || "").trim());
        if (String(carouselForm.sort_order || "").trim() !== "") {
            form.append("sort_order", String(carouselForm.sort_order).trim());
        }
        form.append("is_active", carouselForm.is_active ? "1" : "0");
        if (carouselImageFile) form.append("image", carouselImageFile);

        try {
            setCarouselSaving(true);
            if (carouselEditing?.id) {
                const res = await axios.post(`/api/admin/carousel-slides/${carouselEditing.id}`, form, {
                    headers: { ...headers, "Content-Type": "multipart/form-data" },
                    withCredentials: true,
                });
                toast.success(res.data?.message || "Slide updated.");
            } else {
                if (!carouselImageFile) {
                    toast.error("Please choose an image.");
                    return;
                }
                const res = await axios.post("/api/admin/carousel-slides", form, {
                    headers: { ...headers, "Content-Type": "multipart/form-data" },
                    withCredentials: true,
                });
                toast.success(res.data?.message || "Slide created.");
            }

            setCarouselOpen(false);
            setCarouselEditing(null);
            setCarouselImageFile(null);
            setCarouselImagePreview("");
            await loadCarouselSlides({ showLoading: true });
        } catch (e) {
            toast.error(e?.response?.data?.message || "Couldn’t save slide.");
        } finally {
            setCarouselSaving(false);
        }
    };

    const deleteCarouselSlide = async (s) => {
        if (!token) return;
        const ok = window.confirm("Delete this slide?");
        if (!ok) return;
        try {
            await axios.delete(`/api/admin/carousel-slides/${s.id}`, { headers, withCredentials: true });
            toast.success("Slide deleted.");
            await loadCarouselSlides({ showLoading: false });
        } catch (e) {
            toast.error(e?.response?.data?.message || "Couldn’t delete slide.");
        }
    };

    const moveCarouselSlide = async (s, direction) => {
        if (!token) return;
        try {
            await axios.post(
                `/api/admin/carousel-slides/${s.id}/move`,
                { direction },
                { headers, withCredentials: true }
            );
            await loadCarouselSlides({ showLoading: false });
        } catch (e) {
            toast.error(e?.response?.data?.message || "Couldn’t reorder slide.");
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Students tab: auto-fetch so admin doesn't need to click Refresh.
    const studentQRef = React.useRef("");
    useEffect(() => {
        studentQRef.current = studentQ;
    }, [studentQ]);

    useEffect(() => {
        if (activeTab !== "students") return;

        let stopped = false;

        const tick = async ({ showLoading } = { showLoading: false }) => {
            if (stopped) return;
            if (typeof document !== "undefined" && document.hidden) return;
            await loadStudents(studentQRef.current, { showLoading });
        };

        // Initial load for the tab.
        tick({ showLoading: true });

        // Poll periodically.
        const id = setInterval(() => tick({ showLoading: false }), 30000);

        const onVis = () => {
            if (!document.hidden) tick({ showLoading: false });
        };
        document.addEventListener("visibilitychange", onVis);

        return () => {
            stopped = true;
            clearInterval(id);
            document.removeEventListener("visibilitychange", onVis);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Auto-search as you type (debounced).
    useEffect(() => {
        if (activeTab !== "students") return;
        const t = setTimeout(() => {
            loadStudents(studentQ, { showLoading: false });
        }, 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentQ, activeTab]);

    const filteredStudents = useMemo(() => {
        const f = (studentFilter || "all").toLowerCase();
        if (f === "all") return students;
        return (students || []).filter((s) => (s.advisor_status || "pending").toLowerCase() === f);
    }, [studentFilter, students]);

    return (
        <div className="admin">
            <header className="am-topbar">
                <div className="am-brand">
                    <img className="am-logo" src="/images/logo.png" alt="URIOS-ADVise" />
                    <div>
                        <div className="am-name">URIOS-ADVise</div>
                        <div className="am-sub">Administrator Dashboard</div>
                    </div>
                </div>

                <div className="am-actions">
                    <button
                        className="sp-iconbtn"
                        type="button"
                        title="School Calendar"
                        aria-label="Open school calendar"
                        onClick={() => setSchoolCalOpen(true)}
                    >
                        📅
                    </button>

                    <div className="sp-profile">
                        <button
                            type="button"
                            className="sp-avatarbtn"
                            onClick={() => setMenuOpen((v) => !v)}
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                        >
                            {user?.avatar_url ? (
                                <img className="sp-avatar-img" src={user.avatar_url} alt="Profile avatar" />
                            ) : (
                                <span className="sp-avatar" aria-hidden="true">
                                    {initials(user?.name || user?.email)}
                                </span>
                            )}
                        </button>

                        {menuOpen ? (
                            <div className="sp-menu" role="menu">
                                <div className="sp-menu-head">
                                    <div className="sp-menu-name">{user?.name || "Administrator"}</div>
                                    <div className="sp-menu-email">{user?.email || ""}</div>
                                    <div className="sp-role">{String(user?.role || role || "admin").toLowerCase().replace(/^./, (c) => c.toUpperCase())}</div>
                                </div>
                                <button type="button" className="sp-menu-item" onClick={openEdit}>
                                    Profile Settings
                                </button>
                                <button type="button" className="sp-menu-item" onClick={openAccount}>
                                    Account Settings
                                </button>
                                <div className="sp-menu-sep" />
                                <button type="button" className="sp-menu-item sp-menu-item--danger" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
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
                            <div className="am-stat-icon am-stat-icon--blue" aria-hidden="true">👥</div>
                        </div>
                        <div className="am-stat-value">{stats.totalStudents}</div>
                    </div>
                    <div className="am-stat">
                        <div className="am-stat-meta">
                            <div className="am-stat-label">Completed Assessments</div>
                            <div className="am-stat-icon am-stat-icon--green" aria-hidden="true">🧾</div>
                        </div>
                        <div className="am-stat-value am-stat-value--green">{stats.completedAssessments}</div>
                    </div>
                    <div className="am-stat">
                        <div className="am-stat-meta">
                            <div className="am-stat-label">Pending Review</div>
                            <div className="am-stat-icon am-stat-icon--orange" aria-hidden="true">⏳</div>
                        </div>
                        <div className="am-stat-value am-stat-value--orange">{stats.pendingReview}</div>
                    </div>
                    <div className="am-stat">
                        <div className="am-stat-meta">
                            <div className="am-stat-label">Average GPA</div>
                            <div className="am-stat-icon am-stat-icon--purple" aria-hidden="true">📈</div>
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
                    <button
                        type="button"
                        className={activeTab === "highlights" ? "am-tab am-tab--active" : "am-tab"}
                        onClick={() => setActiveTab("highlights")}
                        role="tab"
                        aria-selected={activeTab === "highlights"}
                    >
                        Highlights
                    </button>
                </div>

                {activeTab === "overview" ? (
                    <section className="am-panel">
                        <div className="am-panel-head">
                            <h2>Department Summary</h2>
                            
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

                            <div className="am-filters" aria-label="Student status filter">
                                <div className="am-filterbox">
                                    <div className="am-filterbox-label">Status</div>
                                    <select
                                        className="am-filterbox-select"
                                        value={studentFilter}
                                        onChange={(e) => setStudentFilter(e.target.value)}
                                        aria-label="Filter students by status"
                                    >
                                        <option value="all">All</option>
                                        <option value="pending">Pending</option>
                                        <option value="interview">Interview</option>
                                        <option value="approved">Approved</option>
                                        <option value="rejected">Rejected</option>
                                    </select>
                                </div>
                            </div>
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
                                                onClick={() => navigate(`/admin/students/${s.id}`)}
                                            >
                                                View
                                            </button>
                                            <button
                                                type="button"
                                                className="am-btn"
                                                onClick={() => navigate(`/admin/students/${s.id}`)}
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

                {activeTab === "highlights" ? (
                    <section className="am-panel">
                        <div className="am-panel-head" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div>
                                <h2>Highlights Carousel</h2>
                                <div className="am-muted">Manage the student-facing Campus Highlights slideshow</div>
                            </div>
                            <button type="button" className="am-btn" onClick={openNewCarouselSlide}>
                                + Add slide
                            </button>
                        </div>

                        {carouselLoading ? <div className="am-muted">Loading…</div> : null}

                        {!carouselLoading && !carouselSlides.length ? (
                            <div className="am-muted">No slides yet.</div>
                        ) : null}

                        {!carouselLoading && carouselSlides.length ? (
                            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                                {carouselSlides.map((s) => (
                                    <div
                                        key={s.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            gap: 12,
                                            padding: 12,
                                            border: "1px solid var(--border)",
                                            borderRadius: 14,
                                            background: "var(--surface)",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                                            {carouselThumbSrc(s) ? (
                                                <img
                                                    src={carouselThumbSrc(s)}
                                                    alt={s.title || "Slide"}
                                                    style={{ width: 86, height: 56, objectFit: "cover", borderRadius: 12, border: "1px solid var(--border)" }}
                                                />
                                            ) : (
                                                <div
                                                    style={{ width: 86, height: 56, borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-2)" }}
                                                />
                                            )}

                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 1000, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {s.title || "Untitled"}
                                                </div>
                                                <div className="am-muted" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                    {s.badge ? `${String(s.badge).toUpperCase()} • ` : ""}
                                                    {s.category || "featured"}
                                                    {s.is_active ? "" : " • hidden"}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                            <button type="button" className="am-btn am-btn--ghost" onClick={() => moveCarouselSlide(s, "up")}>
                                                ↑
                                            </button>
                                            <button type="button" className="am-btn am-btn--ghost" onClick={() => moveCarouselSlide(s, "down")}>
                                                ↓
                                            </button>
                                            <button type="button" className="am-btn am-btn--ghost" onClick={() => openEditCarouselSlide(s)}>
                                                Edit
                                            </button>
                                            <button type="button" className="am-btn" onClick={() => deleteCarouselSlide(s)}>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </section>
                ) : null}
            </main>

            {schoolCalOpen ? (
                <div className="sp-modal" role="dialog" aria-modal="true">
                    <div className="sp-modal-card" style={{ width: "min(980px, 100%)" }}>
                        <div className="sp-modal-head">
                            <div />
                            <button type="button" className="sp-iconbtn" onClick={() => setSchoolCalOpen(false)} aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <div className="sp-modal-body sp-modal-body--single" style={{ padding: 0 }}>
                            <iframe
                                title="School calendar"
                                src="/school-calendar"
                                style={{ width: "100%", height: "min(72vh, 720px)", border: 0 }}
                            />
                        </div>

                        <div className="sp-modal-foot">
                            <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setSchoolCalOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {editOpen ? (
                <div className="sp-modal" role="dialog" aria-modal="true">
                    <div className="sp-modal-card">
                        <div className="sp-modal-head">
                            <div className="sp-modal-title">Profile Settings</div>
                            <button type="button" className="sp-iconbtn" onClick={() => setEditOpen(false)} aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <div className="sp-modal-body">
                            <div className="sp-modal-avatar">
                                {avatarPreview ? (
                                    <img className="sp-avatar-img sp-avatar-img--lg" src={avatarPreview} alt="Avatar preview" />
                                ) : user?.avatar_url ? (
                                    <img className="sp-avatar-img sp-avatar-img--lg" src={user.avatar_url} alt="Profile avatar" />
                                ) : (
                                    <span className="sp-avatar sp-avatar--lg" aria-hidden="true">
                                        {initials(user?.name || user?.email)}
                                    </span>
                                )}

                                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                                    <label className="sp-btn sp-btn--ghost" style={{ cursor: "pointer" }}>
                                        Choose photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                    <button type="button" className="sp-btn sp-btn--primary" onClick={saveAvatar} disabled={avatarSaving}>
                                        {avatarSaving ? "Saving…" : "Save photo"}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <div className="sp-form">
                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        Name
                                        <input
                                            value={editForm.name}
                                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                            placeholder="Full name"
                                        />
                                    </label>
                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        Email
                                        <input
                                            value={editForm.email}
                                            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                                            placeholder="Email address"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="sp-modal-foot">
                            <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setEditOpen(false)}>
                                Cancel
                            </button>
                            <button type="button" className="sp-btn sp-btn--primary" onClick={saveProfile} disabled={saving}>
                                {saving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {accountOpen ? (
                <div className="sp-modal" role="dialog" aria-modal="true">
                    <div className="sp-modal-card">
                        <div className="sp-modal-head">
                            <div>
                                <div className="sp-modal-title">Account Settings</div>
                                <div className="sp-muted">Manage password and preferences</div>
                            </div>
                            <button type="button" className="sp-iconbtn" onClick={() => setAccountOpen(false)} aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <div className="sp-modal-body sp-modal-body--single">
                            <div className="sp-settings-section">
                                <div className="sp-settings-section__title">Appearance</div>
                                <div className="sp-settings-row">
                                    <div>
                                        <div className="sp-settings-label">Dark mode</div>
                                        <div className="sp-muted">Switch to a darker theme.</div>
                                    </div>
                                    <label className="sp-switch" aria-label="Toggle dark mode">
                                        <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
                                        <span className="sp-switch__track" aria-hidden="true">
                                            <span className="sp-switch__thumb" />
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div className="sp-settings-section">
                                <div className="sp-settings-section__title">Security</div>
                                <div className="sp-muted" style={{ marginTop: -6 }}>
                                    Change your password. Minimum 8 characters.
                                </div>

                                <div className="sp-form sp-form--stack" style={{ marginTop: 12 }}>
                                    <label className="sp-field">
                                        <span>Current password</span>
                                        <input
                                            type="password"
                                            value={pwForm.current_password}
                                            onChange={(e) => setPwForm((p) => ({ ...p, current_password: e.target.value }))}
                                            autoComplete="current-password"
                                        />
                                    </label>
                                    <label className="sp-field">
                                        <span>New password</span>
                                        <input
                                            type="password"
                                            value={pwForm.password}
                                            onChange={(e) => setPwForm((p) => ({ ...p, password: e.target.value }))}
                                            autoComplete="new-password"
                                        />
                                    </label>
                                    <label className="sp-field">
                                        <span>Confirm new password</span>
                                        <input
                                            type="password"
                                            value={pwForm.password_confirmation}
                                            onChange={(e) => setPwForm((p) => ({ ...p, password_confirmation: e.target.value }))}
                                            autoComplete="new-password"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="sp-modal-foot">
                            <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setAccountOpen(false)}>
                                Cancel
                            </button>
                            <button type="button" className="sp-btn sp-btn--primary" onClick={changePassword} disabled={pwSaving}>
                                {pwSaving ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {carouselOpen ? (
                <div className="sp-modal" role="dialog" aria-modal="true">
                    <div className="sp-modal-card" style={{ width: "min(980px, 100%)" }}>
                        <div className="sp-modal-head">
                            <div>
                                <div className="sp-modal-title">{carouselEditing ? "Edit Slide" : "Add Slide"}</div>
                                <div className="sp-muted">Image, title, greeting, and story appear on the student carousel</div>
                            </div>
                            <button type="button" className="sp-iconbtn" onClick={() => setCarouselOpen(false)} aria-label="Close">
                                ✕
                            </button>
                        </div>

                        <div className="sp-modal-body" style={{ gap: 18 }}>
                            <div className="sp-modal-avatar">
                                {carouselImagePreview ? (
                                    <img className="sp-avatar-img sp-avatar-img--lg" src={carouselImagePreview} alt="Slide preview" />
                                ) : carouselEditing?.image_url ? (
                                    <img className="sp-avatar-img sp-avatar-img--lg" src={carouselEditing.image_url} alt="Slide" />
                                ) : (
                                    <div
                                        style={{
                                            width: 124,
                                            height: 124,
                                            borderRadius: 18,
                                            border: "1px solid var(--border)",
                                            background: "var(--surface-2)",
                                        }}
                                    />
                                )}

                                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                                    <label className="sp-btn sp-btn--ghost" style={{ cursor: "pointer" }}>
                                        Choose image
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: "none" }}
                                            onChange={(e) => onPickCarouselImage(e.target.files?.[0] || null)}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <div className="sp-form" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                    <label className="sp-field">
                                        Category
                                        <select
                                            value={carouselForm.category}
                                            onChange={(e) => setCarouselForm((p) => ({ ...p, category: e.target.value }))}
                                        >
                                            <option value="featured">Featured</option>
                                            <option value="school_achievement">School achievement</option>
                                            <option value="program_achievement">Program achievement</option>
                                        </select>
                                    </label>

                                    <label className="sp-field">
                                        Badge (optional)
                                        <input
                                            value={carouselForm.badge}
                                            onChange={(e) => setCarouselForm((p) => ({ ...p, badge: e.target.value }))}
                                            placeholder="e.g. COMMUNITY"
                                        />
                                    </label>

                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        Title
                                        <input
                                            value={carouselForm.title}
                                            onChange={(e) => setCarouselForm((p) => ({ ...p, title: e.target.value }))}
                                            placeholder="Slide title"
                                        />
                                    </label>

                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        Greeting (optional)
                                        <input
                                            value={carouselForm.greeting}
                                            onChange={(e) => setCarouselForm((p) => ({ ...p, greeting: e.target.value }))}
                                            placeholder="Short greeting / intro"
                                        />
                                    </label>

                                    <label className="sp-field" style={{ gridColumn: "1 / -1" }}>
                                        Story (optional)
                                        <textarea
                                            value={carouselForm.story}
                                            onChange={(e) => setCarouselForm((p) => ({ ...p, story: e.target.value }))}
                                            rows={4}
                                            placeholder="Short story/description"
                                        />
                                    </label>

                                    <label className="sp-field">
                                        Sort order (optional)
                                        <input
                                            value={carouselForm.sort_order}
                                            onChange={(e) => setCarouselForm((p) => ({ ...p, sort_order: e.target.value }))}
                                            placeholder="e.g. 10"
                                            inputMode="numeric"
                                        />
                                    </label>

                                    <label className="sp-field">
                                        Visible
                                        <select
                                            value={carouselForm.is_active ? "1" : "0"}
                                            onChange={(e) => setCarouselForm((p) => ({ ...p, is_active: e.target.value === "1" }))}
                                        >
                                            <option value="1">Yes</option>
                                            <option value="0">No</option>
                                        </select>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="sp-modal-foot">
                            <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setCarouselOpen(false)}>
                                Cancel
                            </button>
                            <button type="button" className="sp-btn sp-btn--primary" onClick={saveCarouselSlide} disabled={carouselSaving}>
                                {carouselSaving ? "Saving…" : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
