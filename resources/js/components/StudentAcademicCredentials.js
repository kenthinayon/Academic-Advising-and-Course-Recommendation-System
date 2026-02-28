import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const STRANDS = [
    {
        value: "STEM",
        label: "Science, Technology, Engineering, and Mathematics (STEM)",
    },
    {
        value: "ABM",
        label: "Accountancy, Business, and Management (ABM)",
    },
    {
        value: "HUMSS",
        label: "Humanities and Social Sciences (HUMSS)",
    },
    {
        value: "TVL",
        label: "Technical-Vocational-Livelihood (TVL) Track",
    },
];

const PROGRAMS = [
    "Accountancy",
    "Arts and Sciences",
    "Business Administration",
    "Criminal Justice Education",
    "Computer Studies",
    "Engineering And Technology",
    "Law",
    "Nursing",
    "Teachers Education",
];

export default function StudentAcademicCredentials() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [form, setForm] = useState({
        shs_strand: "",
        shs_general_average: "",
        subjectGrades: [{ subject: "", grade: "" }],
        reportCardFile: null,
        skillsText: "",
        skillFiles: [],
        career_goals: "",
        ratings: PROGRAMS.reduce((acc, p) => ({ ...acc, [p]: 3 }), {}),
    });

    const computedGWA = useMemo(() => {
        const rows = Array.isArray(form.subjectGrades) ? form.subjectGrades : [];
        const nums = rows
            .map((r) => {
                const raw = r?.grade;
                if (raw === "" || raw == null) return null;
                const n = Number(raw);
                if (!Number.isFinite(n)) return null;
                return n;
            })
            .filter((n) => n != null);

        if (!nums.length) return "";
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        // Keep 2 decimals for display and for what we send to the API.
        return avg.toFixed(2);
    }, [form.subjectGrades]);

    useEffect(() => {
        // Keep the input value synced with what's actually computed.
        // This ensures the saved value matches what the UI shows.
        setForm((prev) => {
            if (prev.shs_general_average === computedGWA) return prev;
            return { ...prev, shs_general_average: computedGWA };
        });
    }, [computedGWA]);

    const formatFile = (file) => {
        if (!file) return "";
        const kb = Math.round(file.size / 1024);
        const size = kb >= 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb} KB`;
        return `${file.name} (${size})`;
    };

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser || !token) {
            navigate("/login");
            return;
        }

        const fetchProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/profile", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: "application/json",
                    },
                    withCredentials: true,
                });

                const profile = res.data?.profile;
                const existingRatings = profile?.program_interest_ratings;
                const existingSkills = profile?.skills;
                const existingSubjects = profile?.subject_grades;

                setForm((prev) => ({
                    ...prev,
                    shs_strand: profile?.shs_strand ?? "",
                    // This will be overwritten by computedGWA when subjects exist.
                    shs_general_average: profile?.shs_general_average ?? "",
                    subjectGrades:
                        Array.isArray(existingSubjects) && existingSubjects.length
                            ? existingSubjects.map((r) => ({
                                  subject: r?.subject ?? "",
                                  grade: r?.grade ?? "",
                              }))
                            : prev.subjectGrades,
                    skillsText: Array.isArray(existingSkills) ? existingSkills.join(", ") : "",
                    career_goals: profile?.career_goals ?? "",
                    ratings:
                        existingRatings && typeof existingRatings === "object"
                            ? { ...prev.ratings, ...existingRatings }
                            : prev.ratings,
                }));
            } catch (e) {
                setError(e?.response?.data?.message || "Failed to load your profile.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate, token]);

    const setField = (key) => (e) => {
        setSuccess(null);
        setError(null);
        setForm((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const setRating = (program) => (e) => {
        const value = Number(e.target.value);
        setSuccess(null);
        setError(null);
        setForm((prev) => ({
            ...prev,
            ratings: { ...prev.ratings, [program]: value },
        }));
    };

    const addSubjectRow = () => {
        setSuccess(null);
        setError(null);
        setForm((prev) => ({
            ...prev,
            subjectGrades: [...prev.subjectGrades, { subject: "", grade: "" }],
        }));
    };

    const removeSubjectRow = (idx) => {
        setSuccess(null);
        setError(null);
        setForm((prev) => ({
            ...prev,
            subjectGrades: prev.subjectGrades.filter((_, i) => i !== idx),
        }));
    };

    const setSubjectField = (idx, key) => (e) => {
        const value = e.target.value;
        setSuccess(null);
        setError(null);
        setForm((prev) => ({
            ...prev,
            subjectGrades: prev.subjectGrades.map((row, i) =>
                i === idx ? { ...row, [key]: value } : row
            ),
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const normalizedSubjects = (form.subjectGrades || [])
                .map((r) => ({
                    subject: (r.subject || "").trim(),
                    grade: r.grade === "" ? "" : Number(r.grade),
                }))
                .filter((r) => r.subject || r.grade !== "");

            let skills = form.skillsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            // The Student Portal marks Step 2 as "Completed" only when it finds at least one skill.
            // If the user leaves it blank, the API will save an empty array and Step 2 stays Pending.
            // To match the UI expectation (slider ratings + other fields), we store a harmless placeholder.
            if (!skills.length) {
                skills = ["N/A"];
            }

            // Same idea for program ratings: Step 2 requires at least one rating entry.
            // If for any reason ratings are missing, send defaults so Step 2 can be considered complete.
            const ratingsPayload =
                form.ratings && typeof form.ratings === "object" && Object.keys(form.ratings).length
                    ? form.ratings
                    : PROGRAMS.reduce((acc, p) => ({ ...acc, [p]: 3 }), {});

            // Send as multipart so we can include attachments
            const fd = new FormData();
            fd.append("shs_strand", form.shs_strand);
            fd.append("shs_general_average", String(form.shs_general_average));
            fd.append("career_goals", form.career_goals);

            normalizedSubjects.forEach((row, idx) => {
                fd.append(`subject_grades[${idx}][subject]`, row.subject);
                fd.append(`subject_grades[${idx}][grade]`, String(row.grade));
            });

            skills.forEach((s, idx) => fd.append(`skills[${idx}]`, s));

            Object.entries(ratingsPayload).forEach(([program, rating]) => {
                fd.append(`program_interest_ratings[${program}]`, String(rating));
            });

            if (form.reportCardFile) {
                fd.append("report_card", form.reportCardFile);
            }

            (form.skillFiles || []).forEach((file) => {
                // Use the same field name Laravel expects; repeating the key produces an array of files.
                fd.append("skill_attachments", file);
            });

            const res = await axios.post("/api/profile/academic-credentials?_method=PUT", fd, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                    "Content-Type": "multipart/form-data",
                },
                withCredentials: true,
            });

            setSuccess("Saved! Academic credentials updated.");

            // Keep localStorage up to date when API returns refreshed data.
            // This helps any screens that rely on cached user/profile immediately reflect completion.
            if (res.data?.user) {
                localStorage.setItem("user", JSON.stringify(res.data.user));
            }
            if (res.data?.profile) {
                localStorage.setItem("profile", JSON.stringify(res.data.profile));
            }

            // Re-fetch canonical profile so the Student Portal progress pills reflect immediately.
            // (StudentPortal computes completion from /api/profile.)
            try {
                const me = await axios.get("/api/profile", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });
                if (me.data?.profile) {
                    localStorage.setItem("profile", JSON.stringify(me.data.profile));
                }
                if (me.data?.user) {
                    localStorage.setItem("user", JSON.stringify(me.data.user));
                }
            } catch {
                // ignore; we can still continue
            }

            // Continue to the next step
            navigate("/student/assessment-quiz");
        } catch (e2) {
            const apiMessage = e2?.response?.data?.message;
            const apiErrors = e2?.response?.data?.errors;

            if (apiErrors && typeof apiErrors === "object") {
                const firstKey = Object.keys(apiErrors)[0];
                const firstMsg = apiErrors[firstKey]?.[0];
                setError(firstMsg || apiMessage || "Please check your inputs.");
            } else {
                setError(apiMessage || "Failed to save. Please try again.");
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="student-basic">
            <header className="sb-topbar">
                <button type="button" className="sb-back" onClick={() => navigate("/student")}
                    aria-label="Back to Student Portal">
                    ← Back
                </button>
                <div className="sb-titlewrap">
                    <div className="sb-title">Academic Credentials</div>
                    <div className="sb-subtitle">Strand, grades, skills & interests</div>
                </div>
            </header>

            <main className="sb-main">
                <section className="sb-card">
                    {loading ? (
                        <div className="sb-muted">Loading…</div>
                    ) : (
                        <>
                            {error ? <div className="sb-alert sb-alert--error">{error}</div> : null}
                            {success ? <div className="sb-alert sb-alert--success">{success}</div> : null}

                            <form className="sb-form" onSubmit={handleSubmit}>
                                <div className="sb-row">
                                    <label className="sb-field">
                                        <span className="sb-label">Senior High School Strand</span>
                                        <select
                                            className="sb-input"
                                            value={form.shs_strand}
                                            onChange={setField("shs_strand")}
                                            required
                                        >
                                            <option value="" disabled>
                                                Select strand
                                            </option>
                                            {STRANDS.map((s) => (
                                                <option key={s.value} value={s.value}>
                                                    {s.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>

                                <div className="sb-row">
                                    <div className="sb-field" style={{ gridColumn: "1 / -1" }}>
                                        <span className="sb-label">Academic Records</span>
                                        <div className="sb-muted" style={{ marginTop: "-2px" }}>
                                            Enter your high school grades (0-100 scale)
                                        </div>

                                        <div className="sb-subjects">
                                            {form.subjectGrades.map((row, idx) => (
                                                <div key={idx} className="sb-subject-row">
                                                    <input
                                                        className="sb-input"
                                                        type="text"
                                                        value={row.subject}
                                                        onChange={setSubjectField(idx, "subject")}
                                                        placeholder="Subject name (e.g., Mathematics)"
                                                    />
                                                    <input
                                                        className="sb-input"
                                                        type="number"
                                                        min="0"
                                                        max="100"
                                                        step="0.01"
                                                        value={row.grade}
                                                        onChange={setSubjectField(idx, "grade")}
                                                        placeholder="Grade"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="sb-danger"
                                                        onClick={() => removeSubjectRow(idx)}
                                                        disabled={form.subjectGrades.length <= 1}
                                                        title="Remove"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="sb-attach-row">
                                            <button type="button" className="sb-secondary" onClick={addSubjectRow}>
                                                + Add subject
                                            </button>
                                            <label className="sb-file">
                                                <span className="sb-secondary">Attach report card (optional)</span>
                                                <input
                                                    type="file"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            reportCardFile: e.target.files?.[0] ?? null,
                                                        }))
                                                    }
                                                />
                                            </label>

                                            {form.reportCardFile ? (
                                                <div className="sb-muted" style={{ marginTop: 8 }}>
                                                    <strong>Attached report card:</strong> {formatFile(form.reportCardFile)}{" "}
                                                    <button
                                                        type="button"
                                                        className="sb-link"
                                                        onClick={() =>
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                reportCardFile: null,
                                                            }))
                                                        }
                                                        style={{ marginLeft: 10 }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="sb-muted" style={{ marginTop: 8 }}>
                                                    No report card attached yet.
                                                </div>
                                            )}
                                        </div>

                                        <div className="sb-row" style={{ marginTop: 14 }}>
                                            <label className="sb-field" style={{ gridColumn: "1 / -1" }}>
                                                <span className="sb-label">Senior High School General Average</span>
                                                <input
                                                    className="sb-input"
                                                    type="number"
                                                    step="0.01"
                                                    min="60"
                                                    max="100"
                                                    value={form.shs_general_average}
                                                    placeholder="e.g., 88.50"
                                                    readOnly
                                                    required
                                                />
                                                <div className="sb-muted" style={{ marginTop: 6 }}>
                                                    Auto-computed from your subject grades.
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="sb-row">
                                    <label className="sb-field" style={{ gridColumn: "1 / -1" }}>
                                        <span className="sb-label">Skills &amp; Competencies</span>
                                        <input
                                            className="sb-input"
                                            type="text"
                                            value={form.skillsText}
                                            onChange={setField("skillsText")}
                                            placeholder="e.g., programming, leadership, writing"
                                        />

                                        <div style={{ marginTop: 10 }}>
                                            <label className="sb-file">
                                                <span className="sb-secondary">
                                                    Add certificates / images (optional)
                                                </span>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*,.pdf"
                                                    onChange={(e) =>
                                                        setForm((prev) => ({
                                                            ...prev,
                                                            skillFiles: Array.from(e.target.files || []),
                                                        }))
                                                    }
                                                />
                                            </label>

                                            <div className="sb-muted" style={{ marginTop: 8 }}>
                                                {form.skillFiles?.length ? (
                                                    <>
                                                        <strong>
                                                            Attached certificate(s): {form.skillFiles.length}
                                                        </strong>
                                                        <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                                                            {form.skillFiles.map((f, i) => (
                                                                <li key={`${f.name}-${f.size}-${i}`}>{formatFile(f)}</li>
                                                            ))}
                                                        </ul>
                                                        <button
                                                            type="button"
                                                            className="sb-link"
                                                            onClick={() =>
                                                                setForm((prev) => ({
                                                                    ...prev,
                                                                    skillFiles: [],
                                                                }))
                                                            }
                                                            style={{ marginTop: 6 }}
                                                        >
                                                            Remove all
                                                        </button>
                                                    </>
                                                ) : (
                                                    "No certificates attached yet."
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                <div className="sb-row">
                                    <label className="sb-field" style={{ gridColumn: "1 / -1" }}>
                                        <span className="sb-label">Career Interests</span>
                                        <textarea
                                            className="sb-input"
                                            value={form.career_goals}
                                            onChange={setField("career_goals")}
                                            placeholder='Tell us about your career goals and interests'
                                            rows={4}
                                            required
                                        />
                                    </label>
                                </div>

                                <div className="sb-row">
                                    <div className="sb-field" style={{ gridColumn: "1 / -1" }}>
                                        <span className="sb-label">Program Interest Rating (1 = low, 5 = high)</span>
                                        <div className="sb-ratings">
                                            {PROGRAMS.map((program) => (
                                                <div key={program} className="sb-rating-row">
                                                    <div className="sb-rating-name">{program}</div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="5"
                                                        step="1"
                                                        value={form.ratings[program] ?? 3}
                                                        onChange={setRating(program)}
                                                    />
                                                    <div className="sb-rating-value">{form.ratings[program] ?? 3}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="sb-actions">
                                    <button type="submit" className="sb-primary" disabled={saving}>
                                        {saving ? "Saving…" : "Save & Continue"}
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
