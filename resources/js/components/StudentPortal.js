import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "./ui/toast";

function initials(nameOrEmail) {
    const s = String(nameOrEmail || "").trim();
    if (!s) return "S";
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatApptDate(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatApptTime(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatApptFull(dt) {
    if (!dt) return "";
    const d = new Date(dt);
    return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function StudentPortal() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [menuOpen, setMenuOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [upcoming, setUpcoming] = useState([]);
    const [bookOpen, setBookOpen] = useState(false);
    const [bookSubmitting, setBookSubmitting] = useState(false);
    const [bookForm, setBookForm] = useState({
        session_type: "Initial Consultation",
        date: "",
        time: "",
        notes: "",
    });

    const [notifOpen, setNotifOpen] = useState(false);
    const [notifs, setNotifs] = useState([]);
    const [notifLoading, setNotifLoading] = useState(false);

    const [schoolCalOpen, setSchoolCalOpen] = useState(false);

    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");
    const [avatarSaving, setAvatarSaving] = useState(false);
    const avatarInputRef = useRef(null);

    const [darkMode, setDarkMode] = useState(() => {
        try {
            return localStorage.getItem("theme") === "dark";
        } catch {
            return false;
        }
    });

    const [pwForm, setPwForm] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });
    const [pwSaving, setPwSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        age: "",
        gender: "",
        contact_number: "",
        high_school: "",
    });

    const fullName = useMemo(() => {
        if (!user?.name) return "Student";
        return user.name;
    }, [user]);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (!stored) {
            navigate("/login");
            return;
        }
        try {
            setUser(JSON.parse(stored));
        } catch {
            localStorage.removeItem("user");
            navigate("/login");
        }
    }, [navigate]);

    useEffect(() => {
        try {
            document.body.dataset.theme = darkMode ? "dark" : "light";
            localStorage.setItem("theme", darkMode ? "dark" : "light");
        } catch {
            // ignore
        }
    }, [darkMode]);

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            setLoading(false);
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);
            try {
                const res = await axios.get("/api/profile", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                    withCredentials: true,
                });
                setProfile(res.data?.profile || null);
            } catch {
                // If token is stale, portal will still render from localStorage user.
                setProfile(null);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        const fetchUpcoming = async () => {
            try {
                const res = await axios.get("/api/appointments?scope=upcoming&limit=3", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });
                setUpcoming(res.data?.appointments || []);
            } catch {
                setUpcoming([]);
            }
        };

        fetchUpcoming();
    }, []);

    const nextUpcoming = useMemo(() => {
        const list = Array.isArray(upcoming) ? upcoming : [];
        const rows = list
            .filter((a) => a && (a.scheduled_at || a.preferred_at))
            .map((a) => {
                const dt = a.scheduled_at || a.preferred_at;
                return { a, t: dt ? new Date(dt).getTime() : Number.POSITIVE_INFINITY };
            })
            .filter((x) => Number.isFinite(x.t))
            .sort((x, y) => x.t - y.t);
        return rows[0]?.a || null;
    }, [upcoming]);

    const calendarTooltip = useMemo(() => {
        if (!nextUpcoming) return "Appointments";
        const dt = nextUpcoming.scheduled_at || nextUpcoming.preferred_at;
        if (!dt) return "Appointments";
        const d = new Date(dt);
        const when = d.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
        return `Next appointment: ${when}`;
    }, [nextUpcoming]);

    const loadNotifications = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        setNotifLoading(true);
        try {
            const res = await axios.get("/api/notifications?limit=10", {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
            });
            setNotifs(res.data?.notifications || []);
        } catch {
            setNotifs([]);
        } finally {
            setNotifLoading(false);
        }
    };

    const completion = useMemo(() => {
        const u = user;
        const p = profile;

        const step1 = Boolean(
            (u?.name || "").trim() &&
                (u?.email || "").trim() &&
                p?.age != null &&
                String(p?.gender || "").trim() &&
                String(p?.high_school || "").trim() &&
                String(p?.contact_number || "").trim()
        );

        const subjectGrades = Array.isArray(p?.subject_grades) ? p.subject_grades : [];
        const hasAtLeastOneSubject = subjectGrades.some(
            (r) => String(r?.subject || "").trim() && r?.grade != null && r?.grade !== ""
        );

        const hasSkills = Array.isArray(p?.skills) ? p.skills.filter(Boolean).length > 0 : false;

        const ratings = p?.program_interest_ratings;
        const hasRatings = ratings && typeof ratings === "object" && Object.keys(ratings).length > 0;

        const step2 = Boolean(
            String(p?.shs_strand || "").trim() &&
                p?.shs_general_average != null &&
                String(p?.career_goals || "").trim() &&
                hasAtLeastOneSubject &&
                hasSkills &&
                hasRatings
        );

        const step3 = Boolean(Array.isArray(p?.assessment_part1_selected) && p.assessment_part1_selected.length);

        const step4 = Boolean(Array.isArray(p?.recommended_top3) && p.recommended_top3.length);

        // Step 5: Advisor Approval
        const advisorStatus = String(p?.advisor_status || "pending").toLowerCase();
        const step5 = advisorStatus === "approved";

        const done = [step1, step2, step3, step4, step5].filter(Boolean).length;
        const total = 5;
        const remaining = total - done;
    // If student finished the recommendation step but is awaiting advisor approval,
    // keep the progress from showing as fully complete.
    const percent = step4 && !step5 ? Math.round((4 / total) * 100) : Math.round((done / total) * 100);

        return {
            step1,
            step2,
            step3,
            step4,
            step5,
            done,
            total,
            percent,
            remaining,
            advisorStatus,
        };
    }, [user, profile]);

    const progressMetaText = useMemo(() => {
        if (loading) return "Loading progress…";

        // Once Step 4 is completed, the primary state becomes advisor review.
        if (completion.step4 && !completion.step5) {
            return `${completion.percent}% complete - Waiting for advisor's approval`;
        }

        return `${completion.percent}% complete - ${completion.remaining} step${
            completion.remaining === 1 ? "" : "s"
        } remaining`;
    }, [completion.percent, completion.remaining, completion.step4, completion.step5, loading]);

    const pillText = (isComplete) => (isComplete ? "Completed" : "Pending");
    const pillClass = (isComplete) =>
        `sp-pill ${isComplete ? "sp-pill--done" : "sp-pill--pending"}`;

    const doneMark = (isComplete) =>
        isComplete ? (
            <span className="sp-done" aria-label="Completed" title="Completed">
                ✓
            </span>
        ) : null;

    const handleLogout = async () => {
        const token = localStorage.getItem("authToken");
        try {
            if (token) {
                await axios.post(
                    "/api/logout",
                    {},
                    {
                        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                        withCredentials: true,
                    }
                );
            }
        } finally {
            localStorage.removeItem("authToken");
            localStorage.removeItem("user");
            localStorage.removeItem("userRole");
            navigate("/login");
        }
    };

    const roleLabel = useMemo(() => {
        const r = String(user?.role || "student").toLowerCase();
        if (r === "admin") return "Admin";
        if (r === "advisor") return "Advisor";
        return "Student";
    }, [user]);

    const openEdit = () => {
        setMenuOpen(false);
        setAvatarFile(null);
        setAvatarPreview("");
        setEditForm({
            name: user?.name || "",
            email: user?.email || "",
            age: profile?.age ?? "",
            gender: profile?.gender || "",
            contact_number: profile?.contact_number || "",
            high_school: profile?.high_school || "",
        });
        setEditOpen(true);
    };

    const openAccount = () => {
        setMenuOpen(false);
        setPwForm({ current_password: "", password: "", password_confirmation: "" });
        setAccountOpen(true);
    };

    const onPickAvatar = (file) => {
        if (!file) {
            setAvatarFile(null);
            setAvatarPreview("");
            return;
        }
        setAvatarFile(file);
        const url = URL.createObjectURL(file);
        setAvatarPreview(url);
    };

    const openAvatarPicker = () => {
        // Allow picking the same file twice in a row
        if (avatarInputRef.current) avatarInputRef.current.value = "";
        avatarInputRef.current?.click?.();
    };

    useEffect(() => {
        return () => {
            if (avatarPreview) {
                try {
                    URL.revokeObjectURL(avatarPreview);
                } catch {
                    // ignore
                }
            }
        };
    }, [avatarPreview]);

    const saveAvatar = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            toast.error("Your session expired. Please log in again.");
            navigate("/login");
            return;
        }

        if (!avatarFile) {
            toast.info("Please choose an image first.");
            return;
        }

        try {
            setAvatarSaving(true);
            const form = new FormData();
            form.append("avatar", avatarFile);

            const res = await axios.post("/api/profile/avatar", form, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
            });

            // Prefer refreshing from the server (also avoids stale localStorage shape)
            try {
                const me = await axios.get("/api/profile", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });
                const serverUser = me.data?.user;
                const avatarUrl = serverUser?.avatar_url || res.data?.avatar_url;
                const cacheBusted = avatarUrl ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}` : null;

                if (serverUser) {
                    const next = { ...serverUser, avatar_url: cacheBusted || avatarUrl };
                    setUser(next);
                    setProfile(me.data?.profile || null);
                    try {
                        localStorage.setItem("user", JSON.stringify(next));
                    } catch {
                        // ignore
                    }
                } else if (avatarUrl) {
                    setUser((u) => {
                        const next = { ...(u || {}), avatar_url: cacheBusted || avatarUrl };
                        try {
                            localStorage.setItem("user", JSON.stringify(next));
                        } catch {
                            // ignore
                        }
                        return next;
                    });
                }
            } catch {
                const avatarUrl = res.data?.avatar_url;
                if (avatarUrl) {
                    const cacheBusted = `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;
                    setUser((u) => {
                        const next = { ...(u || {}), avatar_url: cacheBusted };
                        try {
                            localStorage.setItem("user", JSON.stringify(next));
                        } catch {
                            // ignore
                        }
                        return next;
                    });
                }
            }

            toast.success(res.data?.message || "Profile photo updated.");
            // Avatar upload now lives inside the Profile Settings modal.
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t upload profile photo.";
            toast.error(msg);
        } finally {
            setAvatarSaving(false);
        }
    };

    const changePassword = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            toast.error("Your session expired. Please log in again.");
            navigate("/login");
            return;
        }
        if (pwSaving) return;

        if (!String(pwForm.current_password || "").trim()) {
            toast.error("Please enter your current password.");
            return;
        }
        if (String(pwForm.password || "").length < 8) {
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
                {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                }
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

    const saveProfile = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) return;

        setSaving(true);
        try {
            const payload = {
                name: String(editForm.name || "").trim(),
                email: String(editForm.email || "").trim(),
                age: Number(editForm.age),
                gender: String(editForm.gender || "").trim(),
                high_school: String(editForm.high_school || "").trim(),
                contact_number: String(editForm.contact_number || "").trim(),
            };

            const res = await axios.put("/api/profile/basic-info", payload, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
            });

            // reflect immediately
            const newUser = res.data?.user || user;
            const newProfile = res.data?.profile || profile;
            setUser(newUser);
            setProfile(newProfile);
            localStorage.setItem("user", JSON.stringify(newUser));
            toast.success(res.data?.message || "Profile updated.");
            setEditOpen(false);
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t save profile.";
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    const submitRequest = async () => {
        const token = localStorage.getItem("authToken");
        if (!token) {
            toast.error("Your session expired. Please log in again.");
            navigate("/login");
            return;
        }

        if (bookSubmitting) return;

        const date = String(bookForm.date || "").trim();
        const time = String(bookForm.time || "").trim();
        if (!date || !time) {
            toast.error("Please select a date and time.");
            return;
        }

        const preferredAt = `${date}T${time}:00`;

        try {
            setBookSubmitting(true);
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

            setBookForm((p) => ({
                ...p,
                date: "",
                time: "",
                notes: "",
            }));

            const list = await axios.get("/api/appointments?scope=upcoming&limit=3", {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
            });
            setUpcoming(list.data?.appointments || []);
        } catch (e) {
            const msg = e?.response?.data?.message || "Couldn’t send request.";
            toast.error(msg);
        } finally {
            setBookSubmitting(false);
        }
    };

    return (
        <div className="student-portal">
            <header className="sp-topbar">
                <div className="sp-brand">
                    <img
                        className="sp-logo"
                        src="/images/logo.png"
                        alt="URIOS-ADVise"
                    />
                    <div>
                        <div className="sp-title">URIOS-ADVise</div>
                        <div className="sp-subtitle">Student Portal</div>
                    </div>
                </div>

                <div className="sp-actions">
                    <div className="sp-profile" style={{ position: "relative" }}>
                        <button
                            className="sp-iconbtn"
                            type="button"
                            title="Notifications"
                            aria-label="Notifications"
                            onClick={async () => {
                                const next = !notifOpen;
                                setNotifOpen(next);
                                if (next) await loadNotifications();
                            }}
                        >
                            🔔
                            <span className="sp-badge-dot" aria-label={`${notifs.length} items`}>{notifs.length}</span>
                        </button>

                        {notifOpen ? (
                            <div className="sp-menu" style={{ right: 0, width: 360 }} role="menu">
                                <div className="sp-menu-head">
                                    <div style={{ fontWeight: 900 }}>Notifications</div>
                                    <button type="button" className="sp-link" onClick={() => { setNotifOpen(false); }}>
                                        Close
                                    </button>
                                </div>

                                {notifLoading ? <div className="sp-muted" style={{ padding: "10px 12px" }}>Loading…</div> : null}

                                {!notifLoading && !notifs.length ? (
                                    <div className="sp-muted" style={{ padding: "10px 12px" }}>No notifications yet.</div>
                                ) : null}

                                {!notifLoading && notifs.length ? (
                                    <div className="sp-menu-list">
                                        {notifs.map((n) => {
                                            const st = String(n.status || "requested").toLowerCase();
                                            const isScheduled = st === "scheduled";
                                            const isCancelled = st === "cancelled";
                                            const isRejected = st === "rejected";
                                            const isCompleted = st === "completed";

                                            const title = isScheduled
                                                ? "Appointment confirmed"
                                                : isCancelled
                                                    ? "Appointment cancelled"
                                                    : isRejected
                                                        ? "Appointment rejected"
                                                        : isCompleted
                                                            ? "Appointment completed"
                                                            : "Appointment request sent";

                                            const when = isScheduled
                                                ? formatApptFull(n.scheduled_at)
                                                : n.preferred_at
                                                    ? `Preferred: ${formatApptFull(n.preferred_at)}`
                                                    : "Preferred: —";
                                            return (
                                                <div key={n.id} className="sp-menu-item" role="menuitem" style={{ cursor: "default" }}>
                                                    <div style={{ fontWeight: 900, color: "#0f172a" }}>{title}</div>
                                                    <div className="sp-muted" style={{ marginTop: 2 }}>
                                                        {n.session_type || "Advising Session"}
                                                    </div>
                                                    <div className="sp-muted" style={{ marginTop: 6 }}>
                                                        <strong style={{ color: "#0f172a" }}>When:</strong> {when}
                                                    </div>
                                                    {(isScheduled || isCancelled || isCompleted) && n.location ? (
                                                        <div className="sp-muted" style={{ marginTop: 4 }}>
                                                            <strong style={{ color: "#0f172a" }}>Where:</strong> {n.location}
                                                        </div>
                                                    ) : null}
                                                    {(isScheduled || isCancelled || isRejected || isCompleted) && n.advisor?.name ? (
                                                        <div className="sp-muted" style={{ marginTop: 4 }}>
                                                            <strong style={{ color: "#0f172a" }}>Advisor:</strong> {n.advisor.name}
                                                        </div>
                                                    ) : null}
                                                    {((isScheduled || isCancelled || isRejected || isCompleted) && n.advisor_comment) ? (
                                                        <div className="sp-muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                                                            <strong style={{ color: "#0f172a" }}>Note:</strong> {n.advisor_comment}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>

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
                                    <div className="sp-menu-name">{user?.name || "Student"}</div>
                                    <div className="sp-menu-email">{user?.email || ""}</div>
                                    <div className="sp-role">{roleLabel}</div>
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

            <main className="sp-main">
                <div className="sp-hero">
                    <section className="sp-hero-left">
                        <h1 className="sp-welcome">Welcome, {fullName}!</h1>
                        <p className="sp-caption">
                            Complete the following steps to get your personalized course recommendation
                        </p>

                        <section className="sp-progress">
                            <div className="sp-progress-head">
                                <div>
                                    <div className="sp-progress-title">Your Progress</div>
                                    <div className="sp-progress-meta">{progressMetaText}</div>
                                </div>
                            </div>
                            <div className="sp-bar" aria-hidden="true">
                                <div className="sp-bar-fill" style={{ width: `${completion.percent}%` }} />
                            </div>
                            <div className="sp-bar-labels">
                                <span>Getting Started</span>
                                <span>Recommendation Ready</span>
                            </div>
                        </section>
                    </section>

                    <aside className="sp-hero-right">
                        <div className="sp-widget">
                            <div className="sp-widget-head">
                                <div>
                                    <div className="sp-widget-title">Appointments</div>
                                    <div className="sp-widget-sub">{upcoming.length} upcoming</div>
                                </div>
                                <button type="button" className="sp-btn sp-btn--primary" onClick={() => setBookOpen(true)}>
                                    + Book
                                </button>
                            </div>

                            {upcoming.length === 0 ? (
                                <div className="sp-widget-empty">
                                    <div className="sp-calendar" aria-hidden="true">🗓</div>
                                    <div className="sp-muted">No upcoming appointments</div>
                                    <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setBookOpen(true)}>
                                        Schedule Your First Session
                                    </button>
                                </div>
                            ) : (
                                <div className="sp-widget-list">
                                    {upcoming.map((a) => (
                                        <div key={a.id} className="sp-widget-item">
                                            <div>
                                                <div className="sp-strong">
                                                    {a.scheduled_at
                                                        ? `${formatApptDate(a.scheduled_at)} • ${formatApptTime(a.scheduled_at)}`
                                                        : "Awaiting schedule"}
                                                </div>
                                                <div className="sp-muted">{a.session_type || "Advising Session"}</div>
                                            </div>
                                            <span className="sp-badge sp-badge--info">{String(a.status || "requested")}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button type="button" className="sp-link" onClick={() => navigate("/student/appointments")}
                            >
                                View All Appointments
                            </button>
                        </div>
                    </aside>
                </div>

                <section className="sp-grid sp-grid--4">
                    <button
                        type="button"
                        className="sp-card sp-card--button"
                        onClick={() => navigate("/student/basic-information")}
                    >
                        <div className="sp-card-icon" aria-hidden="true">
                            👤
                        </div>
                        <div className="sp-card-body">
                            <div className="sp-card-title">
                                Basic Information {doneMark(completion.step1)}
                            </div>
                            <div className="sp-card-sub">Complete your profile</div>
                            <span className={pillClass(completion.step1)}>
                                {pillText(completion.step1)}
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        className="sp-card sp-card--button"
                        onClick={() => navigate("/student/academic-credentials")}
                    >
                        <div className="sp-card-icon" aria-hidden="true">
                            📄
                        </div>
                        <div className="sp-card-body">
                            <div className="sp-card-title">
                                Academic Credentials {doneMark(completion.step2)}
                            </div>
                            <div className="sp-card-sub">Add grades, skills &amp; interests</div>
                            <span className={pillClass(completion.step2)}>
                                {pillText(completion.step2)}
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        className="sp-card sp-card--button"
                        onClick={() => navigate("/student/assessment-quiz")}
                    >
                        <div className="sp-card-icon" aria-hidden="true">
                            🧾
                        </div>
                        <div className="sp-card-body">
                            <div className="sp-card-title">
                                Assessment Quiz {doneMark(completion.step3)}
                            </div>
                            <div className="sp-card-sub">Complete the general assessment</div>
                            <span className={pillClass(completion.step3)}>
                                {pillText(completion.step3)}
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        className="sp-card sp-card--button"
                        onClick={() => navigate("/student/course-recommendation")}
                    >
                        <div className="sp-card-icon" aria-hidden="true">
                            🎯
                        </div>
                        <div className="sp-card-body">
                            <div className="sp-card-title">
                                Course Recommendation {doneMark(completion.step4)}
                            </div>
                            <div className="sp-card-sub">View your recommended programs</div>
                            <span className={pillClass(completion.step4)}>
                                {pillText(completion.step4)}
                            </span>
                        </div>
                    </button>
                </section>

                {editOpen ? (
                    <div className="sp-modal" role="dialog" aria-modal="true">
                        <div className="sp-modal-card">
                            <div className="sp-modal-head">
                                <div>
                                    <div className="sp-modal-title">Edit Profile</div>
                                    <div className="sp-muted">Update your personal information.</div>
                                </div>
                                <button type="button" className="sp-iconbtn" onClick={() => setEditOpen(false)} aria-label="Close">✕</button>
                            </div>

                            <div className="sp-modal-body">
                                <div className="sp-modal-avatar">
                                    {avatarPreview || user?.avatar_url ? (
                                        <img
                                            className="sp-avatar-img sp-avatar-img--lg"
                                            src={avatarPreview || user.avatar_url}
                                            alt="Avatar"
                                        />
                                    ) : (
                                        <div className="sp-avatar sp-avatar--lg">{initials(editForm.name || editForm.email)}</div>
                                    )}

                                    <div style={{ marginTop: 10, width: "100%" }}>
                                        <button
                                            type="button"
                                            className="sp-btn sp-btn--ghost"
                                            onClick={openAvatarPicker}
                                            disabled={avatarSaving}
                                            style={{ width: "100%" }}
                                        >
                                            Change avatar
                                        </button>
                                        <input
                                            id="sp-avatar-input"
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                                            style={{ display: "none" }}
                                        />
                                        {avatarFile ? (
                                            <button
                                                type="button"
                                                className="sp-btn sp-btn--primary"
                                                onClick={saveAvatar}
                                                disabled={avatarSaving}
                                                style={{ width: "100%", marginTop: 8 }}
                                            >
                                                {avatarSaving ? "Uploading…" : "Upload"}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="sp-form">
                                    <label className="sp-field">
                                        <span>Name</span>
                                        <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} />
                                    </label>
                                    <label className="sp-field">
                                        <span>Email</span>
                                        <input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
                                    </label>
                                    <label className="sp-field">
                                        <span>Age</span>
                                        <input type="number" value={editForm.age} onChange={(e) => setEditForm((p) => ({ ...p, age: e.target.value }))} />
                                    </label>
                                    <label className="sp-field">
                                        <span>Gender</span>
                                        <input value={editForm.gender} onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))} />
                                    </label>
                                    <label className="sp-field">
                                        <span>Contact</span>
                                        <input value={editForm.contact_number} onChange={(e) => setEditForm((p) => ({ ...p, contact_number: e.target.value }))} />
                                    </label>
                                    <label className="sp-field">
                                        <span>High School</span>
                                        <input value={editForm.high_school} onChange={(e) => setEditForm((p) => ({ ...p, high_school: e.target.value }))} />
                                    </label>
                                </div>
                            </div>

                            <div className="sp-modal-foot">
                                <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setEditOpen(false)} disabled={saving}>
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
                                    <div className="sp-muted">Security & appearance</div>
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
                                            <input
                                                type="checkbox"
                                                checked={darkMode}
                                                onChange={(e) => setDarkMode(e.target.checked)}
                                            />
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
                                <button type="button" className="sp-btn sp-btn--ghost" onClick={() => setAccountOpen(false)} disabled={pwSaving}>
                                    Cancel
                                </button>
                                <button type="button" className="sp-btn sp-btn--primary" onClick={changePassword} disabled={pwSaving}>
                                    {pwSaving ? "Saving…" : "Save changes"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

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
                                <button type="button" className="sp-btn sp-btn--primary" onClick={submitRequest} disabled={bookSubmitting}>
                                    {bookSubmitting ? "Requesting…" : "Request Appointment"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : null}

                {schoolCalOpen ? (
                    <div className="sp-modal" role="dialog" aria-modal="true">
                        <div className="sp-modal-card" style={{ width: "min(980px, 100%)" }}>
                            <div className="sp-modal-head">
                                <div />
                                <button
                                    type="button"
                                    className="sp-iconbtn"
                                    onClick={() => setSchoolCalOpen(false)}
                                    aria-label="Close"
                                >
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
            </main>
        </div>
    );
}
