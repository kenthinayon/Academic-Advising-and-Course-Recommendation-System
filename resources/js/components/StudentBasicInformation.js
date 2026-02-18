import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function StudentBasicInformation() {
    const navigate = useNavigate();

    const token = useMemo(() => localStorage.getItem("authToken"), []);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [form, setForm] = useState({
        name: "",
        age: "",
        gender: "",
        high_school: "",
        email: "",
        contact_number: "",
    });

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

                const user = res.data?.user;
                const profile = res.data?.profile;

                setForm((prev) => ({
                    ...prev,
                    name: user?.name ?? "",
                    email: user?.email ?? "",
                    age: profile?.age ?? "",
                    gender: profile?.gender ?? "",
                    high_school: profile?.high_school ?? "",
                    contact_number: profile?.contact_number ?? "",
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const payload = {
                name: form.name,
                age: Number(form.age),
                gender: form.gender,
                high_school: form.high_school,
                email: form.email,
                contact_number: form.contact_number,
            };

            const res = await axios.put("/api/profile/basic-info", payload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                },
                withCredentials: true,
            });

            // Keep localStorage user in sync if name/email changed
            if (res.data?.user) {
                localStorage.setItem("user", JSON.stringify(res.data.user));
            }

            setSuccess("Saved! You can continue to the next step.");
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
                    <div className="sb-title">Basic Information</div>
                    <div className="sb-subtitle">Complete your profile details</div>
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
                                        <span className="sb-label">Full Name</span>
                                        <input
                                            className="sb-input"
                                            type="text"
                                            value={form.name}
                                            onChange={setField("name")}
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </label>

                                    <label className="sb-field">
                                        <span className="sb-label">Age</span>
                                        <input
                                            className="sb-input"
                                            type="number"
                                            value={form.age}
                                            onChange={setField("age")}
                                            placeholder="Enter your age"
                                            required
                                            min="1"
                                            max="120"
                                        />
                                    </label>
                                </div>

                                <div className="sb-row">
                                    <label className="sb-field">
                                        <span className="sb-label">Gender</span>
                                        <select
                                            className="sb-input"
                                            value={form.gender}
                                            onChange={setField("gender")}
                                            required
                                        >
                                            <option value="" disabled>
                                                Select gender
                                            </option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    </label>

                                    <label className="sb-field">
                                        <span className="sb-label">High School</span>
                                        <input
                                            className="sb-input"
                                            type="text"
                                            value={form.high_school}
                                            onChange={setField("high_school")}
                                            placeholder="Enter your High School"
                                            required
                                        />
                                    </label>
                                </div>

                                <div className="sb-row">
                                    <label className="sb-field">
                                        <span className="sb-label">Email Address</span>
                                        <input
                                            className="sb-input"
                                            type="email"
                                            value={form.email}
                                            onChange={setField("email")}
                                            placeholder="Enter your email"
                                            required
                                        />
                                    </label>

                                    <label className="sb-field">
                                        <span className="sb-label">Contact Number</span>
                                        <input
                                            className="sb-input"
                                            type="text"
                                            value={form.contact_number}
                                            onChange={setField("contact_number")}
                                            placeholder="Enter your contact number"
                                            required
                                        />
                                    </label>
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
