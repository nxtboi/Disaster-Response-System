import { motion } from "motion/react";
import droneImage from "../assets/images/drone_landing_hero_1787467797692.jpg";
import { Crosshair, ShieldAlert, LogOut, User, ShieldCheck } from "lucide-react";

export function LandingPage({ 
  onLaunch, 
  onExploreSystem,
  onLogout,
  userRole,
  username,
  onOpenAdminPanel,
}: { 
  onLaunch: () => void; 
  onExploreSystem?: () => void; 
  onLogout?: () => void;
  userRole?: "admin" | "operator";
  username?: string;
  onOpenAdminPanel?: () => void;
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0, scale: 0.95 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.8, ease: "easeOut" as const }
    }
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <motion.div 
        className="absolute inset-0 z-0"
        initial={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
        animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 2.5, ease: "easeOut" }}
      >
        <img 
          src={droneImage} 
          alt="Cinematic Drone" 
          className="w-full h-full object-cover opacity-60"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-zinc-950/20 to-zinc-950/90" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center"
        >
          <motion.div variants={itemVariants} className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Crosshair className="w-12 h-12 text-cyan-400" />
            </motion.div>
            <h1 className="text-6xl font-extrabold tracking-widest text-white">DRS</h1>
          </motion.div>
          
          <motion.h2 variants={itemVariants} className="text-3xl md:text-5xl font-light tracking-wide text-zinc-200 mb-4 drop-shadow-lg">
            Drone Response & Surveillance System
          </motion.h2>
          
          <motion.p variants={itemVariants} className="text-lg md:text-xl text-cyan-100/70 max-w-2xl font-light mb-12 tracking-wide">
            One platform. Multiple drones. Real-time intelligence.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6">
            <button
              onClick={onLaunch}
              className="group relative px-8 py-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 rounded-sm overflow-hidden"
            >
              <div className="absolute inset-0 w-0 bg-cyan-500/10 transition-all duration-[250ms] ease-out group-hover:w-full"></div>
              <span className="relative flex items-center gap-2 text-cyan-300 font-medium tracking-widest uppercase text-sm">
                Launch Command Center
              </span>
            </button>
            <button
              onClick={onExploreSystem}
              className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/40 text-zinc-300 hover:text-white transition-all duration-300 rounded-sm group flex items-center justify-center gap-2"
            >
              <span className="font-medium tracking-widest uppercase text-sm">
                Explore System
              </span>
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Top Right User Info & Logout Button */}
      {onLogout && (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3 font-mono">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/80 backdrop-blur-md border border-cyan-500/30 text-xs text-zinc-200 shadow-lg">
            {userRole === "admin" ? (
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <User className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span className="font-semibold text-zinc-100">{username || (userRole === "admin" ? "admin" : "operator")}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
              userRole === "admin" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
            }`}>
              {userRole || "operator"}
            </span>
          </div>

          {userRole === "admin" && onOpenAdminPanel && (
            <button
              onClick={onOpenAdminPanel}
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all shadow-sm"
              title="Open Admin Panel"
            >
              ADMIN PANEL
            </button>
          )}

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 hover:border-rose-500/50 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all shadow-sm"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>LOGOUT</span>
          </button>
        </div>
      )}

      {/* Decorative HUD Elements */}
      <motion.div 
        className="absolute top-8 left-8 border-l-2 border-t-2 border-cyan-500/50 w-16 h-16 pointer-events-none"
        initial={{ opacity: 0, x: -20, y: -20 }}
        animate={{ opacity: [0, 1, 0.5, 1], x: 0, y: 0 }}
        transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.4, 0.7, 1] }}
      />
      <motion.div 
        className="absolute top-8 right-8 border-r-2 border-t-2 border-cyan-500/50 w-16 h-16 pointer-events-none"
        initial={{ opacity: 0, x: 20, y: -20 }}
        animate={{ opacity: [0, 1, 0.5, 1], x: 0, y: 0 }}
        transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.4, 0.7, 1], delay: 0.1 }}
      />
      <motion.div 
        className="absolute bottom-8 left-8 border-l-2 border-b-2 border-cyan-500/50 w-16 h-16 pointer-events-none"
        initial={{ opacity: 0, x: -20, y: 20 }}
        animate={{ opacity: [0, 1, 0.5, 1], x: 0, y: 0 }}
        transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.4, 0.7, 1], delay: 0.2 }}
      />
      <motion.div 
        className="absolute bottom-8 right-8 border-r-2 border-b-2 border-cyan-500/50 w-16 h-16 pointer-events-none"
        initial={{ opacity: 0, x: 20, y: 20 }}
        animate={{ opacity: [0, 1, 0.5, 1], x: 0, y: 0 }}
        transition={{ duration: 1.5, ease: "easeOut", times: [0, 0.4, 0.7, 1], delay: 0.3 }}
      />
      
      {/* Scanning Line overlay */}
      <motion.div 
        className="absolute inset-0 w-full h-[2px] bg-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.8)] pointer-events-none"
        initial={{ top: "-10%" }}
        animate={{ top: "110%" }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Glitching Text/Code Background */}
      <div className="absolute top-20 left-12 opacity-20 pointer-events-none hidden md:block">
        <motion.div
          animate={{ opacity: [0.1, 0.5, 0.1, 0.3, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="font-mono text-cyan-500 text-xs flex flex-col gap-1"
        >
          <span>SYS_BOOT_SEQ: INIT</span>
          <span>SENSORS: ONLINE</span>
          <span>LIDAR_ARRAY: CALIBRATING...</span>
          <span>SAT_UPLINK: SECURE</span>
          <span>OP_MODE: STANDBY</span>
        </motion.div>
      </div>
    </div>
  );
}
