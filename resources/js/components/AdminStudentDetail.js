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

export default function AdminStudentDetail() {
    const { userId } = useParams();
    const navigate = useNavigate();

    const token = useMemo(() => localStorage.getItem("authToken"), []);
    const role = useMemo(() => localStorage.getItem("userRole"), []);
    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}`, Accept: "application/json" }),
        [token]
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [student, setStudent] = useState(null);
    const [profile, setProfile] = useState(null);
    const [attachments, setAttachments] = useState({
        report_card_url: null,
        skill_attachment_urls: [],
    });

    useEffect(() => {
        if (!token) {
            navigate("/login");
            return;
        }

        if (role !== "admin") {
            navigate(role === "advisor" ? "/advisor" : "/student");
            return;
        }

        let mounted = true;

        const load = async () => {
            setLoading(true);
            setError(null);

            try {
                // Use the admin endpoint so it works even if the admin is not an advisor.
                const res = await axios.get(`/api/admin/students/${userId}`, {
                    headers,
                    withCredentials: true,
                });

                if (!mounted) return;

                setStudent(res.data?.student || res.data?.user || res.data || null);
                setProfile(res.data?.profile || res.data?.student?.profile || null);
                setAttachments(res.data?.attachments || {
                    report_card_url: null,
                    skill_attachment_urls: [],
                });
            } catch (e) {
                if (!mounted) return;
                setError(e?.response?.data?.message || "Failed to load student details.");
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [headers, navigate, role, token, userId]);

    return (
        <div className="advisor">
            <header className="ad-topbar">
                <div className="ad-brand">
                    <img className="ad-logo" src="/images/logo.png" alt="URIOS-ADVise" />
                    <div>
                        <div className="ad-name">URIOS-ADVise</div>
                        <div className="ad-sub">Student Details (Admin)</div>
                    </div>
                </div>

                <button
                    type="button"
                    className="ad-btn ad-btn--ghost"
                    onClick={() => {
                        // If user navigated here from admin list, go back in history.
                        // Fallback to /admin to avoid wrongly sending them to advisor.
                        if (window.history.length > 1) navigate(-1);
                        else navigate("/admin");
                    }}
                    aria-label="Back to Admin Dashboard"
                >
                    {"<- Back"}
                </button>
            </header>

            <main className="ad-main">
                {loading ? <div className="ad-muted">Loading…</div> : null}
                {error ? <div className="ad-alert ad-alert--error">{error}</div> : null}

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
                                        <div className="ad-v">{profile?.shs_strand ?? profile?.strand ?? "—"}</div>
                                    </div>
                                    <div>
                                        <div className="ad-k">GWA</div>
                                        <div className="ad-v">
                                            {profile?.shs_general_average ?? profile?.gwa ?? "—"}
                                        </div>
                                    </div>
                                </div>

                                {Array.isArray(profile?.subject_grades) && profile.subject_grades.length ? (
                                    <div className="ad-table" style={{ marginTop: 12 }}>
                                        <div className="ad-table-head">
                                            <span>Subject</span>
                                            <span>Grade</span>
                                        </div>
                                        {profile.subject_grades.map((r, idx) => (
                                            <div key={idx} className="ad-table-row">
                                                <span>{r?.subject ?? "—"}</span>
                                                <span>{r?.grade ?? "—"}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="ad-muted" style={{ marginTop: 8 }}>
                                        No subject grades provided.
                                    </div>
                                )}

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

                                <div style={{ marginTop: 14 }}>
                                    <div className="ad-k" style={{ marginBottom: 6 }}>Attachments</div>

                                    <div className="ad-k">Report card</div>
                                    <div className="ad-v">
                                        {attachments?.report_card_url ? (
                                            <a href={attachments.report_card_url} target="_blank" rel="noreferrer">
                                                View report card
                                            </a>
                                        ) : (
                                            "No report card"
                                        )}
                                    </div>

                                    <div className="ad-k" style={{ marginTop: 10 }}>Certificates</div>
                                    {(attachments?.skill_attachment_urls || []).length ? (
                                        <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                                            {attachments.skill_attachment_urls.map((u, idx) => (
                                                <li key={idx}>
                                                    <a href={u} target="_blank" rel="noreferrer">
                                                        View certificate {idx + 1}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="ad-muted" style={{ marginTop: 6 }}>
                                            No certificates uploaded.
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="ad-grid" style={{ marginTop: 16 }}>
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
                                                    {profile.recommended_degrees
                                                        .map(normalizeDegree)
                                                        .filter(Boolean)
                                                        .map((nd, i) => (
                                                            <li key={(nd.code || "REC") + i}>
                                                                <strong>{nd.code}</strong> — {nd.name}
                                                                {nd.track ? ` (${nd.track})` : ""}
                                                            </li>
                                                        ))}
                                                </ul>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="ad-kv" style={{ marginBottom: 14 }}>
                                    <div>
                                        <div className="ad-k">Advisor recommendation</div>
                                        <div className="ad-v">
                                            {Array.isArray(profile?.advisor_recommended_degrees) && profile.advisor_recommended_degrees.length
                                                ? ""
                                                : "Not reviewed yet."}
                                            {Array.isArray(profile?.advisor_recommended_degrees) && profile.advisor_recommended_degrees.length ? (
                                                <ul style={{ marginTop: 6, marginBottom: 0, paddingLeft: 18 }}>
                                                    {profile.advisor_recommended_degrees
                                                        .map(normalizeDegree)
                                                        .filter(Boolean)
                                                        .map((nd, i) => (
                                                            <li key={(nd.code || "ADV") + i}>
                                                                <strong>{nd.code}</strong> — {nd.name}
                                                                {nd.track ? ` (${nd.track})` : ""}
                                                            </li>
                                                        ))}
                                                </ul>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>

                                <div className="ad-kv" style={{ marginBottom: 14 }}>
                                    <div>
                                        <div className="ad-k">Advisor status</div>
                                        <div className="ad-v">{profile?.advisor_status ?? "pending"}</div>
                                    </div>
                                    <div>
                                        <div className="ad-k">Advisor comment</div>
                                        <div className="ad-v">{profile?.advisor_comment ?? "—"}</div>
                                    </div>
                                </div>

                                {Array.isArray(profile?.recommended_top3) && profile.recommended_top3.length ? (
                                    <div>
                                        <div className="ad-k" style={{ marginBottom: 6 }}>Top 3 Categories</div>
                                        <ul style={{ marginTop: 0, marginBottom: 0, paddingLeft: 18 }}>
                                            {profile.recommended_top3.map((t, idx) => (
                                                <li key={idx}>
                                                    <strong>{t?.track ?? t?.name ?? "Category"}</strong>
                                                    {t?.score != null ? ` — ${t.score}` : ""}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="ad-muted">No assessment answers found.</div>
                                )}
                            </section>
                        </div>

                    </>
                ) : null}
            </main>
        </div>
    );
}
