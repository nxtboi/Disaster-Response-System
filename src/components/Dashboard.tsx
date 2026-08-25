import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MainContent } from "./MainContent";
import { RightPanel } from "./RightPanel";
import { useDRS } from "../store";
import { motion } from "motion/react";

export function Dashboard({ 
  onExit,
  onOpenAdminPanel,
  onOpenLoginPage,
  onLogout,
  userRole = "operator",
}: { 
  onExit?: () => void;
  onOpenAdminPanel?: () => void;
  onOpenLoginPage?: () => void;
  onLogout?: () => void;
  userRole?: "admin" | "operator";
}) {
  const { activeView } = useDRS();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.8 }}
      className="flex h-screen w-full bg-zinc-950 overflow-hidden"
    >
      <Sidebar 
        onExit={onExit} 
        onOpenAdminPanel={onOpenAdminPanel} 
        onOpenLoginPage={onOpenLoginPage} 
      />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header 
          userRole={userRole} 
          onLogout={onLogout} 
          onOpenAdminPanel={onOpenAdminPanel} 
        />
        <div className="flex-1 flex overflow-hidden">
          <MainContent />
          {activeView === "Dashboard" && <RightPanel />}
        </div>
      </div>
    </motion.div>
  );
}

