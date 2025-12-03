import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import TrainingPage from "./pages/TrainingPage";
import WasteReportPage from "./pages/WasteReportPage";
import MyReportsPage from "./pages/MyReportsPage";
import SegregationPage from "./pages/SegregationPage";
import { ProtectedRoute } from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
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

      {/* Default redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
