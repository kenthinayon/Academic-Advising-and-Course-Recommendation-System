import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const PART1_STATEMENTS = [
    "I enjoy working with numbers and financial records.",
    "I like studying human behavior and social issues.",
    "I am interested in starting or managing a business.",
    "I enjoy coding, troubleshooting, or learning new technologies.",
    "I am interested in law enforcement and public safety.",
    "I enjoy building, designing, or fixing machines.",
    "I like caring for sick or injured people.",
    "I enjoy explaining lessons to others.",
    "I am detail-oriented and organized.",
    "I enjoy research and reading academic materials.",
    "I am confident leading a team or group.",
    "I enjoy solving logical or technical problems.",
    "I value discipline and following procedures.",
    "I am patient and compassionate.",
    "I am comfortable speaking in front of many people.",
];

const PART2_QUESTIONS = [
    {
        id: 1,
        prompt: "What is the basic accounting equation?",
        options: {
            A: "Assets = Liabilities – Capital",
            B: "Assets = Liabilities + Owner’s Equity",
            C: "Income = Expenses + Assets",
            D: "Profit = Assets – Liabilities",
        },
        correct: "B",
        category: "Accountancy",
    },
    {
        id: 2,
        prompt: "Which branch of science studies human behavior?",
        options: {
            A: "Biology",
            B: "Sociology",
            C: "Psychology",
            D: "Chemistry",
        },
        correct: "C",
        category: "Arts & Sciences",
    },
    {
        id: 3,
        prompt: "What does ROI mean in business?",
        options: {
            A: "Rate of Income",
            B: "Return on Investment",
            C: "Revenue of Industry",
            D: "Risk of Investment",
        },
        correct: "B",
        category: "Business Administration",
    },
    {
        id: 4,
        prompt: "What does CPU stand for in computer systems?",
        options: {
            A: "Central Process Unit",
            B: "Computer Personal Unit",
            C: "Central Processing Unit",
            D: "Control Program Utility",
        },
        correct: "C",
        category: "Computer Studies",
    },
    {
        id: 5,
        prompt: "Which agency is responsible for enforcing laws?",
        options: {
            A: "Department of Health",
            B: "Police Department",
            C: "Department of Education",
            D: "Securities Commission",
        },
        correct: "B",
        category: "Criminal Justice Education",
    },
    {
        id: 6,
        prompt: "Which formula is used to compute speed?",
        options: {
            A: "Speed = Distance × Time",
            B: "Speed = Distance ÷ Time",
            C: "Speed = Time ÷ Distance",
            D: "Speed = Mass × Acceleration",
        },
        correct: "B",
        category: "Engineering & Technology",
    },
    {
        id: 7,
        prompt: "What is the normal body temperature in Celsius?",
        options: {
            A: "35°C",
            B: "36.5–37.5°C",
            C: "38–39°C",
            D: "40°C",
        },
        correct: "B",
        category: "Nursing",
    },
    {
        id: 8,
        prompt: "What is the main purpose of a lesson plan?",
        options: {
            A: "To discipline students",
            B: "To organize teaching and learning",
            C: "To increase school profit",
            D: "To record attendance",
        },
        correct: "B",
        category: "Teacher Education",
    },
];

const PART1_CATEGORY_MAP = {
    Accountancy: [1, 9],
    "Arts & Sciences": [2, 10],
    "Business Administration": [3, 11],
    "Computer Studies": [4, 12],
    "Criminal Justice Education": [5, 13],
    "Engineering & Technology": [6, 12],
    Nursing: [7, 14],
    "Teacher Education": [8, 15],
};

const CATEGORY_WEIGHTS = {
    part1: 1,
    part2: 2,
};

function computeScores(part1Selected, part2Answers) {
    const scores = Object.keys(PART1_CATEGORY_MAP).reduce((acc, k) => {
        acc[k] = 0;
        return acc;
    }, {});

    // Part 1 scoring: count checks mapped to each category
    Object.entries(PART1_CATEGORY_MAP).forEach(([category, numbers]) => {
        const count = numbers.reduce((c, n) => c + (part1Selected.includes(n) ? 1 : 0), 0);
        scores[category] += count * CATEGORY_WEIGHTS.part1;
    });

    // Part 2 scoring: +2 for each correct answer, applied to that question's category
    PART2_QUESTIONS.forEach((q) => {
        const user = (part2Answers[q.id] || "").toUpperCase();
        if (user && user === q.correct) {
            scores[q.category] += 1 * CATEGORY_WEIGHTS.part2;
        }
    });

    return scores;
}

function topN(scores, n = 3) {
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([category, score], idx) => ({
            rank: idx + 1,
            category,
            score,
        }));
}

export default function StudentAssessmentQuiz() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [step, setStep] = useState(0); // 0 = Part I, 1..8 = Part II Q index, 9 = Review

    const [part1Selected, setPart1Selected] = useState([]); // array of statement numbers (1-based)
    const [part2Answers, setPart2Answers] = useState({}); // { [questionId]: 'A'|'B'|'C'|'D' }

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser || !token) {
            navigate("/login");
            return;
        }

        const fetchAssessment = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/assessment", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });

                const assessment = res.data?.assessment;
                if (assessment) {
                    setPart1Selected(Array.isArray(assessment.part1_selected) ? assessment.part1_selected : []);
                    setPart2Answers(assessment.part2_answers && typeof assessment.part2_answers === "object" ? assessment.part2_answers : {});
                }
            } catch (e) {
                // If endpoint isn't ready yet, don't hard-fail; the page can still be used.
            } finally {
                setLoading(false);
            }
        };

        fetchAssessment();
    }, [navigate, token]);

    const stepsTotal = 1 + PART2_QUESTIONS.length + 1;
    const currentLabel = useMemo(() => {
        if (step === 0) return "Part I – Personal Interest & Skills";
        if (step >= 1 && step <= PART2_QUESTIONS.length) {
            return `Part II – General Knowledge (Question ${step} of ${PART2_QUESTIONS.length})`;
        }
        return "Review";
    }, [step]);

    const progress = useMemo(() => {
        const pct = Math.round(((step + 1) / stepsTotal) * 100);
        return Math.max(0, Math.min(100, pct));
    }, [step, stepsTotal]);

    const scores = useMemo(() => computeScores(part1Selected, part2Answers), [part1Selected, part2Answers]);
    const top3 = useMemo(() => topN(scores, 3), [scores]);

    const togglePart1 = (num) => {
        setSuccess(null);
        setError(null);
        setPart1Selected((prev) => (prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]));
    };

    const setPart2 = (questionId, letter) => {
        setSuccess(null);
        setError(null);
        setPart2Answers((prev) => ({ ...prev, [questionId]: letter }));
    };

    const canGoNext = useMemo(() => {
        if (step === 0) return part1Selected.length > 0;
        if (step >= 1 && step <= PART2_QUESTIONS.length) {
            const q = PART2_QUESTIONS[step - 1];
            return Boolean(part2Answers[q.id]);
        }
        return true;
    }, [step, part1Selected, part2Answers]);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                part1_selected: part1Selected.slice().sort((a, b) => a - b),
                part2_answers: part2Answers,
            };

            await axios.put("/api/assessment", payload, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
            });

            setSuccess("Saved! Your assessment is complete.");
            // Also store computed results so recommendation page can use it instantly.
            localStorage.setItem(
                "assessmentResult",
                JSON.stringify({ scores, top3, savedAt: new Date().toISOString() })
            );
        } catch (e) {
            const msg = e?.response?.data?.message || "Failed to save assessment.";
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const gotoPrev = () => setStep((s) => Math.max(0, s - 1));
    const gotoNext = () => setStep((s) => Math.min(stepsTotal - 1, s + 1));

    const renderBody = () => {
        if (step === 0) {
            return (
                <>
                    <div className="aq-help">
                        Instruction: Check (✔) ALL statements that describe you.
                    </div>

                    <div className="aq-checklist">
                        {PART1_STATEMENTS.map((s, idx) => {
                            const num = idx + 1;
                            const checked = part1Selected.includes(num);
                            return (
                                <label key={num} className={`aq-check ${checked ? "aq-check--on" : ""}`}>
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => togglePart1(num)}
                                    />
                                    <span className="aq-num">{num}.</span>
                                    <span className="aq-text">{s}</span>
                                </label>
                            );
                        })}
                    </div>
                </>
            );
        }

        if (step >= 1 && step <= PART2_QUESTIONS.length) {
            const q = PART2_QUESTIONS[step - 1];
            const chosen = (part2Answers[q.id] || "").toUpperCase();

            return (
                <>
                    <div className="aq-qhead">
                        <div className="aq-qtitle">{q.prompt}</div>
                        <div className="aq-qmeta">Choose the correct answer.</div>
                    </div>

                    <div className="aq-options">
                        {Object.entries(q.options).map(([letter, text]) => (
                            <label
                                key={letter}
                                className={`aq-option ${chosen === letter ? "aq-option--on" : ""}`}
                            >
                                <input
                                    type="radio"
                                    name={`q-${q.id}`}
                                    checked={chosen === letter}
                                    onChange={() => setPart2(q.id, letter)}
                                />
                                <span className="aq-letter">{letter}</span>
                                <span className="aq-opttext">{text}</span>
                            </label>
                        ))}
                    </div>
                </>
            );
        }

        return (
            <>
                <div className="aq-review">
                    <div className="aq-review-title">Your top matches (based on your answers)</div>
                    <div className="aq-top3">
                        {top3.map((t) => (
                            <div key={t.category} className="aq-top-card">
                                <div className="aq-top-rank">#{t.rank}</div>
                                <div className="aq-top-name">{t.category}</div>
                                <div className="aq-top-score">Score: {t.score}</div>
                            </div>
                        ))}
                    </div>

                    <div className="aq-muted">
                        Tip: Click “Save Assessment” then proceed to Course Recommendation.
                    </div>
                </div>
            </>
        );
    };

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
                            <div className="aq-head">
                                <div>
                                    <div className="aq-title">General Assessment</div>
                                    <div className="aq-sub">{currentLabel}</div>
                                </div>
                            </div>

                            <div className="aq-bar" aria-hidden="true">
                                <div className="aq-bar-fill" style={{ width: `${progress}%` }} />
                            </div>

                            {error ? <div className="aq-alert aq-alert--error">{error}</div> : null}
                            {success ? <div className="aq-alert aq-alert--success">{success}</div> : null}

                            {renderBody()}

                            <div className="aq-actions">
                                <button
                                    type="button"
                                    className="aq-secondary"
                                    onClick={gotoPrev}
                                    disabled={step === 0 || saving}
                                >
                                    ← Previous
                                </button>

                                <div className="aq-actions-right">
                                    {step === stepsTotal - 1 ? (
                                        <>
                                            <button
                                                type="button"
                                                className="aq-secondary"
                                                onClick={handleSave}
                                                disabled={saving}
                                            >
                                                {saving ? "Saving…" : "Save Assessment"}
                                            </button>
                                            <button
                                                type="button"
                                                className="aq-primary"
                                                onClick={() => navigate("/student/course-recommendation")}
                                                disabled={saving}
                                            >
                                                Next →
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className="aq-primary"
                                            onClick={gotoNext}
                                            disabled={!canGoNext || saving}
                                        >
                                            Next →
                                        </button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
