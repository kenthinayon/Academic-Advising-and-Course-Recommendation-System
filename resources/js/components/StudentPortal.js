import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function StudentPortal() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

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

                <button type="button" className="sp-logout" onClick={handleLogout}>
                    Logout
                </button>
            </header>

            <main className="sp-main">
                <h1 className="sp-welcome">Welcome, {fullName}!</h1>
                <p className="sp-caption">
                    Complete the following steps to get your personalized course recommendation
                </p>

                <section className="sp-progress">
                    <div className="sp-progress-head">
                        <div>
                            <div className="sp-progress-title">Your Progress</div>
                            <div className="sp-progress-meta">
                                {progressMetaText}
                            </div>
                        </div>
                    </div>
                    <div className="sp-bar" aria-hidden="true">
                        <div className="sp-bar-fill" style={{ width: `${completion.percent}%` }} />
                    </div>
                    <div className="sp-bar-labels">
                        <span>Getting Started</span>
                        <span>Finish Steps</span>
                    </div>
                </section>

                <section className="sp-grid">
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
            </main>
        </div>
    );
}
