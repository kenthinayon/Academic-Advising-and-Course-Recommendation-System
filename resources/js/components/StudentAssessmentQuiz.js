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
            prompt: "You have ₱1,200 and you spend ₱450. How much money is left?",
            options: {
                A: "₱650",
                B: "₱750",
                C: "₱850",
                D: "₱950",
            },
            correct: "B",
            category: "Accountancy",
        },
        {
            id: "acc_2",
            prompt: "A student lists expenses of ₱120, ₱80, and ₱50. What is the total expense?",
            options: {
                A: "₱200",
                B: "₱250",
                C: "₱260",
                D: "₱280",
            },
            correct: "B",
            category: "Accountancy",
        },
        {
            id: "acc_3",
            prompt: "A store gives a 20% discount on an item that costs ₱500. What is the discounted price?",
            options: {
                A: "₱350",
                B: "₱400",
                C: "₱450",
                D: "₱480",
            },
            correct: "B",
            category: "Accountancy",
        },
        {
            id: "acc_4",
            prompt: "A small business earned ₱2,000 and spent ₱1,500. What is the net gain?",
            options: {
                A: "₱300",
                B: "₱500",
                C: "₱1,500",
                D: "₱3,500",
            },
            correct: "B",
            category: "Accountancy",
        },
        {
            id: "acc_5",
            prompt: "A budget is ₱10,000 and rent is 50% of the budget. How much is allocated for rent?",
            options: {
                A: "₱2,500",
                B: "₱5,000",
                C: "₱6,000",
                D: "₱7,500",
            },
            correct: "B",
            category: "Accountancy",
        },
    ],
    "Arts & Sciences": [
        {
            id: "arts_1",
            prompt: "Which is an example of a testable research question?",
            options: {
                A: "Why is life unfair?",
                B: "Is music better than silence?",
                C: "Does fertilizer A increase plant height after two weeks?",
                D: "What is the best color?",
            },
            correct: "C",
            category: "Arts & Sciences",
        },
        {
            id: "arts_2",
            prompt: "You change the amount of light a plant receives and you measure its height. What is the independent variable?",
            options: {
                A: "Plant height",
                B: "Amount of light",
                C: "Type of plant",
                D: "Time of day",
            },
            correct: "B",
            category: "Arts & Sciences",
        },
        {
            id: "arts_3",
            prompt: "When two variables tend to increase together, this is best described as:",
            options: {
                A: "Cause and effect",
                B: "No relationship",
                C: "A positive association",
                D: "Always equal values",
            },
            correct: "C",
            category: "Arts & Sciences",
        },
        {
            id: "arts_4",
            prompt: "A good hypothesis should be:",
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
            prompt: "You invest ₱1,000 and you receive ₱1,200 back. What is your return (profit as a percent of investment)?",
            options: {
                A: "10%",
                B: "20%",
                C: "25%",
                D: "40%",
            },
            correct: "B",
            category: "Business Administration",
        },
        {
            id: "bus_2",
            prompt: "A company runs ads and offers discounts to attract customers. This is an example of:",
            options: {
                A: "Accounting",
                B: "Promotion",
                C: "Manufacturing",
                D: "Inventory counting",
            },
            correct: "B",
            category: "Business Administration",
        },
        {
            id: "bus_3",
            prompt: "A business lists its Strengths, Weaknesses, Opportunities, and Threats. This framework is called:",
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
            prompt: "A shop has fixed costs of ₱2,000. It earns ₱50 profit per item sold. How many items must it sell to break even?",
            options: {
                A: "20",
                B: "30",
                C: "40",
                D: "60",
            },
            correct: "C",
            category: "Business Administration",
        },
        {
            id: "bus_5",
            prompt: "In a market, when demand goes up but supply stays the same, what usually happens to price?",
            options: {
                A: "It always goes down",
                B: "It usually goes up",
                C: "It becomes zero",
                D: "It becomes random",
            },
            correct: "B",
            category: "Business Administration",
        },
    ],
    "Computer Studies": [
        {
            id: "cs_1",
            prompt: "Which password is strongest?",
            options: {
                A: "password123",
                B: "john2005",
                C: "G7!mQ2#zP9",
                D: "12345678",
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
            prompt: "When writing an incident report, what is the most important approach?",
            options: {
                A: "Write only your opinions",
                B: "Record observable facts in time order",
                C: "Leave out important details",
                D: "Guess what happened",
            },
            correct: "B",
            category: "Criminal Justice Education",
        },
        {
            id: "cje_2",
            prompt: "Presumption of innocence means a person is:",
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
            prompt: "After collecting evidence, what best helps ensure it stays trustworthy in court?",
            options: {
                A: "Make trials faster",
                B: "Keep evidence sealed, labeled, and documented by handler",
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
            prompt: "A vehicle travels 120 km in 2 hours. What is the average speed?",
            options: {
                A: "40 km/h",
                B: "60 km/h",
                C: "80 km/h",
                D: "100 km/h",
            },
            correct: "B",
            category: "Engineering & Technology",
        },
        {
            id: "eng_2",
            prompt: "A circuit has 12V and 4Ω resistance. What current flows?",
            options: {
                A: "1 A",
                B: "3 A",
                C: "6 A",
                D: "16 A",
            },
            correct: "B",
            category: "Engineering & Technology",
        },
        {
            id: "eng_3",
            prompt: "An object with mass 2 kg accelerates at 3 m/s². What force is needed?",
            options: {
                A: "1 N",
                B: "6 N",
                C: "9 N",
                D: "12 N",
            },
            correct: "B",
            category: "Engineering & Technology",
        },
        {
            id: "eng_4",
            prompt: "Which unit measures power?",
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
            prompt: "Before touching a patient, what is the best first action to reduce infection risk?",
            options: {
                A: "Check your phone for messages",
                B: "Perform hand hygiene",
                C: "Shake hands with the patient",
                D: "Eat a snack",
            },
            correct: "B",
            category: "Nursing",
        },
        {
            id: "nurs_2",
            prompt: "Which situation most urgently needs immediate attention in a clinic?",
            options: {
                A: "A patient asks for water",
                B: "A patient has difficulty breathing",
                C: "A patient wants to reschedule",
                D: "A patient requests a blanket",
            },
            correct: "B",
            category: "Nursing",
        },
        {
            id: "nurs_3",
            prompt: "The most effective everyday action to reduce infection spread in healthcare is:",
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
            prompt: "Blood pressure is best described as measuring the force of blood against:",
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
            prompt: "A thermometer reads 38.2°C. This is best described as:",
            options: {
                A: "Low blood sugar",
                B: "Normal temperature",
                C: "Fever",
                D: "Dehydration only",
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

// General readiness (15 items) tagged by skill.
// These are shared across all students, but scored per-skill and weighted per program category.
const GENERAL_READINESS_15 = [
    // =========================
    // NUMERICAL (5 ITEMS)
    // =========================
    {
        id: "gen_1",
        skill: "numerical",
        prompt: "What number comes next: 2, 4, 8, 16, __?",
        options: { A: "18", B: "20", C: "24", D: "32" },
        correct: "D",
    },
    {
        id: "gen_2",
        skill: "numerical",
        prompt: "A student scored 45/60. What is the percentage?",
        options: { A: "70%", B: "75%", C: "80%", D: "85%" },
        correct: "B",
    },
    {
        id: "gen_3",
        skill: "numerical",
        prompt: "If 5 books cost ₱500, how much is 1 book?",
        options: { A: "₱50", B: "₱75", C: "₱100", D: "₱125" },
        correct: "C",
    },
    {
        id: "gen_4",
        skill: "numerical",
        prompt: "What is 20% of 250?",
        options: { A: "40", B: "50", C: "60", D: "70" },
        correct: "B",
    },
    {
        id: "gen_5",
        skill: "numerical",
        prompt: "A number is doubled and becomes 36. What is the original number?",
        options: { A: "16", B: "18", C: "20", D: "22" },
        correct: "B",
    },

    // =========================
    // LOGICAL (5 ITEMS)
    // =========================
    {
        id: "gen_6",
        skill: "logical",
        prompt: "If all dogs are animals and some animals are brown, which is true?",
        options: {
            A: "All dogs are brown",
            B: "Some dogs may be brown",
            C: "No dogs are brown",
            D: "All animals are dogs",
        },
        correct: "B",
    },
    {
        id: "gen_7",
        skill: "logical",
        prompt: "Find the odd one out: 2, 4, 6, 9, 8",
        options: { A: "2", B: "4", C: "6", D: "9" },
        correct: "D",
    },
    {
        id: "gen_8",
        skill: "logical",
        prompt: "If today is Friday, what day is it after 3 days?",
        options: { A: "Sunday", B: "Monday", C: "Tuesday", D: "Wednesday" },
        correct: "B",
    },
    {
        id: "gen_9",
        skill: "logical",
        prompt: "A is taller than B. B is taller than C. Who is tallest?",
        options: { A: "A", B: "B", C: "C", D: "Cannot determine" },
        correct: "A",
    },
    {
        id: "gen_10",
        skill: "logical",
        prompt: "Which comes next: A, C, E, G, __?",
        options: { A: "H", B: "I", C: "J", D: "K" },
        correct: "B",
    },

    // =========================
    // VERBAL (5 ITEMS)
    // =========================
    {
        id: "gen_11",
        skill: "verbal",
        prompt: "Which word is closest in meaning to 'analyze'?",
        options: { A: "Ignore", B: "Examine", C: "Guess", D: "Forget" },
        correct: "B",
    },
    {
        id: "gen_12",
        skill: "verbal",
        prompt: "Choose the correctly spelled word:",
        options: { A: "Recieve", B: "Receive", C: "Receeve", D: "Receve" },
        correct: "B",
    },
    {
        id: "gen_13",
        skill: "verbal",
        prompt: "Which sentence is correct?",
        options: {
            A: "She go to school yesterday",
            B: "She goes to school yesterday",
            C: "She went to school yesterday",
            D: "She going to school yesterday",
        },
        correct: "C",
    },
    {
        id: "gen_14",
        skill: "verbal",
        prompt: "What is the main idea of a paragraph?",
        options: {
            A: "A small detail",
            B: "The central point",
            C: "The last sentence",
            D: "A random word",
        },
        correct: "B",
    },
    {
        id: "gen_15",
        skill: "verbal",
        prompt: "Which word is an antonym of 'increase'?",
        options: { A: "Grow", B: "Rise", C: "Decrease", D: "Add" },
        correct: "C",
    },
];

const GENERAL_READINESS_INDEX = GENERAL_READINESS_15.reduce((acc, q) => {
    acc[String(q.id)] = q;
    return acc;
}, {});

const READINESS_POINT_PER_CORRECT = 0.4;

// Program/category skill weights (must stay aligned with backend AssessmentController)
const CATEGORY_SKILL_WEIGHTS = {
    Accountancy: { numerical: 0.6, logical: 0.3, verbal: 0.1 },
    "Arts & Sciences": { numerical: 0.2, logical: 0.4, verbal: 0.4 },
    "Business Administration": { numerical: 0.35, logical: 0.35, verbal: 0.3 },
    "Computer Studies": { numerical: 0.35, logical: 0.5, verbal: 0.15 },
    "Criminal Justice Education": { numerical: 0.15, logical: 0.25, verbal: 0.6 },
    "Engineering & Technology": { numerical: 0.5, logical: 0.4, verbal: 0.1 },
    Nursing: { numerical: 0.4, logical: 0.2, verbal: 0.4 },
    "Teacher Education": { numerical: 0.1, logical: 0.2, verbal: 0.7 },
};

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

function mapProgramToCategory(program) {
    const p = String(program || "").trim().toLowerCase();
    if (!p) return null;

    // Keep this consistent with backend AssessmentController::mapProgramToCategory
    if (p === "arts and sciences") return "Arts & Sciences";
    if (p === "teachers education" || p === "teacher education") return "Teacher Education";
    if (p === "engineering and technology" || p === "engineering & technology") return "Engineering & Technology";
    if (p === "criminal justice education") return "Criminal Justice Education";
    if (p === "business administration") return "Business Administration";
    if (p === "computer studies") return "Computer Studies";
    if (p === "accountancy") return "Accountancy";
    if (p === "nursing") return "Nursing";

    return null;
}

function deriveTopCategoriesFromInterestRatings(interestRatings, n = 3) {
    const ratings = interestRatings && typeof interestRatings === "object" ? interestRatings : null;
    if (!ratings) return [];

    // Collapse to per-category rating (max), because multiple programs could map to one category.
    const byCategory = {};
    Object.entries(ratings).forEach(([program, rating]) => {
        const r = Number(rating);
        if (!Number.isFinite(r) || r <= 0) return; // 0 means "not set"

        const category = mapProgramToCategory(program);
        if (!category) return;

        byCategory[category] = Math.max(byCategory[category] || 0, r);
    });

    const rows = Object.entries(byCategory).map(([category, rating]) => ({ category, rating }));
    rows.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    });

    return rows.slice(0, n).map((r) => r.category);
}

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

function hashToUint32(str) {
    // Simple deterministic hash for stable pseudo-random selection (not crypto).
    const s = String(str || "");
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function stablePickOne(list, seedStr) {
    const arr = Array.isArray(list) ? list.filter(Boolean) : [];
    if (!arr.length) return null;
    const seed = hashToUint32(seedStr);
    const idx = seed % arr.length;
    return arr[idx];
}

function computePart1Scores(part1Selected) {
    const selected = Array.isArray(part1Selected) ? part1Selected : [];
    const byCategory = {};
    Object.entries(PART1_CATEGORY_MAP).forEach(([category, nums]) => {
        const score = (Array.isArray(nums) ? nums : []).reduce((c, num) => c + (selected.includes(num) ? 1 : 0), 0);
        byCategory[category] = score;
    });
    return byCategory;
}

function derivePart2CategoriesPolicy(interestRatings, part1Selected, seedStr, n = 3) {
    // New policy:
    // - 2 categories from Top Interest (if available)
    // - 1 exploration category: stable-random from the student's lowest Part I categories (excluding the first 2)
    // - Fill remaining slots from Part I top to keep length consistent

    const part1RankAll = deriveTopCategoriesFromPart1(part1Selected, CATEGORY_ORDER.length);
    const interestTop2 = deriveTopCategoriesFromInterestRatings(interestRatings, 2);

    const firstTwo = fillToNPrimaryThenFallback(interestTop2, part1RankAll, Math.min(2, n));
    const exclude = new Set(firstTwo);

    const scores = computePart1Scores(part1Selected);
    const lowRankAll = Object.keys(PART1_CATEGORY_MAP)
        .map((category) => ({ category, score: Number(scores[category] || 0) }))
        .sort((a, b) => {
            if (a.score !== b.score) return a.score - b.score;
            return CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        })
        .map((x) => x.category);

    const lowCandidates = lowRankAll.filter((c) => !exclude.has(c)).slice(0, 3);
    const remainingCandidates = CATEGORY_ORDER.filter((c) => !exclude.has(c));

    const exploration = stablePickOne(lowCandidates.length ? lowCandidates : remainingCandidates, seedStr);
    const combined = exploration ? firstTwo.concat([exploration]) : firstTwo;

    // Ensure exactly N categories (backend validation expects 3 categories × 5 questions each)
    return fillToNPrimaryThenFallback(combined, part1RankAll, n);
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
    // Always include general readiness questions (skill-tagged; weighted per category)
    return out.concat(GENERAL_READINESS_15);
}

function computeScores(part1Selected, part2Answers) {
    const scores = Object.keys(PART1_CATEGORY_MAP).reduce((acc, k) => {
        acc[k] = 0;
        return acc;
    }, {});

    const skillCorrect = { numerical: 0, logical: 0, verbal: 0 };

    // Part 1 scoring: count checks mapped to each category
    Object.entries(PART1_CATEGORY_MAP).forEach(([category, numbers]) => {
        const count = numbers.reduce((c, n) => c + (part1Selected.includes(n) ? 1 : 0), 0);
        scores[category] += count * CATEGORY_WEIGHTS.part1;
    });

    // Part 2 scoring: +2 for each correct answer, applied to that question's category
    const answers = part2Answers && typeof part2Answers === "object" ? part2Answers : {};
    Object.entries(answers).forEach(([qid, ans]) => {
        // General readiness: track per-skill correctness (later weighted per category)
        const rq = GENERAL_READINESS_INDEX[String(qid)];
        if (rq) {
            const user = String(ans || "").toUpperCase();
            if (user && user === String(rq.correct || "").toUpperCase()) {
                const sk = String(rq.skill || "").toLowerCase();
                if (sk === "numerical" || sk === "logical" || sk === "verbal") {
                    skillCorrect[sk] += 1;
                }
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

    // Apply weighted readiness contribution per category using the student's per-skill performance.
    Object.keys(scores).forEach((cat) => {
        const w = CATEGORY_SKILL_WEIGHTS[cat] || null;
        if (!w) return;
        const add =
            (skillCorrect.numerical || 0) * READINESS_POINT_PER_CORRECT * (w.numerical || 0) +
            (skillCorrect.logical || 0) * READINESS_POINT_PER_CORRECT * (w.logical || 0) +
            (skillCorrect.verbal || 0) * READINESS_POINT_PER_CORRECT * (w.verbal || 0);
        scores[cat] += add;
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

function fillToNPrimaryThenFallback(primary, fallback, n = 3) {
    const out = [];
    const pushUnique = (x) => {
        const v = String(x || "").trim();
        if (!v) return;
        if (out.includes(v)) return;
        out.push(v);
    };

    (Array.isArray(primary) ? primary : []).forEach(pushUnique);
    (Array.isArray(fallback) ? fallback : []).forEach((x) => {
        if (out.length >= n) return;
        pushUnique(x);
    });

    return out.slice(0, n);
}

export default function StudentAssessmentQuiz() {
    const navigate = useNavigate();
    const token = useMemo(() => localStorage.getItem("authToken"), []);

    const [part1Selected, setPart1Selected] = useState([]); // array of statement numbers (1-based)
    const [part2Answers, setPart2Answers] = useState({}); // { [questionId]: 'A'|'B'|'C'|'D' }
    const [part2Categories, setPart2Categories] = useState([]);
    const [interestRatings, setInterestRatings] = useState(null);

    const effectivePart2Categories = useMemo(() => {
        const stored = Array.isArray(part2Categories) ? part2Categories.filter(Boolean) : [];
        const fromPart1 = deriveTopCategoriesFromPart1(part1Selected, 3);

        // If we already have locked Part II categories, use them.
        // But ensure we still have exactly 3 categories for a consistent Part II length.
        if (stored.length) return fillToNPrimaryThenFallback(stored, fromPart1, 3);

        // Policy: 2 from Top Interest + 1 exploration category (stable-random among lowest Part I categories).
        // Use a stable seed so the exploration category doesn't change across renders.
        let seedStr = "assessment-exploration";
        try {
            const u = JSON.parse(localStorage.getItem("user") || "null");
            seedStr = String(u?.id || u?.email || seedStr);
        } catch {
            // ignore
        }

        const policyCats = derivePart2CategoriesPolicy(interestRatings, part1Selected, seedStr, 3);
        if (policyCats.length) return policyCats;

        return fromPart1;
    }, [interestRatings, part1Selected, part2Categories]);

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

        const bootstrapRatingsFromCache = () => {
            try {
                const cached = JSON.parse(localStorage.getItem("profile") || "null");
                const r = cached?.program_interest_ratings;
                if (r && typeof r === "object") setInterestRatings(r);
            } catch {
                // ignore
            }
        };

        const fetchProfile = async () => {
            try {
                const res = await axios.get("/api/profile", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });

                const ratings = res.data?.profile?.program_interest_ratings;
                if (ratings && typeof ratings === "object") {
                    setInterestRatings(ratings);
                }
            } catch {
                // Ignore profile fetch issues; we can still use Part I fallback.
            }
        };

        const fetchAssessment = async () => {
            try {
                const res = await axios.get("/api/assessment", {
                    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                    withCredentials: true,
                });

                const assessment = res.data?.assessment;
                if (assessment) {
                    setPart1Selected(Array.isArray(assessment.part1_selected) ? assessment.part1_selected : []);
                    setPart2Answers(
                        assessment.part2_answers && typeof assessment.part2_answers === "object" ? assessment.part2_answers : {}
                    );

                    // Try to reconstruct which categories were used for Part II.
                    // Prefer the categories implied by the stored question IDs.
                    const catsFromAnswers = categoriesFromPart2Answers(assessment.part2_answers);
                    if (catsFromAnswers.length) {
                        setPart2Categories(catsFromAnswers.slice(0, 3));
                    }

                    const hasSavedRecommendation =
                        Array.isArray(assessment.recommended_top3) && assessment.recommended_top3.length > 0;
                    setAssessmentSaved(hasSavedRecommendation);

                    if (hasSavedRecommendation) {
                        setStep(reviewStepIndex);
                    }
                }
            } catch {
                // If endpoint isn't ready yet, don't hard-fail; the page can still be used.
            }
        };

        const fetchAll = async () => {
            setLoading(true);
            setError(null);
            bootstrapRatingsFromCache();
            await Promise.allSettled([fetchProfile(), fetchAssessment()]);
            setLoading(false);
        };

        fetchAll();
    }, [navigate, token]);

    const currentLabel = useMemo(() => {
        if (step === 0) return "Part I – Personal Interest & Skills";
        if (step >= 1 && step <= part2Questions.length) {
            return `Part II – Readiness & Aptitude (Question ${step} of ${part2Questions.length})`;
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

            const res = await axios.put("/api/assessment", payload, {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
            });

            setSuccess("Saved! Your assessment is complete.");
            setAssessmentSaved(true);
            setStep(reviewStepIndex);
            // Also store computed results so recommendation page can use it instantly.
            const serverScores = res.data?.assessment?.scores;
            const serverTop3 = res.data?.assessment?.recommended_top3;
            localStorage.setItem(
                "assessmentResult",
                JSON.stringify({
                    scores: serverScores && typeof serverScores === "object" ? serverScores : scores,
                    top3: Array.isArray(serverTop3) ? serverTop3 : top3,
                    savedAt: new Date().toISOString(),
                })
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

    const loadInterestRatingsIfNeeded = async () => {
        if (interestRatings && typeof interestRatings === "object") return interestRatings;
        if (!token) return null;

        try {
            const res = await axios.get("/api/profile", {
                headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
                withCredentials: true,
            });

            const ratings = res.data?.profile?.program_interest_ratings;
            if (ratings && typeof ratings === "object") {
                setInterestRatings(ratings);
                return ratings;
            }
        } catch {
            // ignore
        }

        return null;
    };

    const gotoNext = async () => {
        // When transitioning out of Part I, lock in the Part II categories
        // so the question set stays consistent unless the user goes back.
        if (step === 0) {
            // Lock in Part II categories so the question set stays consistent unless the user goes back.
            // Policy: 2 from Top Interest + 1 exploration category.
            const ratings = await loadInterestRatingsIfNeeded();

            let seedStr = "assessment-exploration";
            try {
                const u = JSON.parse(localStorage.getItem("user") || "null");
                seedStr = String(u?.id || u?.email || seedStr);
            } catch {
                // ignore
            }

            const nextCats = derivePart2CategoriesPolicy(ratings, part1Selected, seedStr, 3);
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
                                    <div className="aq-top-score">
                                        Score: {Number(t.score).toFixed(2).replace(/\.00$/, "")}
                                    </div>
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
