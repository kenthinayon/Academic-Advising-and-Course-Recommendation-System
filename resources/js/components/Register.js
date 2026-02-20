import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        age: "",
        gender: "",
        high_school: "",
        contact_number: "",
        role: "student",
    });

    const [error, setError] = useState(null);

    const onChange = (key) => (e) => {
        const value = e.target.value;

        // If switching to advisor, clear student-only fields.
        if (key === "role" && value === "advisor") {
            setForm((f) => ({
                ...f,
                role: value,
                high_school: "",
            }));
            return;
        }

        setForm((f) => ({ ...f, [key]: value }));
    };

    const getCsrfToken = async () => {
        await axios.get("/sanctum/csrf-cookie", { withCredentials: true });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            await getCsrfToken();

            // Registration is limited to student/advisor roles only.
            const payload = { ...form, role: form.role || "student" };

            const response = await axios.post("/api/register", payload, {
                withCredentials: true,
                headers: { Accept: "application/json" },
            });

            const { token, user } = response.data;
            localStorage.setItem("authToken", token);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("userRole", user.role || "student");

            const actualRole = user?.role || payload.role || "student";

            if (actualRole === "advisor" || actualRole === "admin") {
                navigate("/advisor");
            } else {
                navigate("/student");
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                    (err.response?.data?.errors
                        ? Object.values(err.response.data.errors).flat().join(" ")
                        : "Registration failed. Please check the form and try again.")
            );
        }
    };

    return (
        <div className="nav-login">
            <div className="login-card">
                <div className="brand">
                    <div className="brand-icon" aria-hidden="true">
                        <span className="cap" />
                    </div>
                    <h1 className="brand-title">URIOS-ADVise</h1>
                    <p className="brand-subtitle">Create your student account</p>
                </div>

                <div className="form-shell">
                    <div className="form-head">
                        <h2>Register</h2>
                        <p>Fill in your basic information</p>
                    </div>

                    {error && <div className="alert-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="login-form" noValidate>
                        <div className="field">
                            <label htmlFor="role">Register as</label>
                            <select id="role" value={form.role} onChange={onChange("role")}>
                                <option value="student">Student</option>
                                <option value="advisor">Advisor</option>
                            </select>
                        </div>

                        <div className="field">
                            <label htmlFor="name">Full Name</label>
                            <input id="name" value={form.name} onChange={onChange("name")} required />
                        </div>

                        <div className="field">
                            <label htmlFor="age">Age</label>
                            <input id="age" type="number" value={form.age} onChange={onChange("age")} />
                        </div>

                        <div className="field">
                            <label htmlFor="gender">Gender</label>
                            <select
                                id="gender"
                                value={form.gender}
                                onChange={onChange("gender")}
                            >
                                <option value="">Select gender</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Prefer not to say">Prefer not to say</option>
                            </select>
                        </div>

                        {form.role !== "advisor" && (
                            <div className="field">
                                <label htmlFor="high_school">High School</label>
                                <input
                                    id="high_school"
                                    value={form.high_school}
                                    onChange={onChange("high_school")}
                                />
                            </div>
                        )}

                        <div className="field">
                            <label htmlFor="email">Email</label>
                            <input id="email" type="email" value={form.email} onChange={onChange("email")} required />
                        </div>

                        <div className="field">
                            <label htmlFor="contact_number">Contact Number</label>
                            <input
                                id="contact_number"
                                value={form.contact_number}
                                onChange={onChange("contact_number")}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={form.password}
                                onChange={onChange("password")}
                                required
                                minLength={8}
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="password_confirmation">Confirm Password</label>
                            <input
                                id="password_confirmation"
                                type="password"
                                value={form.password_confirmation}
                                onChange={onChange("password_confirmation")}
                                required
                                minLength={8}
                            />
                        </div>

                        <button type="submit" className="btn-primary">
                            Create Account
                        </button>
                    </form>

                    <div className="form-foot">
                        <span>Already have an account?</span>
                        <button
                            type="button"
                            className="link-button"
                            onClick={() => navigate("/login")}
                        >
                            Sign in
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
