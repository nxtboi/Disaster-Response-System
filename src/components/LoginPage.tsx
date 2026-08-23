import React, { useState } from "react";
import { motion } from "motion/react";
import { ShieldAlert, Crosshair, Lock, User, KeyRound, Loader2 } from "lucide-react";
import droneImage from "../assets/images/drone_landing_hero_1787467797692.jpg";

export function LoginPage({ onLogin }: { onLogin: (role: "admin" | "operator") => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(true);
      return;
    }
    
    setError(false);
    setIsAuthenticating(true);

    const isAdmin = username.trim().toLowerCase() === "admin" && password === "Vijay@147896";
    const role: "admin" | "operator" = isAdmin ? "admin" : "operator";
    
    // Simulate swift secure authentication
    setTimeout(() => {
      setIsAuthenticating(false);
      onLogin(role);
    }, 800);
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img 
          src={droneImage} 
          alt="Background" 
          className="w-full h-full object-cover opacity-30 blur-sm"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/60 to-zinc-950/95" />
      </div>

      {/* Login Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-zinc-950/80 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
          <div className="flex flex-col items-center mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="mb-4"
            >
              <Crosshair className="w-12 h-12 text-cyan-400" />
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-widest text-white mb-1">DRS</h1>
            <p className="text-xs font-mono text-cyan-500 tracking-widest uppercase">Autonomous Response Platform</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-5 h-5 text-cyan-500/50" />
              </div>
              <input
                id="login-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-cyan-500/60 text-zinc-100 rounded-lg pl-10 pr-4 py-3 outline-none transition-colors placeholder:text-zinc-600 font-mono text-sm"
                placeholder="USERNAME"
                autoComplete="username"
                disabled={isAuthenticating}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <KeyRound className="w-5 h-5 text-cyan-500/50" />
              </div>
              <input
                id="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-900/70 border border-zinc-800 focus:border-cyan-500/60 text-zinc-100 rounded-lg pl-10 pr-4 py-3 outline-none transition-colors placeholder:text-zinc-600 font-mono text-sm tracking-widest"
                placeholder="PASSWORD"
                autoComplete="current-password"
                disabled={isAuthenticating}
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-xs font-mono"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Authorization failed. Enter valid credentials.</span>
              </motion.div>
            )}

            <button
              id="login-submit-button"
              type="submit"
              disabled={isAuthenticating}
              className="mt-2 relative group flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 hover:from-cyan-500/30 hover:to-cyan-500/20 border border-cyan-500/60 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.15)]"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-cyan-300 font-bold tracking-widest uppercase text-sm font-mono">
                    Authorizing...
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-300 font-bold tracking-widest uppercase text-sm font-mono z-10 relative">
                    Authorize Clearance
                  </span>
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>

      {/* Scanning Line overlay */}
      <motion.div 
        className="absolute inset-0 w-full h-[2px] bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.5)] pointer-events-none"
        initial={{ top: "-10%" }}
        animate={{ top: "110%" }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
