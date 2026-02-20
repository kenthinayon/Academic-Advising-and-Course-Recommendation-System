import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Login from "./Login";
import StudentPortal from "./StudentPortal";
import Register from "./Register";
import StudentBasicInformation from "./StudentBasicInformation";
import StudentAcademicCredentials from "./StudentAcademicCredentials";
import StudentAssessmentQuiz from "./StudentAssessmentQuiz";
import StudentCourseRecommendation from "./StudentCourseRecommendation";
import AdvisorDashboard from "./AdvisorDashboard";
import AdvisorStudentDetail from "./AdvisorStudentDetail";
import AdminDashboard from "./AdminDashboard";

export default function Routers() {
    return (
        <Router>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/advisor" element={<AdvisorDashboard />} />
                <Route path="/advisor/students/:userId" element={<AdvisorStudentDetail />} />

                <Route path="/admin" element={<AdminDashboard />} />

                <Route path="/student" element={<StudentPortal />} />
                <Route path="/student/basic-information" element={<StudentBasicInformation />} />
                <Route path="/student/academic-credentials" element={<StudentAcademicCredentials />} />
                <Route path="/student/assessment-quiz" element={<StudentAssessmentQuiz />} />
                <Route path="/student/course-recommendation" element={<StudentCourseRecommendation />} />
                <Route path="*" element={<Login />} />
            </Routes>
        </Router>
    );
}

if (document.getElementById('root')) {
    createRoot(document.getElementById('root')).render(<Routers />);
}