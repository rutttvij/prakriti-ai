import { Routes, Route, Navigate } from "react-router-dom";

/* Public Pages */
import { LandingPage } from "./pages/LandingPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

/* Protected Pages */
import DashboardPage from "./pages/DashboardPage";
import TrainingPage from "./pages/TrainingPage";
import WasteReportPage from "./pages/WasteReportPage";
import MyReportsPage from "./pages/MyReportsPage";
import SegregationPage from "./pages/SegregationPage";

/* Admin Pages */
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminPccAwardPage } from "./pages/admin/AdminPccAwardPage";

/* Layout & Auth */
import { ProtectedRoute } from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import AdminLayout from "./layouts/AdminLayout";

/* Global Layout Components */
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { BackToTopButton } from "./components/BackToTopButton";

function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="flex-1">
        <Routes>
          {/* ---------- PUBLIC ROUTES ---------- */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ---------- USER DASHBOARD ROUTES ---------- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/training"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <TrainingPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/waste/report"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <WasteReportPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/waste/my-reports"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MyReportsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/segregation"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SegregationPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* ---------- SUPER ADMIN ROUTES ---------- */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminDashboardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminUsersPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/pcc"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminPccAwardPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ---------- FALLBACK ---------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <Footer />
      <BackToTopButton />
    </div>
  );
}

export default App;