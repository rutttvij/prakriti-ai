import { Routes, Route, Navigate, useParams } from "react-router-dom";

/* Public Pages */
import LandingPage from "./pages/Landing";
import DocsPage from "./pages/Docs";
import AboutPage from "./pages/About";
import { ContactPage } from "./pages/ContactPage";
import LoginRoute from "./pages/auth/Login";
import RegisterRoute from "./pages/auth/Register";

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
import BulkLayout from "./layouts/BulkLayout";
import BulkDashboardPage from "./pages/bulk/BulkDashboardPage";
import BulkWasteLogPage from "./pages/bulk/BulkWasteLogPage";
import BulkPickupRequestsPage from "./pages/bulk/BulkPickupRequestsPage";
import BulkTrainingPage from "./pages/bulk/BulkTrainingPage";
import BulkInsightsPage from "./pages/bulk/BulkInsightsPage";
import AppDashboard from "./pages/app/Dashboard";

/* Layout & Auth */
import { ProtectedRoute } from "./components/ProtectedRoute";
import CitizenLayout from "./layouts/CitizenLayout";
import AdminLayout from "./layouts/AdminLayout";
import { useAuth } from "./contexts/AuthContext";

const AdminPccParamRedirect: React.FC = () => {
  const { logId } = useParams();
  const n = logId ? parseInt(logId, 10) : NaN;
  if (!Number.isFinite(n) || n <= 0) return <Navigate to="/admin/pcc" replace />;
  return <Navigate to={`/admin/pcc?logId=${n}`} replace />;
};

const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role;

  if (role === "SUPER_ADMIN") return <Navigate to="/admin" replace />;
  if (role === "WASTE_WORKER") return <Navigate to="/worker/dashboard" replace />;
  if (role === "BULK_GENERATOR" || role === "BULK_MANAGER" || role === "BULK_STAFF") {
    return <Navigate to="/bulk/dashboard" replace />;
  }

  return (
    <CitizenLayout>
      <CitizenDashboardPage />
    </CitizenLayout>
  );
};

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
          {/* ---------- PUBLIC ROUTES ---------- */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/auth/login" element={<LoginRoute />} />
          <Route path="/auth/register" element={<RegisterRoute />} />
          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
          <Route path="/register" element={<Navigate to="/auth/register" replace />} />
          <Route
            path="/app/dashboard"
            element={
              <ProtectedRoute>
                <AppDashboard />
              </ProtectedRoute>
            }
          />

          {/* ---------- CITIZEN ROUTES ---------- */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardRedirect />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bulk/dashboard"
            element={
              <ProtectedRoute>
                <BulkLayout>
                  <BulkDashboardPage />
                </BulkLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bulk/waste-log"
            element={
              <ProtectedRoute>
                <BulkLayout>
                  <BulkWasteLogPage />
                </BulkLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bulk/pickups"
            element={
              <ProtectedRoute>
                <BulkLayout>
                  <BulkPickupRequestsPage />
                </BulkLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bulk/training"
            element={
              <ProtectedRoute>
                <BulkLayout>
                  <BulkTrainingPage />
                </BulkLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bulk/insights"
            element={
              <ProtectedRoute>
                <BulkLayout>
                  <BulkInsightsPage />
                </BulkLayout>
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
    </div>
  );
}

export default App;
