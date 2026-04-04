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

const PART2_BANK = {
    Accountancy: [
        {
            id: "acc_1",
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
            id: "acc_2",
            prompt: "In double-entry bookkeeping, every transaction affects:",
            options: {
                A: "Only one account",
                B: "At least two accounts",
                C: "Only revenue accounts",
                D: "Only cash accounts",
            },
            correct: "B",
            category: "Accountancy",
        },
        {
            id: "acc_3",
            prompt: "A trial balance is used mainly to:",
            options: {
                A: "Determine company profit automatically",
                B: "Check if total debits equal total credits",
                C: "Record daily transactions",
                D: "Create marketing plans",
            },
            correct: "B",
            category: "Accountancy",
        },
        {
            id: "acc_4",
            prompt: "Which financial statement shows a company’s financial position on a specific date?",
            options: {
                A: "Income statement",
                B: "Balance sheet",
                C: "Cash flow statement",
                D: "Statement of changes in equity only",
            },
            correct: "B",
            category: "Accountancy",
        },
        {
            id: "acc_5",
            prompt: "Revenue is generally recognized when it is:",
            options: {
                A: "Planned",
                B: "Earned",
                C: "Promised",
                D: "Discussed with the customer",
            },
            correct: "B",
            category: "Accountancy",
        },
    ],
    "Arts & Sciences": [
        {
            id: "arts_1",
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
            id: "arts_2",
            prompt: "In research, the variable you change/control is the:",
            options: {
                A: "Dependent variable",
                B: "Independent variable",
                C: "Random variable",
                D: "Confounding variable",
            },
            correct: "B",
            category: "Arts & Sciences",
        },
        {
            id: "arts_3",
            prompt: "Correlation means two variables:",
            options: {
                A: "Prove cause and effect",
                B: "Are unrelated",
                C: "Move together in some pattern",
                D: "Are always equal",
            },
            correct: "C",
            category: "Arts & Sciences",
        },
        {
            id: "arts_4",
            prompt: "A hypothesis is best described as:",
            options: {
                A: "A final conclusion",
                B: "A testable prediction",
                C: "A personal opinion",
                D: "A proven fact",
            },
            correct: "B",
            category: "Arts & Sciences",
        },
        {
            id: "arts_5",
            prompt: "Which is an example of a qualitative method?",
            options: {
                A: "Measuring height in cm",
                B: "Counting survey scores",
                C: "Interviewing participants for themes",
                D: "Computing averages",
            },
            correct: "C",
            category: "Arts & Sciences",
        },
    ],
    "Business Administration": [
        {
            id: "bus_1",
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
            id: "bus_2",
            prompt: "The 4Ps of marketing include Product, Price, Place, and:",
            options: {
                A: "People",
                B: "Promotion",
                C: "Profit",
                D: "Process only",
            },
            correct: "B",
            category: "Business Administration",
        },
        {
            id: "bus_3",
            prompt: "A SWOT analysis stands for:",
            options: {
                A: "Sales, Work, Output, Time",
                B: "Strengths, Weaknesses, Opportunities, Threats",
                C: "Strategy, Work, Operations, Targets",
                D: "Stock, Wealth, Options, Taxes",
            },
            correct: "B",
            category: "Business Administration",
        },
        {
            id: "bus_4",
            prompt: "Break-even point is when:",
            options: {
                A: "Revenue is zero",
                B: "Profit is maximum",
                C: "Total revenue equals total costs",
                D: "Costs stop increasing",
            },
            correct: "C",
            category: "Business Administration",
        },
        {
            id: "bus_5",
            prompt: "Supply and demand most directly influences:",
            options: {
                A: "Office layout",
                B: "Market price",
                C: "Employee attendance",
                D: "Product color",
            },
            correct: "B",
            category: "Business Administration",
        },
    ],
    "Computer Studies": [
        {
            id: "cs_1",
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
            id: "cs_2",
            prompt: "An algorithm is:",
            options: {
                A: "A computer brand",
                B: "A step-by-step procedure to solve a problem",
                C: "A type of monitor",
                D: "An internet provider",
            },
            correct: "B",
            category: "Computer Studies",
        },
        {
            id: "cs_3",
            prompt: "Which is an example of an operating system?",
            options: {
                A: "Google",
                B: "Windows",
                C: "HTML",
                D: "Router",
            },
            correct: "B",
            category: "Computer Studies",
        },
        {
            id: "cs_4",
            prompt: "Which command is used to retrieve data in SQL?",
            options: {
                A: "INSERT",
                B: "DELETE",
                C: "SELECT",
                D: "DROP",
            },
            correct: "C",
            category: "Computer Studies",
        },
        {
            id: "cs_5",
            prompt: "An IP address is used to:",
            options: {
                A: "Identify a device on a network",
                B: "Print documents",
                C: "Charge a battery",
                D: "Increase CPU speed",
            },
            correct: "A",
            category: "Computer Studies",
        },
    ],
    "Criminal Justice Education": [
        {
            id: "cje_1",
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
            id: "cje_2",
            prompt: "Presumption of innocence means the accused is:",
            options: {
                A: "Always guilty",
                B: "Considered innocent until proven guilty",
                C: "Punished immediately",
                D: "Detained without rights",
            },
            correct: "B",
            category: "Criminal Justice Education",
        },
        {
            id: "cje_3",
            prompt: "Chain of custody is important to:",
            options: {
                A: "Make trials faster",
                B: "Keep evidence properly tracked and unaltered",
                C: "Increase police budget",
                D: "Replace witnesses",
            },
            correct: "B",
            category: "Criminal Justice Education",
        },
        {
            id: "cje_4",
            prompt: "Which is an example of physical evidence?",
            options: {
                A: "Rumors",
                B: "A fingerprint",
                C: "An opinion",
                D: "A promise",
            },
            correct: "B",
            category: "Criminal Justice Education",
        },
        {
            id: "cje_5",
            prompt: "A warrant is generally required to:",
            options: {
                A: "File a complaint",
                B: "Conduct certain searches legally",
                C: "Write a report",
                D: "Give a warning",
            },
            correct: "B",
            category: "Criminal Justice Education",
        },
    ],
    "Engineering & Technology": [
        {
            id: "eng_1",
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
            id: "eng_2",
            prompt: "Ohm’s Law is:",
            options: {
                A: "P = VI",
                B: "V = IR",
                C: "F = ma",
                D: "E = mc²",
            },
            correct: "B",
            category: "Engineering & Technology",
        },
        {
            id: "eng_3",
            prompt: "Force is calculated by:",
            options: {
                A: "F = m + a",
                B: "F = ma",
                C: "F = m/a",
                D: "F = a/m",
            },
            correct: "B",
            category: "Engineering & Technology",
        },
        {
            id: "eng_4",
            prompt: "The SI unit of power is:",
            options: {
                A: "Newton",
                B: "Watt",
                C: "Joule",
                D: "Pascal",
            },
            correct: "B",
            category: "Engineering & Technology",
        },
        {
            id: "eng_5",
            prompt: "Engineering design most often balances:",
            options: {
                A: "Cost, safety, and performance",
                B: "Luck and speed",
                C: "Opinion only",
                D: "Color and style only",
            },
            correct: "A",
            category: "Engineering & Technology",
        },
    ],
    Nursing: [
        {
            id: "nurs_1",
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
            id: "nurs_2",
            prompt: "A normal adult resting heart rate is typically:",
            options: {
                A: "20–40 bpm",
                B: "60–100 bpm",
                C: "120–160 bpm",
                D: "180–220 bpm",
            },
            correct: "B",
            category: "Nursing",
        },
        {
            id: "nurs_3",
            prompt: "The most effective way to prevent infection spread in healthcare is:",
            options: {
                A: "Wearing perfume",
                B: "Hand hygiene",
                C: "Speaking quietly",
                D: "Drinking vitamins",
            },
            correct: "B",
            category: "Nursing",
        },
        {
            id: "nurs_4",
            prompt: "Blood pressure measures the force of blood against:",
            options: {
                A: "Bones",
                B: "Artery walls",
                C: "Skin pores",
                D: "Hair follicles",
            },
            correct: "B",
            category: "Nursing",
        },
        {
            id: "nurs_5",
            prompt: "A fever is commonly considered at or above:",
            options: {
                A: "36.0°C",
                B: "37.0°C",
                C: "38.0°C",
                D: "39.9°C always",
            },
            correct: "C",
            category: "Nursing",
        },
    ],
    "Teacher Education": [
        {
            id: "teach_1",
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
        {
            id: "teach_2",
            prompt: "Formative assessment is mainly used to:",
            options: {
                A: "Grade final performance only",
                B: "Monitor learning and give feedback during learning",
                C: "Replace teaching",
                D: "Punish students",
            },
            correct: "B",
            category: "Teacher Education",
        },
        {
            id: "teach_3",
            prompt: "Summative assessment is usually:",
            options: {
                A: "A final evaluation at the end of a unit/term",
                B: "A daily warm-up",
                C: "A classroom rule",
                D: "A seating plan",
            },
            correct: "A",
            category: "Teacher Education",
        },
        {
            id: "teach_4",
            prompt: "Bloom’s taxonomy is commonly used to:",
            options: {
                A: "Classify school uniforms",
                B: "Design learning objectives by cognitive level",
                C: "Compute grades automatically",
                D: "Manage school finances",
            },
            correct: "B",
            category: "Teacher Education",
        },
        {
            id: "teach_5",
            prompt: "Classroom management primarily aims to:",
            options: {
                A: "Keep students silent always",
                B: "Create a safe, organized learning environment",
                C: "Reduce homework",
                D: "Avoid lesson planning",
            },
            correct: "B",
            category: "Teacher Education",
        },
    ],
};

const READINESS_QUESTIONS = [
    {
        id: "gen_1",
        prompt: "What number comes next in the sequence: 2, 4, 8, 16, __ ?",
        options: {
            A: "18",
            B: "20",
            C: "24",
            D: "32",
        },
        correct: "D",
    },
    {
        id: "gen_2",
        prompt: "A student scored 45 out of 60. What percent is this?",
        options: {
            A: "70%",
            B: "75%",
            C: "80%",
            D: "85%",
        },
        correct: "B",
    },
    {
        id: "gen_3",
        prompt: "Which sentence best states the main purpose of a conclusion in a report?",
        options: {
            A: "To introduce new evidence",
            B: "To summarize findings and state final points clearly",
            C: "To list all references used",
            D: "To repeat the title in different words",
        },
        correct: "B",
    },
    {
        id: "gen_4",
        prompt: "Enrollment increased from 200 to 260 students. What is the increase?",
        options: {
            A: "30",
            B: "50",
            C: "60",
            D: "80",
        },
        correct: "C",
    },
    {
        id: "gen_5",
        prompt: "If it takes 3 hours to travel 150 km, what is the average speed?",
        options: {
            A: "40 km/h",
            B: "45 km/h",
            C: "50 km/h",
            D: "55 km/h",
        },
        correct: "C",
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

const CATEGORY_ORDER = Object.keys(PART1_CATEGORY_MAP);

function buildPart2QuestionIndex() {
    const idx = {};
    Object.values(PART2_BANK).forEach((list) => {
        (Array.isArray(list) ? list : []).forEach((q) => {
            if (!q?.id) return;
            idx[String(q.id)] = q;
        });
    });
    return idx;
}

const PART2_INDEX = buildPart2QuestionIndex();

function deriveTopCategoriesFromPart1(part1Selected, n = 3) {
    const selected = Array.isArray(part1Selected) ? part1Selected : [];
    const raw = Object.entries(PART1_CATEGORY_MAP).map(([category, nums]) => {
        const count = (Array.isArray(nums) ? nums : []).reduce((c, num) => c + (selected.includes(num) ? 1 : 0), 0);
        return { category, score: count };
    });

    raw.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // stable tie-breaker
        return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    });

    return raw.slice(0, n).map((x) => x.category);
}

function categoriesFromPart2Answers(part2Answers) {
    const ans = part2Answers && typeof part2Answers === "object" ? part2Answers : {};
    const seen = new Set();
    const out = [];
    Object.keys(ans).forEach((qid) => {
        const q = PART2_INDEX[String(qid)];
        const cat = q?.category;
        if (!cat || seen.has(cat)) return;
        seen.add(cat);
        out.push(cat);
    });
    return out;
}

function buildPart2Questions(categories) {
    const cats = Array.isArray(categories) ? categories : [];
    const out = [];
    cats.forEach((cat) => {
        const list = PART2_BANK[cat];
        if (Array.isArray(list) && list.length) out.push(...list);
    });
    // Always include general readiness questions (affect all categories equally)
    return out.concat(READINESS_QUESTIONS);
}

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
    const answers = part2Answers && typeof part2Answers === "object" ? part2Answers : {};
    Object.entries(answers).forEach(([qid, ans]) => {
        // General readiness: +1 to ALL categories when correct
        const rq = READINESS_QUESTIONS.find((x) => String(x.id) === String(qid));
        if (rq) {
            const user = String(ans || "").toUpperCase();
            if (user && user === rq.correct) {
                Object.keys(scores).forEach((cat) => {
                    scores[cat] += 1;
                });
            }
            return;
        }

        const q = PART2_INDEX[String(qid)];
        if (!q) return;
        const user = String(ans || "").toUpperCase();
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

    const [part1Selected, setPart1Selected] = useState([]); // array of statement numbers (1-based)
    const [part2Answers, setPart2Answers] = useState({}); // { [questionId]: 'A'|'B'|'C'|'D' }
    const [part2Categories, setPart2Categories] = useState([]);

    const effectivePart2Categories = useMemo(() => {
        const stored = Array.isArray(part2Categories) ? part2Categories.filter(Boolean) : [];
        if (stored.length) return stored.slice(0, 3);
        return deriveTopCategoriesFromPart1(part1Selected, 3);
    }, [part1Selected, part2Categories]);

    const part2Questions = useMemo(() => buildPart2Questions(effectivePart2Categories), [effectivePart2Categories]);

    const stepsTotal = 1 + part2Questions.length + 1;
    const reviewStepIndex = stepsTotal - 1;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [assessmentSaved, setAssessmentSaved] = useState(false);

    const [step, setStep] = useState(0); // 0 = Part I, 1..N = Part II Q index, Review = last

    const isLockedToReview = assessmentSaved;

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

                    // Try to reconstruct which categories were used for Part II.
                    // Prefer the categories implied by the stored question IDs.
                    const catsFromAnswers = categoriesFromPart2Answers(assessment.part2_answers);
                    if (catsFromAnswers.length) {
                        setPart2Categories(catsFromAnswers.slice(0, 3));
                    }

                    const hasSavedRecommendation = Array.isArray(assessment.recommended_top3) && assessment.recommended_top3.length > 0;
                    setAssessmentSaved(hasSavedRecommendation);

                    if (hasSavedRecommendation) {
                        setStep(reviewStepIndex);
                    }
                }
            } catch (e) {
                // If endpoint isn't ready yet, don't hard-fail; the page can still be used.
            } finally {
                setLoading(false);
            }
        };

        fetchAssessment();
    }, [navigate, token]);

    const currentLabel = useMemo(() => {
        if (step === 0) return "Part I – Personal Interest & Skills";
        if (step >= 1 && step <= part2Questions.length) {
            return `Part II – General Knowledge (Question ${step} of ${part2Questions.length})`;
        }
        return "Review";
    }, [part2Questions.length, step]);

    useEffect(() => {
        // If the assessment is already saved, keep the user on Review until they retake.
        if (assessmentSaved) {
            setStep(stepsTotal - 1);
        }
    }, [assessmentSaved, stepsTotal]);

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
        if (step >= 1 && step <= part2Questions.length) {
            const q = part2Questions[step - 1];
            return Boolean(part2Answers[q.id]);
        }
        return true;
    }, [step, part1Selected, part2Answers, part2Questions]);

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
            setAssessmentSaved(true);
            setStep(reviewStepIndex);
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

    const handleRetakeQuiz = () => {
        const confirmed = window.confirm("This will clear your current quiz answers on this page. Continue?");
        if (!confirmed) return;

        const clearServer = async () => {
            try {
                await axios.delete("/api/assessment", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });
            } catch (e) {
                const msg = e?.response?.data?.message || "Couldn’t reset your assessment. Please try again.";
                setError(msg);
                return;
            }

            setPart1Selected([]);
            setPart2Answers({});
            setPart2Categories([]);
            setAssessmentSaved(false);
            setSuccess(null);
            setError(null);
            setStep(0);

            try {
                localStorage.removeItem("assessmentResult");
            } catch {
                // ignore
            }
        };

        clearServer();
    };

    const gotoPrev = () => setStep((s) => Math.max(0, s - 1));

    const gotoNext = () => {
        // When transitioning out of Part I, lock in the Part II categories
        // so the question set stays consistent unless the user goes back.
        if (step === 0) {
            const nextCats = deriveTopCategoriesFromPart1(part1Selected, 3);
            setPart2Categories(nextCats);

            // Prune any old answers that no longer belong to the new question set
            const nextIds = new Set(buildPart2Questions(nextCats).map((q) => String(q.id)));
            setPart2Answers((prev) => {
                const cur = prev && typeof prev === "object" ? prev : {};
                const next = {};
                Object.entries(cur).forEach(([qid, ans]) => {
                    if (nextIds.has(String(qid))) next[qid] = ans;
                });
                return next;
            });

            setStep(1);
            return;
        }

        setStep((s) => Math.min(stepsTotal - 1, s + 1));
    };

    const safeGotoPrev = () => {
        if (isLockedToReview) return;
        gotoPrev();
    };

    const safeGotoNext = () => {
        if (isLockedToReview) return;
        gotoNext();
    };

    const renderReview = () => {
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

                    <div className="aq-actions" style={{ marginTop: 12 }}>
                        <button
                            type="button"
                            className="aq-secondary"
                            onClick={handleRetakeQuiz}
                            disabled={saving}
                        >
                            Retake Quiz
                        </button>
                    </div>
                </div>
            </>
        );
    };

    const renderBody = () => {
        if (isLockedToReview) {
            return renderReview();
        }

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

        if (step >= 1 && step <= part2Questions.length) {
            const q = part2Questions[step - 1];
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

        return renderReview();
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
                                    onClick={safeGotoPrev}
                                    disabled={step === 0 || saving || isLockedToReview}
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
                                                disabled={saving || !assessmentSaved}
                                                title={!assessmentSaved ? "Save Assessment first to continue" : "Proceed to Course Recommendation"}
                                            >
                                                Next →
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            className="aq-primary"
                                            onClick={safeGotoNext}
                                            disabled={!canGoNext || saving || isLockedToReview}
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
