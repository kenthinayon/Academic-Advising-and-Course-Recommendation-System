import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "./ui/toast";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [role, setRole] = useState("student");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    // Fetch CSRF token
    const getCsrfToken = async () => {
        try {
            await axios.get("/sanctum/csrf-cookie", { withCredentials: true });
        } catch (err) {
            setError("Failed to fetch CSRF token. Please refresh and try again.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (submitting) return;
        setSubmitting(true);
    const toastId = toast.info("Signing in…", { duration: 1200 });

        try {
            // Fetch CSRF token
            await getCsrfToken();

            // Make login request to Laravel API
            const response = await axios.post(
                "/api/login",
                { email, password, role },
                { withCredentials: true, headers: { Accept: "application/json" } }
            );

            // Store token and user in localStorage
            const { token, user } = response.data;
            localStorage.setItem("authToken", token);
            localStorage.setItem("user", JSON.stringify(user));

            // Always trust the server role (not the UI tab) for routing/guards
            const actualRole = user?.role || "student";
            localStorage.setItem("userRole", actualRole);

            if (actualRole === "admin") {
                navigate("/admin");
            } else if (actualRole === "advisor") {
                navigate("/advisor");
            } else {
                navigate("/student");
            }
        } catch (err) {
            // Handle specific HTTP errors
            if (err.response?.status === 405) {
                const msg = "Server error: POST method not supported for login route. Contact your administrator.";
                setError(msg);
                toast.error(msg);
            } else {
                const code = err.response?.data?.code;
                if (code === "wrong_role") {
                    const actualRole = err.response?.data?.actualRole;
                    const msg = `Wrong role selected. This account is a ${actualRole}. Please choose the ${actualRole} tab and try again.`;
                    setError(msg);
                    toast.warning(msg, { duration: 4500 });
                } else {
                    const msg =
                        err.response?.data?.message || "Login failed. Please check your credentials and try again.";
                    setError(msg);
                    toast.error(msg);
                }
            }
        } finally {
            toast.dismiss(toastId);
            setSubmitting(false);
        }
    };

    return (
        <div className="nav-login">
            <div className="login-card">
                <div className="brand">
                    <img className="brand-logo" src="/images/logo.png" alt="URIOS-ADVise" />
                    <h1 className="brand-title">URIOS-ADVise</h1>
                    <p className="brand-subtitle">
                        Academic Advising &amp; Course Recommendation System
                    </p>
                </div>

                <div className="form-shell">
                    <div className="form-head">
                        <h2>Sign In</h2>
                        <p>Select your role and enter your credentials</p>
                    </div>

                    <div className="role-tabs" role="tablist" aria-label="Select role">
                        <button
                            type="button"
                            className={role === "student" ? "role-tab active" : "role-tab"}
                            onClick={() => setRole("student")}
                            role="tab"
                            aria-selected={role === "student"}
                        >
                            Student
                        </button>
                        <button
                            type="button"
                            className={role === "advisor" ? "role-tab active" : "role-tab"}
                            onClick={() => setRole("advisor")}
                            role="tab"
                            aria-selected={role === "advisor"}
                        >
                            Advisor
                        </button>
                        <button
                            type="button"
                            className={role === "admin" ? "role-tab active" : "role-tab"}
                            onClick={() => setRole("admin")}
                            role="tab"
                            aria-selected={role === "admin"}
                        >
                            Admin
                        </button>
                    </div>

                    {error && <div className="alert-error">{error}</div>}

                    <form onSubmit={handleSubmit} className="login-form" noValidate>
                        <div className="field">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="your.email@urios.edu"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div className="field">
                            <label htmlFor="password">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary" disabled={submitting}>
                            {submitting ? "Signing in…" : "Sign In"}
                        </button>
                    </form>

                    <div className="demo-box">
                        <h3>Demo Credentials:</h3>
                        <ul>
                            <li>
                                <strong>Advisor:</strong>kent.hinayon@urios.edu.ph / qwerty12345
                            </li>
                            <li>
                                <strong>Admin:</strong> admin@urios.edu / admin123
                            </li>
                        </ul>
                    </div>

                    <div className="form-foot">
                        <span>Don't have an account?</span>
                        <button
                            type="button"
                            className="link-button"
                            onClick={() => navigate("/register")}
                        >
                            Register here
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}