/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { DRSProvider, useDRS } from "./store";
import { LoginPage } from "./components/LoginPage";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { ExploreSystemPage } from "./components/ExploreSystemPage";
import { AdminPanel } from "./components/admin/AdminPanel";

export type AppPage = "landing" | "command_center" | "explore_system" | "admin_panel";

const AUTH_STORAGE_KEY = "drs_auth_session";

interface StoredAuthSession {
  isAuthenticated: boolean;
  role: "admin" | "operator";
  username: string;
  lastPage?: AppPage;
  timestamp?: number;
}

function getStoredAuth(): StoredAuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.isAuthenticated === "boolean") {
      return parsed;
    }
  } catch (e) {
    console.error("Failed to parse auth session from localStorage", e);
  }
  return null;
}

function AppContent() {
  const { currentUser, setCurrentUser } = useDRS();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = getStoredAuth();
    return Boolean(session?.isAuthenticated);
  });

  const [userRole, setUserRole] = useState<"admin" | "operator">(() => {
    const session = getStoredAuth();
    return session?.role === "admin" ? "admin" : "operator";
  });

  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    const session = getStoredAuth();
    if (session?.isAuthenticated) {
      if (session.lastPage && ["landing", "command_center", "explore_system", "admin_panel"].includes(session.lastPage)) {
        return session.lastPage;
      }
      return session.role === "admin" ? "admin_panel" : "landing";
    }
    return "landing";
  });

  // Ensure currentUser in store is synchronized on mount if already authenticated
  useEffect(() => {
    const session = getStoredAuth();
    if (session?.isAuthenticated && session.username) {
      setCurrentUser({
        username: session.username,
        role: session.role === "admin" ? "admin" : "operator",
      });
    }
  }, [setCurrentUser]);

  // Persist session whenever auth state, role, or currentPage changes
  useEffect(() => {
    if (isAuthenticated) {
      const sessionData: StoredAuthSession = {
        isAuthenticated: true,
        role: userRole,
        username: currentUser?.username || (userRole === "admin" ? "admin" : "operator"),
        lastPage: currentPage,
        timestamp: Date.now(),
      };
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (e) {
        console.error("Failed to save auth session to localStorage", e);
      }
    }
  }, [isAuthenticated, userRole, currentPage, currentUser?.username]);

  const handleLogin = (role: "admin" | "operator", username: string) => {
    const cleanUsername = username.trim() || (role === "admin" ? "admin" : "operator");
    const targetPage: AppPage = role === "admin" ? "admin_panel" : "landing";

    setIsAuthenticated(true);
    setUserRole(role);
    setCurrentPage(targetPage);
    setCurrentUser({ username: cleanUsername, role });

    const sessionData: StoredAuthSession = {
      isAuthenticated: true,
      role,
      username: cleanUsername,
      lastPage: targetPage,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
      localStorage.setItem("drs_current_user", JSON.stringify({ username: cleanUsername, role }));
    } catch (_) {}
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole("operator");
    setCurrentPage("landing");
    setCurrentUser({ username: "operator", role: "operator" });
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem("drs_current_user");
    } catch (_) {}
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-cyan-500/30 overflow-hidden">
      {!isAuthenticated ? (
        <LoginPage onLogin={handleLogin} />
      ) : currentPage === "admin_panel" ? (
        <AdminPanel
          onLaunchCommandCenter={() => setCurrentPage("command_center")}
          onExploreSystem={() => setCurrentPage("explore_system")}
          onLogout={handleLogout}
        />
      ) : currentPage === "landing" ? (
        <LandingPage
          onLaunch={() => setCurrentPage("command_center")}
          onExploreSystem={() => setCurrentPage("explore_system")}
          onLogout={handleLogout}
          userRole={userRole}
          username={currentUser?.username}
          onOpenAdminPanel={userRole === "admin" ? () => setCurrentPage("admin_panel") : undefined}
        />
      ) : currentPage === "explore_system" ? (
        <ExploreSystemPage
          onLaunchCommandCenter={() => setCurrentPage("command_center")}
          onBackToHome={() => (userRole === "admin" ? setCurrentPage("admin_panel") : setCurrentPage("landing"))}
          onSelectDroneAndMonitor={() => setCurrentPage("command_center")}
          userRole={userRole}
          onLogout={handleLogout}
        />
      ) : (
        <Dashboard
          userRole={userRole}
          onLogout={handleLogout}
          onExit={() => {
            if (userRole === "admin") {
              setCurrentPage("admin_panel");
            } else {
              setCurrentPage("landing");
            }
          }}
          onOpenAdminPanel={userRole === "admin" ? () => setCurrentPage("admin_panel") : undefined}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <DRSProvider>
      <AppContent />
    </DRSProvider>
  );
}
