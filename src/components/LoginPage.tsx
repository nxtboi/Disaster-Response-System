import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Crosshair, Lock, User, KeyRound, Loader2, Info, CheckCircle2 } from "lucide-react";
import droneImage from "../assets/images/drone_landing_hero_1787467797692.jpg";

interface AuthorizedCredential {
  username: string;
  password: string;
  role: "admin" | "operator";
  label: string;
}

const AUTHORIZED_ACCOUNTS: AuthorizedCredential[] = [
  {
    username: "user",
    password: "user",
    role: "operator",
    label: "Standard User",
  },
  {
    username: "admin",
    password: "Vijay@147896",
    role: "admin",
    label: "Lead Administrator",
  },
  {
    username: "vijay",
    password: "Vijay@147896",
    role: "admin",
    label: "System Admin",
  },
  {
    username: "operator",
    password: "Operator@123",
    role: "operator",
    label: "Tactical Fleet Operator",
  },
];

function getCustomAccounts(): AuthorizedCredential[] {
  try {
    const raw = localStorage.getItem("drs_registered_users");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (_) {}
  return [];
}

export function LoginPage({ 
  onLogin,
  onCancel,
}: { 
  onLogin: (role: "admin" | "operator", username: string) => void;
  onCancel?: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCredentialsHint, setShowCredentialsHint] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMessage("Please provide both username and security clearance password.");
      return;
    }

    setIsAuthenticating(true);

    setTimeout(() => {
      setIsAuthenticating(false);

      // Verify against authorized system accounts and custom local accounts
      const allAccounts = [...AUTHORIZED_ACCOUNTS, ...getCustomAccounts()];
      const matchedAccount = allAccounts.find(
        (acc) => acc.username.toLowerCase() === cleanUsername && acc.password === cleanPassword
      );

      if (!matchedAccount) {
        setErrorMessage("Access Denied: Invalid security clearance credentials.");
        return;
      }

      onLogin(matchedAccount.role, matchedAccount.username);
    }, 700);
  };

  const handleFillPreset = (presetUser: string, presetPass: string) => {
    setUsername(presetUser);
    setPassword(presetPass);
    setErrorMessage(null);
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
        <div className="relative bg-zinc-950/85 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
          {onCancel && (
            <button
              onClick={onCancel}
              type="button"
              className="absolute top-4 right-4 text-xs font-mono text-zinc-400 hover:text-cyan-300 px-2 py-1 rounded border border-zinc-800 hover:border-cyan-500/40 bg-zinc-900/60 transition-all"
              title="Return to Command Center"
            >
              ESC / BACK
            </button>
          )}
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
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className={`w-full bg-zinc-900/70 border ${
                  errorMessage ? "border-rose-500/70 focus:border-rose-400" : "border-zinc-800 focus:border-cyan-500/60"
                } text-zinc-100 rounded-lg pl-10 pr-4 py-3 outline-none transition-colors placeholder:text-zinc-600 font-mono text-sm`}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                className={`w-full bg-zinc-900/70 border ${
                  errorMessage ? "border-rose-500/70 focus:border-rose-400" : "border-zinc-800 focus:border-cyan-500/60"
                } text-zinc-100 rounded-lg pl-10 pr-4 py-3 outline-none transition-colors placeholder:text-zinc-600 font-mono text-sm tracking-widest`}
                placeholder="CLEARANCE PASSWORD"
                autoComplete="current-password"
                disabled={isAuthenticating}
              />
            </div>

            <AnimatePresence>
              {errorMessage && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: "auto" }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2 text-rose-400 bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg text-xs font-mono shadow-sm"
                >
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              id="login-submit-button"
              type="submit"
              disabled={isAuthenticating}
              className="mt-2 relative group flex items-center justify-center gap-2 w-full py-3.5 bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 hover:from-cyan-500/30 hover:to-cyan-500/20 border border-cyan-500/60 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.15)] active:scale-[0.99]"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                  <span className="text-cyan-300 font-bold tracking-widest uppercase text-sm font-mono">
                    Verifying Credentials...
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

            {/* Hint & Presets Modal/Drawer for Authorized Users */}
            <div className="mt-2 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setShowCredentialsHint(!showCredentialsHint)}
                className="text-[11px] font-mono text-zinc-500 hover:text-cyan-400 flex items-center gap-1 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showCredentialsHint ? "Hide Clearance Info" : "View Authorized Clearance Roles"}</span>
              </button>

              {showCredentialsHint && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 w-full bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-400 flex flex-col gap-2"
                >
                  <div className="text-[11px] font-semibold text-zinc-300 flex items-center gap-1.5 pb-1 border-b border-zinc-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Authorized System Roles</span>
                  </div>

                  <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-zinc-800/60 transition-colors">
                    <div>
                      <span className="text-emerald-400 font-bold">User:</span>{" "}
                      <span className="text-zinc-200">user</span> / <span className="text-zinc-300">user</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFillPreset("user", "user")}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] hover:bg-emerald-500/30"
                    >
                      Fill
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-zinc-800/60 transition-colors">
                    <div>
                      <span className="text-amber-400 font-bold">Admin:</span>{" "}
                      <span className="text-zinc-200">admin</span> / <span className="text-zinc-300">Vijay@147896</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFillPreset("admin", "Vijay@147896")}
                      className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] hover:bg-amber-500/30"
                    >
                      Fill
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-zinc-800/60 transition-colors">
                    <div>
                      <span className="text-cyan-400 font-bold">Operator:</span>{" "}
                      <span className="text-zinc-200">operator</span> / <span className="text-zinc-300">Operator@123</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFillPreset("operator", "Operator@123")}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] hover:bg-cyan-500/30"
                    >
                      Fill
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
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
