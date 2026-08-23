/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { DRSProvider } from "./store";
import { LoginPage } from "./components/LoginPage";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/Dashboard";
import { ExploreSystemPage } from "./components/ExploreSystemPage";
import { AdminPanel } from "./components/admin/AdminPanel";

export type AppPage = "landing" | "command_center" | "explore_system" | "admin_panel";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "operator">("operator");
  const [currentPage, setCurrentPage] = useState<AppPage>("landing");

  const handleLogin = (role: "admin" | "operator") => {
    setIsAuthenticated(true);
    setUserRole(role);
    if (role === "admin") {
      setCurrentPage("admin_panel");
    } else {
      setCurrentPage("landing");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole("operator");
    setCurrentPage("landing");
  };

  return (
    <DRSProvider>
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
    </DRSProvider>
  );
}
