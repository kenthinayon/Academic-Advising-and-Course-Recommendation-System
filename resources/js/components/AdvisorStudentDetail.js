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
    { code: "BA-PolSci", name: "Bachelor of Arts in Political Science", track: "Law" },
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

    const [status, setStatus] = useState("pending");
    const [comment, setComment] = useState("");
    const [degrees, setDegrees] = useState([]);
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
            } catch (e) {
                setError(e?.response?.data?.message || "Failed to load student details.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [headers, userId]);

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
        try {
            const cleaned = degrees
                .map((d) => ({
                    code: String(d.code || "").trim(),
                    name: String(d.name || "").trim(),
                    track: String(d.track || "").trim(),
                }))
                .filter((d) => d.code && d.name);

            await axios.put(
                `/api/advisor/students/${userId}/recommendation`,
                {
                    advisor_status: status,
                    advisor_comment: comment,
                    advisor_recommended_degrees: cleaned,
                },
                { headers, withCredentials: true }
            );

            setSuccess("Saved review successfully.");
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
                    <div className="ad-logo" aria-hidden="true">
                        <span />
                    </div>
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
                                                <option value="approved">Approved</option>
                                                <option value="rejected">Rejected</option>
                                            </select>
                                        </label>
                                    </div>

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
                                                    {saving ? "Saving…" : "Save review"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </>
                ) : null}
            </main>
        </div>
    );
}
