import React, { useEffect, useMemo, useRef, useState } from "react";
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
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("user") || "null");
        } catch {
            return null;
        }
    });

    const [darkMode, setDarkMode] = useState(() => {
        try {
            return localStorage.getItem("theme") === "dark";
        } catch {
            return false;
        }
    });

    const [stats, setStats] = useState({ totalStudents: 0, pending: 0, approved: 0 });
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [error, setError] = useState(null);

    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const profileMenuRef = useRef(null);

    const [notifOpen, setNotifOpen] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);
    const [notifs, setNotifs] = useState([]);

    const [schoolCalOpen, setSchoolCalOpen] = useState(false);

    const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);
    const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);

    const [profileSaving, setProfileSaving] = useState(false);
    const [avatarSaving, setAvatarSaving] = useState(false);
    const [pwSaving, setPwSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        name: "",
        email: "",
        age: "",
        gender: "",
        contact_number: "",
    });

    const [pwForm, setPwForm] = useState({
        current_password: "",
        password: "",
        password_confirmation: "",
    });

    const avatarInputRef = useRef(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState("");

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}`, Accept: "application/json" }),
        [token]
    );

    useEffect(() => {
        try {
            document.body.dataset.theme = darkMode ? "dark" : "light";
            localStorage.setItem("theme", darkMode ? "dark" : "light");
        } catch {
            // ignore
        }
    }, [darkMode]);

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

    useEffect(() => {
        const onDocMouseDown = (e) => {
            const hitProfile = profileMenuRef.current?.contains?.(e.target);
            const hitNotif = notifMenuRef.current?.contains?.(e.target);

            if (!hitProfile) setProfileMenuOpen(false);
            if (!hitNotif) setNotifOpen(false);
        };

        document.addEventListener("mousedown", onDocMouseDown);
        return () => document.removeEventListener("mousedown", onDocMouseDown);
    }, []);

    const notifMenuRef = useRef(null);

    const loadNotifications = async () => {
        if (!token) return;

        setNotifLoading(true);
        try {
            const res = await axios.get("/api/notifications?limit=10", { headers, withCredentials: true });
            setNotifs(res.data?.notifications || []);
        } catch {
            setNotifs([]);
        } finally {
            setNotifLoading(false);
        }
    };

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

    useEffect(() => {
        const fetchMe = async () => {
            if (!token) return;
            try {
                const res = await axios.get("/api/profile", { headers, withCredentials: true });
                const serverUser = res.data?.user || res.data;

                // cache-bust avatar to avoid stale browser caching after uploads
                const avatarUrl = serverUser?.avatar_url;
                const cacheBusted = avatarUrl
                    ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
                    : null;

                const nextUser = avatarUrl ? { ...serverUser, avatar_url: cacheBusted } : serverUser;
                setUser(nextUser);
                localStorage.setItem("user", JSON.stringify(nextUser));

                const serverProfile = res.data?.profile || null;
                setEditForm((p) => ({
                    ...p,
                    name: String(serverUser?.name || p.name || ""),
                    email: String(serverUser?.email || p.email || ""),
                    age: serverProfile?.age ?? p.age ?? "",
                    gender: String(serverProfile?.gender || p.gender || ""),
                    contact_number: String(serverProfile?.contact_number || p.contact_number || ""),
                }));
            } catch {
                // ignore; dashboard can function without fetching profile
            }
        };

        fetchMe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const logout = () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        localStorage.removeItem("userRole");
        navigate("/login");
    };

    const goToAppointments = () => navigate("/advisor/appointments");

    const openProfileSettings = () => {
        setProfileMenuOpen(false);

        // Seed the form from current user (and any cached profile values we already have)
        setEditForm((p) => ({
            ...p,
            name: String(user?.name || p.name || ""),
            email: String(user?.email || p.email || ""),
        }));
        setProfileSettingsOpen(true);
    };

    const openAccountSettings = () => {
        setProfileMenuOpen(false);
        setPwForm({ current_password: "", password: "", password_confirmation: "" });
        setAccountSettingsOpen(true);
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
        if (!token) {
            navigate("/login");
            return;
        }
        if (!avatarFile) return;

        try {
            setAvatarSaving(true);
            const form = new FormData();
            form.append("avatar", avatarFile);

            const res = await axios.post("/api/profile/avatar", form, {
                headers,
                withCredentials: true,
            });

            // Prefer refreshing from the server (also avoids stale localStorage shape)
            try {
                const me = await axios.get("/api/profile", { headers, withCredentials: true });
                const serverUser = me.data?.user || me.data;
                const avatarUrl = serverUser?.avatar_url || res.data?.avatar_url;
                const cacheBusted = avatarUrl
                    ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
                    : null;

                if (serverUser) {
                    const next = avatarUrl ? { ...serverUser, avatar_url: cacheBusted || avatarUrl } : serverUser;
                    setUser(next);
                    try {
                        localStorage.setItem("user", JSON.stringify(next));
                    } catch {
                        // ignore
                    }
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

            setAvatarFile(null);
            setAvatarPreview("");
        } finally {
            setAvatarSaving(false);
        }
    };

    const saveProfile = async () => {
        if (!token) return;
        if (profileSaving) return;

        try {
            setProfileSaving(true);
            const payload = {
                name: String(editForm.name || "").trim(),
                email: String(editForm.email || "").trim(),
                age: editForm.age === "" || editForm.age === null ? null : Number(editForm.age),
                gender: String(editForm.gender || "").trim(),
                contact_number: String(editForm.contact_number || "").trim(),
            };

            const res = await axios.put("/api/profile/basic-info", payload, {
                headers,
                withCredentials: true,
            });

            const newUser = res.data?.user || user;
            setUser(newUser);
            try {
                localStorage.setItem("user", JSON.stringify(newUser));
            } catch {
                // ignore
            }
            setProfileSettingsOpen(false);
        } catch {
            // keep modal open; errors are handled by backend and/or global handlers
        } finally {
            setProfileSaving(false);
        }
    };

    const changePassword = async () => {
        if (!token) {
            navigate("/login");
            return;
        }
        if (pwSaving) return;

        if (!String(pwForm.current_password || "").trim()) return;
        if (String(pwForm.password || "").length < 8) return;
        if (pwForm.password !== pwForm.password_confirmation) return;

        try {
            setPwSaving(true);
            await axios.put(
                "/api/account/password",
                {
                    current_password: pwForm.current_password,
                    password: pwForm.password,
                    password_confirmation: pwForm.password_confirmation,
                },
                { headers, withCredentials: true }
            );
            setAccountSettingsOpen(false);
        } catch {
            // keep modal open
        } finally {
            setPwSaving(false);
        }
    };

    const AppointmentsButton = (
        <button type="button" className="ad-btn ad-btn--appointments" onClick={goToAppointments}>
            <svg
                className="ad-btn__icon"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <path
                    d="M8 2v3M16 2v3M3.5 9h17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <path
                    d="M6.5 5h11A3.5 3.5 0 0 1 21 8.5v10A3.5 3.5 0 0 1 17.5 22h-11A3.5 3.5 0 0 1 3 18.5v-10A3.5 3.5 0 0 1 6.5 5Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
            </svg>
            Appointments
        </button>
    );

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

                <div className="ad-topbar-actions">
                    <div className="ad-notif" ref={notifMenuRef}>
                        <button
                            type="button"
                            className="ad-iconbtn"
                            title="Notifications"
                            aria-label="Notifications"
                            onClick={async () => {
                                const next = !notifOpen;
                                setNotifOpen(next);
                                if (next) await loadNotifications();
                            }}
                        >
                            🔔
                            <span className="ad-badge-dot" aria-label={`${notifs.length} items`}>
                                {notifs.length}
                            </span>
                        </button>

                        {notifOpen ? (
                            <div className="ad-menu" role="menu" style={{ right: 0, width: 380 }}>
                                <div className="ad-menu-head">
                                    <div style={{ fontWeight: 900 }}>Notifications</div>
                                    <button type="button" className="ad-link" onClick={() => setNotifOpen(false)}>
                                        Close
                                    </button>
                                </div>

                                {notifLoading ? (
                                    <div className="ad-muted" style={{ padding: "10px 12px" }}>
                                        Loading…
                                    </div>
                                ) : null}

                                {!notifLoading && !notifs.length ? (
                                    <div className="ad-muted" style={{ padding: "10px 12px" }}>
                                        No notifications yet.
                                    </div>
                                ) : null}

                                {!notifLoading && notifs.length ? (
                                    <div className="ad-menu-list">
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

                                            const whenIso = isScheduled ? n.scheduled_at : n.preferred_at;
                                            let when = "—";
                                            try {
                                                when = whenIso ? new Date(whenIso).toLocaleString() : "—";
                                            } catch {
                                                when = whenIso || "—";
                                            }

                                            return (
                                                <div
                                                    key={n.id}
                                                    className="ad-menu-item"
                                                    role="menuitem"
                                                    style={{ cursor: "default" }}
                                                >
                                                    <div style={{ fontWeight: 900 }}>{title}</div>
                                                    <div className="ad-muted" style={{ marginTop: 2 }}>
                                                        {n.session_type || "Advising Session"}
                                                    </div>
                                                    <div className="ad-muted" style={{ marginTop: 6 }}>
                                                        <strong>When:</strong> {when}
                                                    </div>
                                                    {(isScheduled || isCancelled || isCompleted) && n.location ? (
                                                        <div className="ad-muted" style={{ marginTop: 4 }}>
                                                            <strong>Where:</strong> {n.location}
                                                        </div>
                                                    ) : null}
                                                    {(isScheduled || isCancelled || isRejected || isCompleted) &&
                                                    n.advisor?.name ? (
                                                        <div className="ad-muted" style={{ marginTop: 4 }}>
                                                            <strong>Advisor:</strong> {n.advisor.name}
                                                        </div>
                                                    ) : null}
                                                    {(isScheduled || isCancelled || isRejected || isCompleted) &&
                                                    n.advisor_comment ? (
                                                        <div
                                                            className="ad-muted"
                                                            style={{ marginTop: 8, whiteSpace: "pre-wrap" }}
                                                        >
                                                            <strong>Note:</strong> {n.advisor_comment}
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
                        type="button"
                        className="ad-iconbtn"
                        title="School Calendar"
                        aria-label="Open school calendar"
                        onClick={() => setSchoolCalOpen(true)}
                    >
                        📅
                    </button>

                    <div className="ad-profile" ref={profileMenuRef}>
                        <button
                            type="button"
                            className="ad-profile-btn"
                            onClick={() => setProfileMenuOpen((v) => !v)}
                            aria-haspopup="menu"
                            aria-expanded={profileMenuOpen ? "true" : "false"}
                        >
                            {user?.avatar_url ? (
                                <img className="ad-avatar-img" src={user.avatar_url} alt="Profile avatar" />
                            ) : (
                                <span className="ad-avatar-fallback" aria-hidden="true">
                                    {String(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                                </span>
                            )}
                        </button>

                        {profileMenuOpen ? (
                            <div className="ad-profile-menu" role="menu">
                                <div className="ad-profile-head">
                                    <div className="ad-profile-name">{user?.name || "Advisor"}</div>
                                    <div className="ad-profile-email">{user?.email || ""}</div>
                                    <div className="ad-profile-role">Advisor</div>
                                </div>

                                <button
                                    type="button"
                                    className="ad-profile-item"
                                    role="menuitem"
                                    onClick={openProfileSettings}
                                >
                                    Profile Settings
                                </button>
                                <button
                                    type="button"
                                    className="ad-profile-item"
                                    role="menuitem"
                                    onClick={openAccountSettings}
                                >
                                    Account Settings
                                </button>

                                <div className="ad-profile-sep" />

                                <button
                                    type="button"
                                    className="ad-profile-item ad-profile-item--danger"
                                    role="menuitem"
                                    onClick={logout}
                                >
                                    Logout
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </header>

            {profileSettingsOpen ? (
                <div className="ad-modal-overlay" role="dialog" aria-modal="true">
                    <div className="ad-modal">
                        <div className="ad-modal-head">
                            <div>
                                <div className="ad-modal-title">Profile Settings</div>
                                <div className="ad-modal-sub">Update your basic profile details</div>
                            </div>
                            <button
                                type="button"
                                className="ad-modal-close"
                                onClick={() => setProfileSettingsOpen(false)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="ad-modal-body">
                            <div className="ad-profile-edit">
                                <div className="ad-profile-edit__avatar">
                                    {avatarPreview || user?.avatar_url ? (
                                        <img
                                            className="ad-profile-edit__avatarImg"
                                            src={avatarPreview || user.avatar_url}
                                            alt="Avatar"
                                        />
                                    ) : (
                                        <div className="ad-profile-edit__avatarFallback" aria-hidden="true">
                                            {String(editForm.name || editForm.email || user?.name || user?.email || "U")
                                                .slice(0, 1)
                                                .toUpperCase()}
                                        </div>
                                    )}

                                    <div className="ad-profile-edit__avatarActions">
                                        <button
                                            type="button"
                                            className="ad-btn ad-btn--ghost"
                                            onClick={openAvatarPicker}
                                            disabled={avatarSaving}
                                        >
                                            Change avatar
                                        </button>
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => onPickAvatar(e.target.files?.[0] || null)}
                                            style={{ display: "none" }}
                                        />

                                        {avatarFile ? (
                                            <button
                                                type="button"
                                                className="ad-btn"
                                                onClick={saveAvatar}
                                                disabled={avatarSaving}
                                            >
                                                {avatarSaving ? "Uploading…" : "Upload"}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>

                                <div className="ad-profile-edit__form">
                                    <label className="ad-field">
                                        <span>Name</span>
                                        <input
                                            value={editForm.name}
                                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                                        />
                                    </label>
                                    <label className="ad-field">
                                        <span>Email</span>
                                        <input
                                            value={editForm.email}
                                            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                                        />
                                    </label>
                                    <label className="ad-field">
                                        <span>Age</span>
                                        <input
                                            type="number"
                                            value={editForm.age}
                                            onChange={(e) => setEditForm((p) => ({ ...p, age: e.target.value }))}
                                        />
                                    </label>
                                    <label className="ad-field">
                                        <span>Gender</span>
                                        <input
                                            value={editForm.gender}
                                            onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                                        />
                                    </label>
                                    <label className="ad-field">
                                        <span>Contact</span>
                                        <input
                                            value={editForm.contact_number}
                                            onChange={(e) =>
                                                setEditForm((p) => ({ ...p, contact_number: e.target.value }))
                                            }
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="ad-modal-foot">
                                <button
                                    type="button"
                                    className="ad-btn ad-btn--ghost"
                                    onClick={() => setProfileSettingsOpen(false)}
                                    disabled={profileSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="ad-btn"
                                    onClick={saveProfile}
                                    disabled={profileSaving}
                                >
                                    {profileSaving ? "Saving…" : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {accountSettingsOpen ? (
                <div className="ad-modal-overlay" role="dialog" aria-modal="true">
                    <div className="ad-modal">
                        <div className="ad-modal-head">
                            <div>
                                <div className="ad-modal-title">Account Settings</div>
                                <div className="ad-modal-sub">Manage password and preferences</div>
                            </div>
                            <button
                                type="button"
                                className="ad-modal-close"
                                onClick={() => setAccountSettingsOpen(false)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="ad-modal-body">
                            <div className="ad-settings">
                                <div className="ad-settings-section">
                                    <div className="ad-settings-section__title">Appearance</div>
                                    <div className="ad-settings-row">
                                        <div>
                                            <div className="ad-settings-label">Dark mode</div>
                                            <div className="ad-muted">Switch to a darker theme.</div>
                                        </div>
                                        <label className="ad-switch" aria-label="Toggle dark mode">
                                            <input
                                                type="checkbox"
                                                checked={darkMode}
                                                onChange={(e) => setDarkMode(e.target.checked)}
                                            />
                                            <span className="ad-switch__track" aria-hidden="true">
                                                <span className="ad-switch__thumb" />
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div className="ad-settings-section">
                                    <div className="ad-settings-section__title">Security</div>
                                    <div className="ad-muted" style={{ marginTop: -6 }}>
                                        Change your password. Minimum 8 characters.
                                    </div>

                                    <div className="ad-form ad-form--stack" style={{ marginTop: 12 }}>
                                        <label className="ad-field">
                                            <span>Current password</span>
                                            <input
                                                type="password"
                                                value={pwForm.current_password}
                                                onChange={(e) =>
                                                    setPwForm((p) => ({
                                                        ...p,
                                                        current_password: e.target.value,
                                                    }))
                                                }
                                                autoComplete="current-password"
                                            />
                                        </label>

                                        <label className="ad-field">
                                            <span>New password</span>
                                            <input
                                                type="password"
                                                value={pwForm.password}
                                                onChange={(e) =>
                                                    setPwForm((p) => ({ ...p, password: e.target.value }))
                                                }
                                                autoComplete="new-password"
                                            />
                                        </label>

                                        <label className="ad-field">
                                            <span>Confirm new password</span>
                                            <input
                                                type="password"
                                                value={pwForm.password_confirmation}
                                                onChange={(e) =>
                                                    setPwForm((p) => ({
                                                        ...p,
                                                        password_confirmation: e.target.value,
                                                    }))
                                                }
                                                autoComplete="new-password"
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className="ad-modal-foot">
                                    <button
                                        type="button"
                                        className="ad-btn ad-btn--ghost"
                                        onClick={() => setAccountSettingsOpen(false)}
                                        disabled={pwSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="ad-btn"
                                        onClick={changePassword}
                                        disabled={pwSaving}
                                    >
                                        {pwSaving ? "Saving…" : "Save changes"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {schoolCalOpen ? (
                <div className="ad-modal-overlay" role="dialog" aria-modal="true">
                    <div className="ad-modal" style={{ width: "min(980px, 100%)" }}>
                        <div className="ad-modal-head">
                            <div />
                            <button
                                type="button"
                                className="ad-modal-close"
                                onClick={() => setSchoolCalOpen(false)}
                                aria-label="Close"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="ad-modal-body" style={{ padding: 0 }}>
                            <iframe
                                title="School calendar"
                                src="/school-calendar"
                                style={{ width: "100%", height: "min(72vh, 720px)", border: 0 }}
                            />
                        </div>

                        <div className="ad-modal-foot">
                            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setSchoolCalOpen(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <main className="ad-main">
                <div className="ad-hero">
                    <div className="ad-hero-bar">
                        <div className="ad-hero-text">
                            <h1>Welcome, Academic Advisor!</h1>
                            <p>Review and approve student course recommendations</p>
                        </div>

                        <div className="ad-hero-actions">{AppointmentsButton}</div>
                    </div>
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
