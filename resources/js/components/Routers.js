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
import StudentAppointments from "./StudentAppointments";
import StudentSchoolCalendar from "./StudentSchoolCalendar";
import AdvisorDashboard from "./AdvisorDashboard";
import AdvisorAppointments from "./AdvisorAppointments";
import AdvisorStudentDetail from "./AdvisorStudentDetail";
import AdminDashboard from "./AdminDashboard";
import AdminStudentDetail from "./AdminStudentDetail";
import { ToastHost } from "./ui/toast";

export default function Routers() {
    return (
        <Router>
            <ToastHost />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route path="/advisor" element={<AdvisorDashboard />} />
                <Route path="/advisor/appointments" element={<AdvisorAppointments />} />
                <Route path="/advisor/students/:userId" element={<AdvisorStudentDetail />} />

                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/students/:userId" element={<AdminStudentDetail />} />

                <Route path="/student" element={<StudentPortal />} />
                <Route path="/student/basic-information" element={<StudentBasicInformation />} />
                <Route path="/student/academic-credentials" element={<StudentAcademicCredentials />} />
                <Route path="/student/assessment-quiz" element={<StudentAssessmentQuiz />} />
                <Route path="/student/course-recommendation" element={<StudentCourseRecommendation />} />
                <Route path="/student/appointments" element={<StudentAppointments />} />
                <Route path="/school-calendar" element={<StudentSchoolCalendar />} />
                <Route path="*" element={<Login />} />
            </Routes>
        </Router>
    );
}

if (document.getElementById('root')) {
    createRoot(document.getElementById('root')).render(<Routers />);
}