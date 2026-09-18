import { Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated } from "./api/client";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ProjectMapPage from "./pages/ProjectMapPage.jsx";
import SiteDetailPage from "./pages/SiteDetailPage.jsx";

function RequireAuth({ children }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/projects/:projectId"
        element={
          <RequireAuth>
            <ProjectMapPage />
          </RequireAuth>
        }
      />
      <Route
        path="/sites/:siteId"
        element={
          <RequireAuth>
            <SiteDetailPage />
          </RequireAuth>
        }
      />
      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
