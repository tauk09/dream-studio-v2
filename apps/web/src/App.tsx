import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectsPage } from "./pages/ProjectsPage";
import { CreateHubPage } from "./pages/CreateHubPage";
import { CreateWebsitePage } from "./pages/CreateWebsitePage";
import { CreateGamePage } from "./pages/CreateGamePage";
import { GeneratingPage } from "./pages/GeneratingPage";
import { ProjectEditorPage } from "./pages/ProjectEditorPage";
import { PublicViewerPage } from "./pages/PublicViewerPage";
import { AdminPage } from "./pages/AdminPage";
import {
  AboutPage,
  AccountPage,
  ExplorePage,
  GuidePage,
  HelpPage,
  LoginPage
} from "./pages/SecondaryPages";
import { useAuthStore } from "./store/authStore";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, initialized, refreshAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (!initialized) void refreshAuth();
  }, [initialized, refreshAuth]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F8FC]">
        <Loader2 className="h-7 w-7 animate-spin text-[#6858F5]" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${next}`} replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/guide" element={<GuidePage />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/account"
        element={
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        }
      />
      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects"
        element={
          <RequireAuth>
            <ProjectsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/create"
        element={
          <RequireAuth>
            <CreateHubPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/create/website"
        element={
          <RequireAuth>
            <CreateWebsitePage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/create/game"
        element={
          <RequireAuth>
            <CreateGamePage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/generating/:jobId"
        element={
          <RequireAuth>
            <GeneratingPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:id/edit"
        element={
          <RequireAuth>
            <ProjectEditorPage />
          </RequireAuth>
        }
      />

      <Route path="/p/:slug" element={<PublicViewerPage />} />
      <Route path="/g/:slug" element={<PublicViewerPage />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
