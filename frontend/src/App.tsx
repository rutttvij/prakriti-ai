import { Routes, Route, Navigate, useParams } from "react-router-dom";

/* Public Pages */
import { LandingPage } from "./pages/LandingPage";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/ContactPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

/* Citizen Pages */
import CitizenDashboardPage from "./pages/citizen/CitizenDashboardPage";
import CitizenTrainingPage from "./pages/citizen/CitizenTrainingPage";
import CitizenWasteReportPage from "./pages/citizen/CitizenWasteReportPage";
import CitizenMyReportsPage from "./pages/citizen/CitizenMyReportsPage";
import CitizenHouseholdPage from "./pages/citizen/CitizenHouseholdPage";
import CitizenInsightsPage from "./pages/citizen/CitizenInsightsPage";

/* Admin Pages */
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminPccAwardPage } from "./pages/admin/AdminPccAwardPage";
import { AdminContactMessagesPage } from "./pages/admin/AdminContactMessagesPage";

/* Worker Pages */
import WorkerLayout from "./layouts/WorkerLayout";
import { WorkerDashboardPage } from "./pages/worker/WorkerDashboardPage";
import { WorkerAvailableReportsPage } from "./pages/worker/WorkerAvailableReportsPage";
import { WorkerMyReportsPage } from "./pages/worker/WorkerMyReportsPage";
import WorkerSegregationPage from "./pages/worker/WorkerSegregationPage";
import WorkerRouteMapPage from "./pages/worker/WorkerRouteMapPage";

/* Layout & Auth */
import { ProtectedRoute } from "./components/ProtectedRoute";
import CitizenLayout from "./layouts/CitizenLayout";
import AdminLayout from "./layouts/AdminLayout";

/* Global Layout Components */
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { BackToTopButton } from "./components/BackToTopButton";

const AdminPccParamRedirect: React.FC = () => {
  const { logId } = useParams();
  const n = logId ? parseInt(logId, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return <Navigate to="/admin/pcc" replace />;
  return <Navigate to={`/admin/pcc?logId=${n}`} replace />;
};

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50/70 to-white">
      <Navbar />

      <main className="flex-1">
        <Routes>
          {/* ---------- PUBLIC ROUTES ---------- */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* ---------- CITIZEN ROUTES ---------- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CitizenLayout>
                  <CitizenDashboardPage />
                </CitizenLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/training"
            element={
              <ProtectedRoute>
                <CitizenLayout>
                  <CitizenTrainingPage />
                </CitizenLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/waste/report"
            element={
              <ProtectedRoute>
                <CitizenLayout>
                  <CitizenWasteReportPage />
                </CitizenLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/waste/my-reports"
            element={
              <ProtectedRoute>
                <CitizenLayout>
                  <CitizenMyReportsPage />
                </CitizenLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/citizen/household"
            element={
              <ProtectedRoute>
                <CitizenLayout>
                  <CitizenHouseholdPage />
                </CitizenLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/insights"
            element={
              <ProtectedRoute>
                <CitizenLayout>
                  <CitizenInsightsPage />
                </CitizenLayout>
              </ProtectedRoute>
            }
          />

          {/* ---------- WASTE WORKER ROUTES ---------- */}
          <Route
            path="/worker/dashboard"
            element={
              <ProtectedRoute>
                <WorkerLayout>
                  <WorkerDashboardPage />
                </WorkerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/worker/reports/available"
            element={
              <ProtectedRoute>
                <WorkerLayout>
                  <WorkerAvailableReportsPage />
                </WorkerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/worker/reports/my"
            element={
              <ProtectedRoute>
                <WorkerLayout>
                  <WorkerMyReportsPage />
                </WorkerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/worker/segregation"
            element={
              <ProtectedRoute>
                <WorkerLayout>
                  <WorkerSegregationPage />
                </WorkerLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/worker/route-map"
            element={
              <ProtectedRoute>
                <WorkerLayout>
                  <WorkerRouteMapPage />
                </WorkerLayout>
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

          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />

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

          {/* Canonical PCC route (query: ?logId=123) */}
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

          {/* Alias routes to prevent bad navigation causing fallback-to-landing */}
          <Route path="/admin/pcc-award" element={<Navigate to="/admin/pcc" replace />} />
          <Route path="/admin/pcc/:logId" element={<AdminPccParamRedirect />} />

          <Route
            path="/admin/contact"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <AdminContactMessagesPage />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ---------- FALLBACK ---------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
}

export default App;
