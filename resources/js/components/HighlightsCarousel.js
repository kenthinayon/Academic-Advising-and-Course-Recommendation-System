import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

function clampIndex(n, len) {
    if (!len) return 0;
    const x = n % len;
    return x < 0 ? x + len : x;
}

function slideImageSrc(slide) {
    const p = String(slide?.image_path || "").trim();
    if (p) return `/storage/${p.replace(/^\/+/, "")}`;
    const u = String(slide?.image_url || "").trim();
    return u || "";
}

export default function HighlightsCarousel() {
    const token = useMemo(() => localStorage.getItem("authToken"), []);
    const headers = useMemo(
        () => ({ Authorization: `Bearer ${token}`, Accept: "application/json" }),
        [token]
    );

    const [loading, setLoading] = useState(true);
    const [slides, setSlides] = useState([]);
    const [idx, setIdx] = useState(0);
    const hoverRef = useRef(false);

    useEffect(() => {
        if (!token) {
            setLoading(false);
            setSlides([]);
            return;
        }

        let mounted = true;

        const load = async () => {
            try {
                const res = await axios.get("/api/carousel-slides?limit=10", { headers, withCredentials: true });
                if (!mounted) return;
                const rows = Array.isArray(res.data?.slides) ? res.data.slides : [];
                setSlides(rows);
                setIdx((i) => clampIndex(i, rows.length));
            } catch {
                if (!mounted) return;
                setSlides([]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
    }, [headers, token]);

    useEffect(() => {
        if (!slides.length || slides.length === 1) return;

        const id = setInterval(() => {
            if (hoverRef.current) return;
            setIdx((i) => clampIndex(i + 1, slides.length));
        }, 6000);

        return () => clearInterval(id);
    }, [slides.length]);

    const current = slides[clampIndex(idx, slides.length)] || null;
    const currentImage = current ? slideImageSrc(current) : "";

    const dots = useMemo(() => {
        return slides.map((s, i) => ({
            key: String(s?.id ?? i),
            i,
        }));
    }, [slides]);

    if (loading) return null;

    if (!slides.length || !current) {
        return (
            <section className="sp-highlights">
                <div className="sp-highlights-head">
                    <div>
                        <div className="sp-highlights-title">Campus Highlights</div>
                        <div className="sp-highlights-sub">Discover excellence across campus</div>
                    </div>

                    <div className="sp-highlights-nav">
                        <button type="button" className="sp-highlights-navbtn" aria-label="Previous slide" disabled>
                            ‹
                        </button>
                        <button type="button" className="sp-highlights-navbtn" aria-label="Next slide" disabled>
                            ›
                        </button>
                    </div>
                </div>

                <div className="sp-highlights-card" role="group" aria-roledescription="slide" aria-label="No slides">
                    <div className="sp-highlights-overlay">
                        <div className="sp-highlights-badge">HIGHLIGHTS</div>
                        <div className="sp-highlights-h">No highlights yet</div>
                        <div className="sp-highlights-story">An administrator can add featured stories and achievements.</div>
                    </div>

                    <div className="sp-highlights-footer">
                        <div className="sp-highlights-dots" aria-label="Slide selector">
                            <button type="button" className="sp-highlights-dot sp-highlights-dot--active" aria-label="Slide 1" disabled />
                        </div>
                        <div className="sp-highlights-count">0 / 0</div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            className="sp-highlights"
            onMouseEnter={() => {
                hoverRef.current = true;
            }}
            onMouseLeave={() => {
                hoverRef.current = false;
            }}
        >
            <div className="sp-highlights-head">
                <div>
                    <div className="sp-highlights-title">Campus Highlights</div>
                    <div className="sp-highlights-sub">Discover excellence across campus</div>
                </div>

                <div className="sp-highlights-nav">
                    <button
                        type="button"
                        className="sp-highlights-navbtn"
                        onClick={() => setIdx((i) => clampIndex(i - 1, slides.length))}
                        aria-label="Previous slide"
                        disabled={slides.length < 2}
                    >
                        ‹
                    </button>
                    <button
                        type="button"
                        className="sp-highlights-navbtn"
                        onClick={() => setIdx((i) => clampIndex(i + 1, slides.length))}
                        aria-label="Next slide"
                        disabled={slides.length < 2}
                    >
                        ›
                    </button>
                </div>
            </div>

            <div
                className="sp-highlights-card"
                style={{
                    backgroundImage: currentImage ? `url(${currentImage})` : undefined,
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${idx + 1} of ${slides.length}`}
            >
                <div className="sp-highlights-overlay">
                    {current.badge ? <div className="sp-highlights-badge">{String(current.badge).toUpperCase()}</div> : null}
                    {current.greeting ? <div className="sp-highlights-greeting">{current.greeting}</div> : null}
                    <div className="sp-highlights-h">{current.title}</div>
                    {current.story ? <div className="sp-highlights-story">{current.story}</div> : null}
                </div>

                <div className="sp-highlights-footer">
                    <div className="sp-highlights-dots" aria-label="Slide selector">
                        {dots.map((d) => (
                            <button
                                key={d.key}
                                type="button"
                                className={d.i === idx ? "sp-highlights-dot sp-highlights-dot--active" : "sp-highlights-dot"}
                                onClick={() => setIdx(d.i)}
                                aria-label={`Go to slide ${d.i + 1}`}
                            />
                        ))}
                    </div>
                    <div className="sp-highlights-count">
                        {idx + 1} / {slides.length}
                    </div>
                </div>
            </div>
        </section>
    );
}
