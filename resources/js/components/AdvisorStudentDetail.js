import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const DEFAULT_DEGREES = [
    { code: "BSIT", name: "Bachelor of Science in Information Technology", track: "Computer Studies" },
    { code: "BSCS", name: "Bachelor of Science in Computer Science", track: "Computer Studies" },
    { code: "BSN", name: "Bachelor of Science in Nursing", track: "Nursing" },
    { code: "BSA", name: "Bachelor of Science in Accountancy", track: "Accountancy" },
    { code: "BSBA", name: "Bachelor of Science in Business Administration", track: "Business Administration" },
    { code: "BSCrim", name: "Bachelor of Science in Criminology", track: "Criminal Justice Education" },
    { code: "BEEd", name: "Bachelor of Elementary Education", track: "Teacher Education" },
    { code: "BSEd", name: "Bachelor of Secondary Education", track: "Teacher Education" },
    { code: "BSCE", name: "Bachelor of Science in Civil Engineering", track: "Engineering & Technology" },
    { code: "BSEE", name: "Bachelor of Science in Electrical Engineering", track: "Engineering & Technology" },
    { code: "BSME", name: "Bachelor of Science in Mechanical Engineering", track: "Engineering & Technology" },
    { code: "BSPSY", name: "Bachelor of Science in Psychology", track: "Arts & Sciences" },
    { code: "BAComm", name: "Bachelor of Arts in Communication", track: "Arts & Sciences" },
];

function normalizeDegree(item) {
    if (!item) return null;
    if (typeof item === "string") {
        const found = DEFAULT_DEGREES.find((d) => d.code === item);
        return found || { code: item, name: item, track: "" };
    }
    if (typeof item === "object") {
        return {
            code: item.code || item.program_code || item[0] || "",
            name: item.name || item.program_name || item[1] || "",
            track: item.track || item.category || "",
        };
    }
    return null;
}

export default function AdvisorStudentDetail() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);
    const role = useMemo(() => localStorage.getItem("userRole"), []);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [student, setStudent] = useState(null);
    const [profile, setProfile] = useState(null);
    const [attachments, setAttachments] = useState({ report_card_url: null, skill_attachment_urls: [] });

    const [assessment, setAssessment] = useState(null);
    const [breakdownSkillFilter, setBreakdownSkillFilter] = useState("all");

    const [status, setStatus] = useState("pending");
    const [comment, setComment] = useState("");
    const [degrees, setDegrees] = useState([]);

    const [interviewDate, setInterviewDate] = useState("");
    const [interviewTime, setInterviewTime] = useState("");
    const [interviewVenue, setInterviewVenue] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(null);

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
            navigate("/student");
        }
    }, [navigate, role, token]);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`/api/advisor/students/${userId}`, {
                    headers,
                    withCredentials: true,
                });

                setStudent(res.data?.student || null);
                setProfile(res.data?.profile || null);
                setAssessment(res.data?.assessment || null);
                setAttachments(res.data?.attachments || { report_card_url: null, skill_attachment_urls: [] });

                const p = res.data?.profile;
                const st = p?.advisor_status || "pending";
                const cm = p?.advisor_comment || "";

                const base = (p?.advisor_recommended_degrees?.length
                    ? p.advisor_recommended_degrees
                    : p?.recommended_degrees) || [];
                const norm = base.map(normalizeDegree).filter(Boolean);

                setStatus(st);
                setComment(cm);
                setDegrees(norm);

                const rawInterviewDate = p?.advisor_interview_date || "";
                const normInterviewDate = String(rawInterviewDate).includes("T")
                    ? String(rawInterviewDate).slice(0, 10)
                    : String(rawInterviewDate);
                setInterviewDate(normInterviewDate);
                setInterviewTime(p?.advisor_interview_time ? String(p.advisor_interview_time).slice(0, 5) : "");
                setInterviewVenue(p?.advisor_interview_venue || "");
            } catch (e) {
                setError(e?.response?.data?.message || "Failed to load student details.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [headers, userId]);

    const breakdown = useMemo(() => assessment?.breakdown || null, [assessment]);

    const breakdownSummary = useMemo(() => {
        if (!breakdown) return null;

        const readiness = breakdown.readiness || {};
        const part2 = breakdown.part2_categories || {};

        const skillLabels = {
            numerical_reasoning: "Numerical Reasoning",
            logical_reasoning: "Logical Reasoning",
            verbal_reasoning: "Verbal Reasoning",
        };

        const readinessCorrect = readiness?.by_skill?.correct || {};
        const readinessTotal = readiness?.by_skill?.total || {};
        const readinessRows = Object.keys(skillLabels).map((k) => ({
            key: k,
            label: skillLabels[k],
            correct: Number(readinessCorrect[k] || 0),
            total: Number(readinessTotal[k] || 0),
        }));

        const catCorrect = part2?.by_category?.correct || {};
        const catTotal = part2?.by_category?.total || {};
        const categories = Array.isArray(part2.selected_categories)
            ? part2.selected_categories
            : Object.keys(catTotal);
        const categoryRows = categories
            .slice()
            .sort()
            .map((c) => ({
                category: c,
                correct: Number(catCorrect[c] || 0),
                total: Number(catTotal[c] || 0),
            }));

        return {
            part2: {
                correctTotal: Number(part2.correct_total || 0),
                total: Number(part2.total || 0),
                rows: categoryRows,
            },
            readiness: {
                correctTotal: Number(readiness.correct_total || 0),
                total: Number(readiness.total || 0),
                rows: readinessRows,
            },
        };
    }, [breakdown]);

    const filteredBreakdownItems = useMemo(() => {
        const items = Array.isArray(breakdown?.items) ? breakdown.items : [];
        if (breakdownSkillFilter === "all") return items;

        return items.filter((it) => {
            if (it?.type !== "readiness") return true; // only filter readiness questions
            return String(it?.skill || "") === breakdownSkillFilter;
        });
    }, [breakdown, breakdownSkillFilter]);

    const addDegree = () => {
        setDegrees((d) => [...d, { code: "", name: "", track: "" }]);
    };

    const removeDegree = (idx) => {
        setDegrees((d) => d.filter((_, i) => i !== idx));
    };

    const setDegreeField = (idx, key) => (e) => {
        const value = e.target.value;
        setSuccess(null);
        setDegrees((d) => d.map((row, i) => (i === idx ? { ...row, [key]: value } : row)));
    };

    const onSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        const nextStatus = String(status || "pending").toLowerCase();
        if (nextStatus === "interview") {
            if (!String(interviewDate || "").trim()) {
                setSaving(false);
                setError("Interview date is required.");
                return;
            }
            if (!String(interviewTime || "").trim()) {
                setSaving(false);
                setError("Interview time is required.");
                return;
            }
            if (!String(interviewVenue || "").trim()) {
                setSaving(false);
                setError("Interview venue is required.");
                return;
            }
        }

        try {
            const cleaned = degrees
                .map((d) => ({
                    code: String(d.code || "").trim(),
                    name: String(d.name || "").trim(),
                    track: String(d.track || "").trim(),
                }))
                .filter((d) => d.code && d.name);

            const interviewDateClean = String(interviewDate || "").trim();
            const interviewTimeClean = String(interviewTime || "").trim();

            await axios.put(
                `/api/advisor/students/${userId}/recommendation`,
                {
                    advisor_status: status,
                    advisor_comment: comment,
                    advisor_recommended_degrees: cleaned,
                    ...(nextStatus === "interview"
                        ? {
                            advisor_interview_date: interviewDateClean.includes("T")
                                ? interviewDateClean.slice(0, 10)
                                : interviewDateClean,
                            advisor_interview_time: interviewTimeClean.length >= 5
                                ? interviewTimeClean.slice(0, 5)
                                : interviewTimeClean,
                            advisor_interview_venue: String(interviewVenue || "").trim(),
                        }
                        : {}),
                },
                { headers, withCredentials: true }
            );

            setSuccess(nextStatus === "interview" ? "Interview scheduled." : "Saved review successfully.");
        } catch (e) {
            const apiMessage = e?.response?.data?.message;
            const apiErrors = e?.response?.data?.errors;
            if (apiErrors && typeof apiErrors === "object") {
                const firstKey = Object.keys(apiErrors)[0];
                const firstMsg = apiErrors[firstKey]?.[0];
                setError(firstMsg || apiMessage || "Please check your inputs.");
            } else {
                setError(apiMessage || "Failed to save review.");
            }
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
                        <div className="ad-sub">Student Review</div>
                    </div>
                </div>

                <button type="button" className="ad-btn ad-btn--ghost" onClick={() => navigate("/advisor")}
                    aria-label="Back to Advisor Dashboard">
                    ← Back
                </button>
            </header>

            <main className="ad-main">
                {loading ? <div className="ad-muted">Loading…</div> : null}
                {error ? <div className="ad-alert ad-alert--error">{error}</div> : null}
                {success ? <div className="ad-alert ad-alert--success">{success}</div> : null}

                {!loading && student ? (
                    <>
                        <div className="ad-detail-head">
                            <div>
                                <h1 className="ad-h1">{student.name}</h1>
                                <div className="ad-muted">{student.email}</div>
                            </div>
                        </div>

                        <div className="ad-grid">
                            <section className="ad-panel">
                                <h2>Basic Information</h2>
                                <div className="ad-kv">
                                    <div>
                                        <div className="ad-k">Age</div>
                                        <div className="ad-v">{profile?.age ?? "—"}</div>
                                    </div>
                                    <div>
                                        <div className="ad-k">Gender</div>
                                        <div className="ad-v">{profile?.gender ?? "—"}</div>
                                    </div>
                                    <div>
                                        <div className="ad-k">High School</div>
                                        <div className="ad-v">{profile?.high_school ?? "—"}</div>
                                    </div>
                                    <div>
                                        <div className="ad-k">Contact</div>
                                        <div className="ad-v">{profile?.contact_number ?? "—"}</div>
                                    </div>
                                </div>
                            </section>

                            <section className="ad-panel">
                                <h2>Academic Credentials</h2>
                                <div className="ad-kv">
                                    <div>
                                        <div className="ad-k">Strand</div>
                                        <div className="ad-v">{profile?.shs_strand ?? "—"}</div>
                                    </div>
                                    <div>
                                        <div className="ad-k">General Average</div>
                                        <div className="ad-v">{profile?.shs_general_average ?? "—"}</div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 14 }}>
                                    <div className="ad-k">Skills &amp; Competencies</div>
                                    <div className="ad-v">
                                        {Array.isArray(profile?.skills) && profile.skills.length
                                            ? profile.skills.join(", ")
                                            : profile?.skills
                                                ? String(profile.skills)
                                                : "—"}
                                    </div>

                                    <div className="ad-k" style={{ marginTop: 10 }}>Career Interests</div>
                                    <div className="ad-v">{profile?.career_goals ?? "—"}</div>
                                </div>

                                {Array.isArray(profile?.subject_grades) && profile.subject_grades.length ? (
                                    <div className="ad-table">
                                        <div className="ad-table-head">
                                            <span>Subject</span>
                                            <span>Grade</span>
                                        </div>
                                        {profile.subject_grades.map((r, idx) => (
                                            <div key={idx} className="ad-table-row">
                                                <span>{r.subject}</span>
                                                <span>{r.grade}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="ad-muted" style={{ marginTop: 8 }}>
                                        No subject grades provided.
                                    </div>
                                )}

                                <div className="ad-attach">
                                    <div className="ad-k">Attachments</div>
                                    <div className="ad-v">
                                        {attachments?.report_card_url ? (
                                            <a href={attachments.report_card_url} target="_blank" rel="noreferrer">
                                                View report card
                                            </a>
                                        ) : (
                                            "No report card"
                                        )}
                                    </div>

                                    {attachments?.skill_attachment_urls?.length ? (
                                        <ul style={{ marginTop: 8, paddingLeft: 18 }}>
                                            {attachments.skill_attachment_urls.map((url, i) => (
                                                <li key={url + i}>
                                                    <a href={url} target="_blank" rel="noreferrer">
                                                        View certificate {i + 1}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="ad-muted" style={{ marginTop: 8 }}>
                                            No certificates uploaded.
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="ad-panel" style={{ gridColumn: "1 / -1" }}>
                                <h2>Assessment & Recommendation</h2>

                                <div className="ad-kv" style={{ marginBottom: 14 }}>
                                    <div>
                                        <div className="ad-k">System recommendation</div>
                                        <div className="ad-v">
                                            {Array.isArray(profile?.recommended_degrees) && profile.recommended_degrees.length
                                                ? ""
                                                : "No recommendation yet."}
                                            {Array.isArray(profile?.recommended_degrees) && profile.recommended_degrees.length ? (
                                                <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                                                    {profile.recommended_degrees.map((d, i) => {
                                                        const nd = normalizeDegree(d);
                                                        if (!nd) return null;
                                                        return (
                                                            <li key={nd.code + i}>
                                                                <strong>{nd.code}</strong> — {nd.name}
                                                                {nd.track ? ` (${nd.track})` : ""}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="ad-review">
                                    <div className="ad-review-row">
                                        <label className="ad-field">
                                            <span>Status</span>
                                            <select value={status} onChange={(e) => setStatus(e.target.value)}>
                                                <option value="pending">Pending</option>
                                                <option value="interview">Interview</option>
                                                <option value="approved">Approved</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </label>
                                    </div>

                                    {String(status || "").toLowerCase() === "interview" ? (
                                        <div className="ad-review-row" style={{ gridColumn: "1 / -1" }}>
                                            <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                                                <span>Interview schedule</span>
                                                <div className="ad-muted" style={{ marginTop: 4 }}>
                                                    Set the interview date, time, and venue before scheduling.
                                                </div>

                                                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                                    <label className="ad-field">
                                                        <span>Date</span>
                                                        <input
                                                            type="date"
                                                            value={interviewDate}
                                                            onChange={(e) => setInterviewDate(e.target.value)}
                                                        />
                                                    </label>
                                                    <label className="ad-field">
                                                        <span>Time</span>
                                                        <input
                                                            type="time"
                                                            value={interviewTime}
                                                            onChange={(e) => setInterviewTime(e.target.value)}
                                                        />
                                                    </label>
                                                    <label className="ad-field" style={{ gridColumn: "1 / -1" }}>
                                                        <span>Venue</span>
                                                        <input
                                                            type="text"
                                                            value={interviewVenue}
                                                            onChange={(e) => setInterviewVenue(e.target.value)}
                                                            placeholder="e.g., Advising Office, Room 203"
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}

                                    <div className="ad-review-row">
                                        <label className="ad-field" style={{ gridColumn: "1 / -1" }}>
                                            <span>Advisor comment</span>
                                            <textarea
                                                rows={4}
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                                placeholder="Write notes/comments for the student..."
                                            />
                                        </label>
                                    </div>

                                    <div className="ad-review-row" style={{ gridColumn: "1 / -1" }}>
                                        <div className="ad-field" style={{ gridColumn: "1 / -1" }}>
                                            <span>Advisor recommended degrees (editable)</span>
                                            <div className="ad-muted" style={{ marginTop: 4 }}>
                                                Add/edit the exact degree program(s) you approve.
                                            </div>

                                            <div className="ad-degree-list">
                                                {degrees.map((d, idx) => (
                                                    <div key={`${d.code}-${idx}`} className="ad-degree-row">
                                                        <input
                                                            value={d.code}
                                                            onChange={setDegreeField(idx, "code")}
                                                            placeholder="Code (e.g., BSIT)"
                                                        />
                                                        <input
                                                            value={d.name}
                                                            onChange={setDegreeField(idx, "name")}
                                                            placeholder="Program name"
                                                            style={{ flex: 1 }}
                                                        />
                                                        <input
                                                            value={d.track}
                                                            onChange={setDegreeField(idx, "track")}
                                                            placeholder="Track (optional)"
                                                            style={{ width: 220 }}
                                                        />
                                                        <button type="button" className="ad-btn ad-btn--danger" onClick={() => removeDegree(idx)}>
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}

                                                {!degrees.length ? (
                                                    <div className="ad-muted" style={{ marginTop: 8 }}>
                                                        No advisor degrees set yet.
                                                    </div>
                                                ) : null}
                                            </div>

                                            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
                                                <button type="button" className="ad-btn ad-btn--ghost" onClick={addDegree}>
                                                    + Add degree
                                                </button>
                                                <select
                                                    className="ad-preset"
                                                    defaultValue=""
                                                    onChange={(e) => {
                                                        const code = e.target.value;
                                                        if (!code) return;
                                                        const found = DEFAULT_DEGREES.find((d) => d.code === code);
                                                        if (found) setDegrees((prev) => [...prev, { ...found }]);
                                                        e.target.value = "";
                                                    }}
                                                >
                                                    <option value="">Quick add preset…</option>
                                                    {DEFAULT_DEGREES.map((d) => (
                                                        <option key={d.code} value={d.code}>
                                                            {d.code} — {d.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div style={{ marginTop: 14 }}>
                                                <button type="button" className="ad-btn" disabled={saving} onClick={onSave}>
                                                    {saving
                                                        ? "Saving…"
                                                        : String(status || "").toLowerCase() === "interview"
                                                            ? "Schedule Interview"
                                                            : "Save review"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {breakdownSummary ? (
                                    <div style={{ marginTop: 18 }}>
                                        <h3 style={{ marginTop: 0 }}>Part II Breakdown (Advisor)</h3>

                                        <div className="ad-kv" style={{ marginBottom: 14 }}>
                                            <div>
                                                <div className="ad-k">Category questions</div>
                                                <div className="ad-v">
                                                    {breakdownSummary.part2.correctTotal}/{breakdownSummary.part2.total}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="ad-k">Readiness (skill-based)</div>
                                                <div className="ad-v">
                                                    {breakdownSummary.readiness.correctTotal}/{breakdownSummary.readiness.total}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="ad-review-row" style={{ gridTemplateColumns: "1fr", marginBottom: 10 }}>
                                            <label className="ad-field" style={{ maxWidth: 360 }}>
                                                <span>Filter readiness skill</span>
                                                <select value={breakdownSkillFilter} onChange={(e) => setBreakdownSkillFilter(e.target.value)}>
                                                    <option value="all">All</option>
                                                    <option value="numerical_reasoning">numerical_reasoning</option>
                                                    <option value="logical_reasoning">logical_reasoning</option>
                                                    <option value="verbal_reasoning">verbal_reasoning</option>
                                                </select>
                                            </label>
                                        </div>

                                        <div className="ad-table" style={{ marginTop: 8 }}>
                                            <div className="ad-table-head" style={{ gridTemplateColumns: "140px 150px 1fr 120px 120px 120px" }}>
                                                <span>Question</span>
                                                <span>Type</span>
                                                <span>Category / Skill</span>
                                                <span>Student</span>
                                                <span>Correct</span>
                                                <span>Result</span>
                                            </div>

                                            {filteredBreakdownItems.map((it) => {
                                                const qid = String(it?.qid || "");
                                                const type = String(it?.type || "");
                                                const label = type === "readiness" ? String(it?.skill || "") : String(it?.category || "");
                                                const userAns = String(it?.user_answer || "—");
                                                const correctAns = String(it?.correct_answer || "—");
                                                const ok = Boolean(it?.is_correct);

                                                return (
                                                    <div
                                                        key={`${qid}-${type}`}
                                                        className="ad-table-row"
                                                        style={{ gridTemplateColumns: "140px 150px 1fr 120px 120px 120px" }}
                                                    >
                                                        <span>{qid}</span>
                                                        <span>{type}</span>
                                                        <span>{label || "—"}</span>
                                                        <span>{userAns}</span>
                                                        <span>{correctAns}</span>
                                                        <span>{ok ? "Correct" : "Wrong"}</span>
                                                    </div>
                                                );
                                            })}

                                            {!filteredBreakdownItems.length ? (
                                                <div className="ad-muted" style={{ marginTop: 8 }}>
                                                    No breakdown items available.
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="ad-muted" style={{ marginTop: 14 }}>
                                        No assessment breakdown available yet.
                                    </div>
                                )}
                            </section>
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
}
