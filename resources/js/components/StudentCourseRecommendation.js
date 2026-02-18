import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

function safeParse(json) {
    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

function formatFileName(path) {
    if (!path) return "";
    const parts = String(path).split("/");
    return parts[parts.length - 1] || path;
}

export default function StudentCourseRecommendation() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [assessment, setAssessment] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser || !token) {
            navigate("/login");
            return;
        }
        setUser(safeParse(storedUser));

        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/profile", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });
                setProfile(res.data?.profile || null);

                // Try server-side assessment if available
                try {
                    const a = await axios.get("/api/assessment", {
                        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                        withCredentials: true,
                    });
                    setAssessment(a.data?.assessment || null);
                } catch {
                    // fallback to localStorage
                    const local = safeParse(localStorage.getItem("assessmentResult") || "");
                    setAssessment(local || null);
                }
            } catch (e) {
                setError(e?.response?.data?.message || "Failed to load your data.");
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [navigate, token]);

    const top3 = useMemo(() => {
        const degrees = assessment?.recommended_degrees;
        if (Array.isArray(degrees) && degrees.length) return degrees;

        const maybe = assessment?.top3;
        if (Array.isArray(maybe) && maybe.length) return maybe;

        const scores = assessment?.scores;
        if (scores && typeof scores === "object") {
            return Object.entries(scores)
                .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                .slice(0, 3)
                .map(([category, score], idx) => ({ rank: idx + 1, category, score }));
        }

        // If server response is { assessment: { recommended_top3: [...] } }
        const serverTop = assessment?.recommended_top3;
        if (Array.isArray(serverTop) && serverTop.length) return serverTop;

        return [];
    }, [assessment]);

    const isDegreeList = useMemo(() => {
        const first = Array.isArray(top3) ? top3[0] : null;
        return Boolean(first && (first.code || first.name));
    }, [top3]);

    const reportCardUrl = useMemo(() => {
        if (!profile?.report_card_path) return null;
        return `/storage/${profile.report_card_path}`;
    }, [profile]);

    const skillAttachmentUrls = useMemo(() => {
        const arr = Array.isArray(profile?.skill_attachments) ? profile.skill_attachments : [];
        return arr.map((p) => ({ path: p, url: `/storage/${p}`, name: formatFileName(p) }));
    }, [profile]);

    return (
        <div className="assessment-quiz">
            <header className="aq-topbar">
                <button type="button" className="aq-back" onClick={() => navigate("/student")}
                    aria-label="Back to Dashboard">
                    ← Back to Dashboard
                </button>
            </header>

            <main className="aq-main">
                <section className="aq-card">
                    {loading ? (
                        <div className="aq-muted">Loading…</div>
                    ) : (
                        <>
                            {error ? <div className="aq-alert aq-alert--error">{error}</div> : null}

                            <div className="aq-head">
                                <div>
                                    <div className="aq-title">Course Recommendation</div>
                                    <div className="aq-sub">
                                        Based on your academic credentials and assessment results
                                    </div>
                                </div>
                            </div>

                            <div className="cr-grid">
                                <div className="cr-panel">
                                    <div className="cr-panel-title">Top 3 Suggested Courses</div>

                                    {top3.length ? (
                                        <div className="aq-top3">
                                            {top3.map((t) => (
                                                <div key={`${t.category || "cat"}-${t.code || t.rank || "x"}`} className="aq-top-card">
                                                    <div className="aq-top-rank">#{t.rank}</div>
                                                    <div className="aq-top-name">
                                                        {isDegreeList
                                                            ? `${t.code} — ${t.name}`
                                                            : t.category}
                                                    </div>
                                                    <div className="aq-top-score">
                                                        {isDegreeList ? `Track: ${t.category}` : `Score: ${t.score}`}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="aq-muted">
                                            No assessment result found yet. Please complete the Assessment Quiz first.
                                        </div>
                                    )}

                                    <div className="cr-actions">
                                        <button
                                            type="button"
                                            className="aq-primary"
                                            onClick={() => navigate("/student/assessment-quiz")}
                                        >
                                            Go to Assessment Quiz
                                        </button>
                                    </div>
                                </div>

                                <div className="cr-panel">
                                    <div className="cr-panel-title">Your Saved Credentials</div>

                                    <div className="cr-kv">
                                        <div>
                                            <div className="cr-k">Name</div>
                                            <div className="cr-v">{user?.name || "—"}</div>
                                        </div>
                                        <div>
                                            <div className="cr-k">Email</div>
                                            <div className="cr-v">{user?.email || "—"}</div>
                                        </div>
                                        <div>
                                            <div className="cr-k">SHS Strand</div>
                                            <div className="cr-v">{profile?.shs_strand || "—"}</div>
                                        </div>
                                        <div>
                                            <div className="cr-k">SHS General Average</div>
                                            <div className="cr-v">{profile?.shs_general_average ?? "—"}</div>
                                        </div>
                                    </div>

                                    <div className="cr-section">
                                        <div className="cr-section-title">Academic Records</div>
                                        {Array.isArray(profile?.subject_grades) && profile.subject_grades.length ? (
                                            <div className="cr-table">
                                                <div className="cr-tr cr-th">
                                                    <div>Subject</div>
                                                    <div>Grade</div>
                                                </div>
                                                {profile.subject_grades.map((r, idx) => (
                                                    <div key={idx} className="cr-tr">
                                                        <div>{r?.subject || "—"}</div>
                                                        <div>{r?.grade ?? "—"}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="aq-muted">No subjects saved yet.</div>
                                        )}
                                    </div>

                                    <div className="cr-section">
                                        <div className="cr-section-title">Skills</div>
                                        {Array.isArray(profile?.skills) && profile.skills.length ? (
                                            <div className="cr-tags">
                                                {profile.skills.map((s, idx) => (
                                                    <span key={idx} className="cr-tag">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="aq-muted">No skills saved yet.</div>
                                        )}
                                    </div>

                                    <div className="cr-section">
                                        <div className="cr-section-title">Career Goals</div>
                                        <div className="cr-par">
                                            {profile?.career_goals ? profile.career_goals : "—"}
                                        </div>
                                    </div>

                                    <div className="cr-section">
                                        <div className="cr-section-title">Attachments</div>

                                        <div className="cr-attach">
                                            <div className="cr-attach-row">
                                                <div className="cr-k">Report Card</div>
                                                {reportCardUrl ? (
                                                    <a className="cr-link" href={reportCardUrl} target="_blank" rel="noreferrer">
                                                        View ({formatFileName(profile.report_card_path)})
                                                    </a>
                                                ) : (
                                                    <div className="cr-v">—</div>
                                                )}
                                            </div>

                                            <div className="cr-attach-row">
                                                <div className="cr-k">Skill Certificates</div>
                                                {skillAttachmentUrls.length ? (
                                                    <div className="cr-links">
                                                        {skillAttachmentUrls.map((f) => (
                                                            <a
                                                                key={f.path}
                                                                className="cr-link"
                                                                href={f.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                            >
                                                                {f.name}
                                                            </a>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="cr-v">—</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
