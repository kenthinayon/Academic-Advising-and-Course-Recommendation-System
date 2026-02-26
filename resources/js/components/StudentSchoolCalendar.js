import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// Lightweight, dependency-free, realtime-ish calendar.
// It reads events from `/api/school-calendar` and refreshes periodically.

function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d) {
    // Monday-start week
    const day = d.getDay(); // 0=Sun
    const diff = (day + 6) % 7;
    const x = new Date(d);
    x.setDate(d.getDate() - diff);
    x.setHours(0, 0, 0, 0);
    return x;
}

function addDays(d, n) {
    const x = new Date(d);
    x.setDate(d.getDate() + n);
    return x;
}

function ymd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function StudentSchoolCalendar() {
    const navigate = useNavigate();

    const [cursor, setCursor] = useState(() => new Date());
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState([]);
    const [error, setError] = useState("");

    const monthLabel = useMemo(
        () => cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        [cursor]
    );

    const gridDays = useMemo(() => {
        const mStart = startOfMonth(cursor);
        const mEnd = endOfMonth(cursor);

        const first = startOfWeek(mStart);
        const last = addDays(startOfWeek(addDays(mEnd, 6)), 6); // end of last week

        const out = [];
        for (let d = new Date(first); d <= last; d = addDays(d, 1)) out.push(new Date(d));
        return out;
    }, [cursor]);

    // Simple polling for "realtime" updates.
    useEffect(() => {
        let alive = true;
        let timer = null;

        const fetchEvents = async () => {
            setLoading(true);
            setError("");
            try {
                const res = await fetch("/api/school-calendar", {
                    headers: { Accept: "application/json" },
                    credentials: "same-origin",
                });

                if (!res.ok) {
                    throw new Error("Failed to load calendar");
                }

                const data = await res.json();
                const list = Array.isArray(data?.events) ? data.events : [];
                if (alive) setEvents(list);
            } catch (e) {
                if (alive) {
                    // If the endpoint isn't available yet, keep the UI clean and just show an empty calendar.
                    setEvents([]);
                    setError("");
                }
            } finally {
                if (alive) setLoading(false);
            }
        };

        fetchEvents();
        timer = setInterval(fetchEvents, 30_000);

        return () => {
            alive = false;
            if (timer) clearInterval(timer);
        };
    }, []);

    const eventsByDay = useMemo(() => {
        const map = new Map();
        for (const ev of Array.isArray(events) ? events : []) {
            const date = String(ev?.date || "").slice(0, 10);
            if (!date) continue;
            if (!map.has(date)) map.set(date, []);
            map.get(date).push(ev);
        }
        return map;
    }, [events]);

    const today = useMemo(() => new Date(), []);

    const hasEvents = useMemo(() => (Array.isArray(events) ? events.length > 0 : false), [events]);

    return (
        <div className="student-portal" style={{ minHeight: "auto" }}>
            <main className="sp-main" style={{ padding: 16 }}>
                <div className="sp-schoolcal__pagehead">
                    <div style={{ minWidth: 0 }}>
                        <h1 className="sp-welcome sp-schoolcal__title">School Calendar</h1>
                        {/* Keep the header clean (no redundant subtitle). */}
                        <p className="sp-caption sp-schoolcal__caption">{loading ? "Loading…" : ""}</p>
                    </div>

                    <div className="sp-schoolcal__nav">
                        <button
                            type="button"
                            className="sp-btn sp-btn--ghost"
                            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                            aria-label="Previous month"
                        >
                            ←
                        </button>
                        <div className="sp-strong sp-schoolcal__month">{monthLabel}</div>
                        <button
                            type="button"
                            className="sp-btn sp-btn--ghost"
                            onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                            aria-label="Next month"
                        >
                            →
                        </button>
                    </div>
                </div>

                {error && hasEvents ? (
                    <div className="sp-callout" style={{ marginBottom: 12 }}>
                        {error}
                    </div>
                ) : null}

                <section className="sp-widget" style={{ padding: 12 }}>
                    <div className="sp-schoolcal__dow">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                            <div key={d} className="sp-schoolcal__dow-item">
                                {d}
                            </div>
                        ))}
                    </div>

                    <div className="sp-schoolcal__grid">
                        {gridDays.map((d) => {
                            const inMonth = d.getMonth() === cursor.getMonth();
                            const key = ymd(d);
                            const dayEvents = eventsByDay.get(key) || [];
                            const isToday = sameDay(d, today);

                            const dayClass = [
                                "sp-schoolcal__day",
                                !inMonth ? "sp-schoolcal__day--out" : "",
                                isToday ? "sp-schoolcal__day--today" : "",
                            ]
                                .filter(Boolean)
                                .join(" ");

                            return (
                                <div key={key} className={dayClass}>
                                    <div className="sp-schoolcal__dayhead">
                                        <div className="sp-schoolcal__date">{d.getDate()}</div>
                                        {isToday ? <span className="sp-schoolcal__today-pill">Today</span> : null}
                                        {dayEvents.length ? (
                                            <span className="sp-badge sp-badge--info" style={{ fontSize: 11 }}>
                                                {dayEvents.length}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="sp-schoolcal__events">
                                        {dayEvents.slice(0, 2).map((ev) => (
                                            <div
                                                key={String(ev.id || ev.title || Math.random())}
                                                title={String(ev.title || "Event")}
                                                className="sp-schoolcal__event"
                                            >
                                                {ev.title || "Event"}
                                            </div>
                                        ))}
                                        {dayEvents.length > 2 ? (
                                            <div className="sp-muted sp-schoolcal__more">+{dayEvents.length - 2} more</div>
                                        ) : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
    );
}
