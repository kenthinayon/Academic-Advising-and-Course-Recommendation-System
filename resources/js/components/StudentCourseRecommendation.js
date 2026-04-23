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

function hasBasicInfo(user, profile) {
    return Boolean(
        String(user?.name || "").trim() &&
            String(user?.email || "").trim() &&
            profile?.age != null &&
            String(profile?.gender || "").trim() &&
            String(profile?.high_school || "").trim() &&
            String(profile?.contact_number || "").trim()
    );
}

function hasAcademicCredentials(profile) {
    const subjectGrades = Array.isArray(profile?.subject_grades) ? profile.subject_grades : [];
    const hasAtLeastOneSubject = subjectGrades.some(
        (r) => String(r?.subject || "").trim() && r?.grade != null && r?.grade !== ""
    );

    const hasSkills = Array.isArray(profile?.skills) ? profile.skills.filter(Boolean).length > 0 : false;
    const ratings = profile?.program_interest_ratings;
    const hasRatings =
        ratings &&
        typeof ratings === "object" &&
        Object.values(ratings).some((v) => {
            const n = Number(v);
            return Number.isFinite(n) && n > 0;
        });

    return Boolean(
        String(profile?.shs_strand || "").trim() &&
            profile?.shs_general_average != null &&
            String(profile?.career_goals || "").trim() &&
            hasAtLeastOneSubject &&
            hasSkills &&
            hasRatings
    );
}

function hasAssessmentCompleted(profile, assessment) {
    const profileCompleted = Array.isArray(profile?.assessment_part1_selected) && profile.assessment_part1_selected.length > 0;
    const assessmentCompleted = Array.isArray(assessment?.recommended_top3) && assessment.recommended_top3.length > 0;
    return Boolean(profileCompleted || assessmentCompleted);
}

export default function StudentCourseRecommendation() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [assessment, setAssessment] = useState(null);
    const [locked, setLocked] = useState(false);

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
            setLocked(false);
            try {
                const res = await axios.get("/api/profile", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });
                const serverUser = res.data?.user || safeParse(storedUser) || null;
                const serverProfile = res.data?.profile || null;

                setUser(serverUser);
                setProfile(serverProfile);

                // Try server-side assessment if available
                let assessmentData = null;
                try {
                    const a = await axios.get("/api/assessment", {
                        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                        withCredentials: true,
                    });
                    assessmentData = a.data?.assessment || null;
                    setAssessment(assessmentData);
                } catch {
                    // fallback to localStorage
                    const local = safeParse(localStorage.getItem("assessmentResult") || "");
                    assessmentData = local || null;
                    setAssessment(assessmentData);
                }

                const unlocked =
                    hasBasicInfo(serverUser, serverProfile) &&
                    hasAcademicCredentials(serverProfile) &&
                    hasAssessmentCompleted(serverProfile, assessmentData);

                if (!unlocked) {
                    setLocked(true);
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
        // Prefer advisor's edited recommendation if present
        const advisorDegrees = profile?.advisor_recommended_degrees;
        if (Array.isArray(advisorDegrees) && advisorDegrees.length) {
            return advisorDegrees
                .slice(0, 3)
                .map((d, idx) => ({
                    rank: idx + 1,
                    code: d?.code || "",
                    name: d?.name || "",
                    category: d?.track || d?.category || "",
                }))
                .filter((d) => d.code || d.name);
        }

        // Next: system recommendation saved on the profile
        const systemDegrees = profile?.recommended_degrees;
        if (Array.isArray(systemDegrees) && systemDegrees.length) {
            return systemDegrees;
        }

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
    }, [assessment, profile]);

    const breakdown = useMemo(() => assessment?.breakdown || null, [assessment]);

    const studentSummary = useMemo(() => {
        if (!breakdown) return null;

        const readiness = breakdown.readiness || {};
        const readinessBySkill = readiness.by_skill || {};
        const readinessCorrect = readinessBySkill.correct || {};
        const readinessTotal = readinessBySkill.total || {};

        const part2 = breakdown.part2_categories || {};
        const byCategory = part2.by_category || {};
        const catCorrect = byCategory.correct || {};
        const catTotal = byCategory.total || {};

        const skillOrder = ["numerical_reasoning", "logical_reasoning", "verbal_reasoning"];
        const skillLabel = {
            numerical_reasoning: "Numerical Reasoning",
            logical_reasoning: "Logical Reasoning",
            verbal_reasoning: "Verbal Reasoning",
        };

        const readinessRows = skillOrder.map((k) => ({
            key: k,
            label: skillLabel[k] || k,
            correct: Number(readinessCorrect[k] || 0),
            total: Number(readinessTotal[k] || 0),
        }));

        const categories = Array.isArray(part2.selected_categories)
            ? part2.selected_categories
            : Object.keys(catTotal || {});

        const categoryRows = categories
            .slice()
            .sort()
            .map((c) => ({
                category: c,
                correct: Number(catCorrect[c] || 0),
                total: Number(catTotal[c] || 0),
            }));

        return {
            readiness: {
                correctTotal: Number(readiness.correct_total || 0),
                total: Number(readiness.total || 0),
                rows: readinessRows,
            },
            part2: {
                correctTotal: Number(part2.correct_total || 0),
                total: Number(part2.total || 0),
                rows: categoryRows,
            },
        };
    }, [breakdown]);

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

    const advisorStatus = useMemo(() => {
        const raw = String(profile?.advisor_status || "pending").toLowerCase();
        if (!profile) return "pending";
        return raw;
    }, [profile]);

    const advisorComment = useMemo(() => {
        const txt = String(profile?.advisor_comment || "").trim();
        return txt || null;
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

                            {locked ? (
                                <>
                                    <div className="aq-alert aq-alert--error">
                                        Course Recommendation is locked. Complete Basic Information, Academic Credentials, and Assessment Quiz first.
                                    </div>
                                    <div className="cr-actions">
                                        <button
                                            type="button"
                                            className="aq-primary"
                                            onClick={() => navigate("/student")}
                                        >
                                            Go to Dashboard
                                        </button>
                                    </div>
                                </>
                            ) : null}

                            {!locked ? (
                                <>

                            <div className="aq-head">
                                <div>
                                    <div className="aq-title">Course Recommendation</div>
                                    <div className="aq-sub">
                                        Based on your academic credentials and assessment results
                                    </div>
                                </div>
                            </div>

                            {(advisorStatus === "approved" || advisorStatus === "rejected" || advisorStatus === "interview") && (
                                <div className="cr-section" style={{ marginTop: 16 }}>
                                    <div className="cr-section-title">Advisor Feedback</div>
                                    <div className="cr-par">
                                        <strong>Status:</strong> {advisorStatus.charAt(0).toUpperCase() + advisorStatus.slice(1)}
                                    </div>
                                    {advisorComment ? (
                                        <div className="cr-par" style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>
                                            {advisorComment}
                                        </div>
                                    ) : (
                                        <div className="cr-par" style={{ marginTop: 4 }}>
                                            No comments from your advisor yet.
                                        </div>
                                    )}
                                </div>
                            )}

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

                                    {studentSummary ? (
                                        <div className="cr-section" style={{ marginTop: 14 }}>
                                            <div className="cr-section-title">Assessment Summary</div>

                                            <div className="cr-par" style={{ marginTop: 6 }}>
                                                <strong>Part II (Category Questions):</strong> {studentSummary.part2.correctTotal}/{studentSummary.part2.total}
                                            </div>
                                            {studentSummary.part2.rows?.length ? (
                                                <div className="cr-table" style={{ marginTop: 8 }}>
                                                    <div className="cr-tr cr-th">
                                                        <div>Category</div>
                                                        <div>Correct</div>
                                                    </div>
                                                    {studentSummary.part2.rows.map((r) => (
                                                        <div key={r.category} className="cr-tr">
                                                            <div>{r.category}</div>
                                                            <div>
                                                                {r.correct}/{r.total}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="aq-muted" style={{ marginTop: 6 }}>
                                                    No Part II category breakdown available.
                                                </div>
                                            )}

                                            <div className="cr-par" style={{ marginTop: 12 }}>
                                                <strong>Readiness (Skill-Based):</strong> {studentSummary.readiness.correctTotal}/{studentSummary.readiness.total}
                                            </div>
                                            <div className="cr-table" style={{ marginTop: 8 }}>
                                                <div className="cr-tr cr-th">
                                                    <div>Skill</div>
                                                    <div>Correct</div>
                                                </div>
                                                {studentSummary.readiness.rows.map((r) => (
                                                    <div key={r.key} className="cr-tr">
                                                        <div>{r.label}</div>
                                                        <div>
                                                            {r.correct}/{r.total}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}

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
                            ) : null}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
