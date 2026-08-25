import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, Terminal, Code2, Play, Sparkles, Copy, Check, 
  FileCode, FolderTree, RefreshCw, Download, Layers, Eye, 
  Cpu, FilePlus, ChevronRight, CheckCircle2, ArrowRight, 
  LogOut, Monitor, Database, Wrench, AlertCircle, Search, 
  Save, GitCommit, Split
} from "lucide-react";
import { 
  INITIAL_PROJECT_FILES, 
  generateVibeCode, 
  GeneratedFile, 
  VibePromptResult 
} from "./adminVibeEngine";
import { LivePreviewSandbox } from "./LivePreviewSandbox";

export function AdminPanel({
  onLaunchCommandCenter,
  onExploreSystem,
  onLogout,
}: {
  onLaunchCommandCenter: () => void;
  onExploreSystem: () => void;
  onLogout: () => void;
}) {
  const [projectFiles, setProjectFiles] = useState<GeneratedFile[]>(INITIAL_PROJECT_FILES);
  const [selectedFileId, setSelectedFileId] = useState<string>("app-tsx");
  const [vibePrompt, setVibePrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"code" | "preview" | "diff" | "architecture">("code");
  const [lastVibeResult, setLastVibeResult] = useState<VibePromptResult | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editorCode, setEditorCode] = useState<string>(
    INITIAL_PROJECT_FILES[0]?.content || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [executionLogs, setExecutionLogs] = useState<string[]>([
    "[SYS_INIT] DRS Admin VibeCoding Engine v2.4 initialized.",
    "[AUTH] Administrator session authenticated for user: admin.",
    "[FS_LOAD] 5 core system files mounted in virtual project workspace.",
  ]);

  const selectedFile = projectFiles.find((f) => f.id === selectedFileId) || projectFiles[0];

  const handleSelectFile = (file: GeneratedFile) => {
    setSelectedFileId(file.id);
    setEditorCode(file.content);
  };

  const handleRunVibePrompt = (presetText?: string) => {
    const textToRun = presetText || vibePrompt;
    if (!textToRun.trim()) return;

    setIsGenerating(true);
    setExecutionLogs((prev) => [
      `[VIBE_IN] Synthesizing prompt: "${textToRun.slice(0, 45)}..."`,
      ...prev,
    ]);

    setTimeout(() => {
      const result = generateVibeCode(textToRun);
      setLastVibeResult(result);

      // Merge new files or update existing
      setProjectFiles((prev) => {
        const next = [...prev];
        result.files.forEach((newFile) => {
          const idx = next.findIndex((f) => f.name === newFile.name || f.path === newFile.path);
          if (idx >= 0) {
            next[idx] = { ...newFile, status: "modified" };
          } else {
            next.push(newFile);
          }
        });
        return next;
      });

      // Select newly generated file
      if (result.files.length > 0) {
        setSelectedFileId(result.files[0].id);
        setEditorCode(result.files[0].content);
      }

      setExecutionLogs((prev) => [
        `[VIBE_OK] Successfully generated ${result.targetFileName} (${result.targetPath})`,
        `[DIFF] 1 file added/updated with TypeScript compliance.`,
        ...prev,
      ]);

      setIsGenerating(false);
      setActiveTab("code");
    }, 1100);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(editorCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSaveFile = () => {
    setProjectFiles((prev) =>
      prev.map((f) =>
        f.id === selectedFileId
          ? { ...f, content: editorCode, status: "modified" }
          : f
      )
    );
    setSaveSuccess(true);
    setExecutionLogs((prev) => [
      `[SAVE] Changes persisted to virtual file: ${selectedFile.path}`,
      ...prev,
    ]);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([editorCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = selectedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredFiles = projectFiles.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const promptPresets = [
    {
      title: "Radiometric FLIR Target Tracker",
      desc: "Heat signature ironbow detector with human/exhaust categorization",
      prompt: "Build an interactive FLIR Radiometric thermal target tracker component with ironbow heat signature mapping and hotspot detection.",
      icon: "🔥",
    },
    {
      title: "Swarm Mesh Formation Orchestrator",
      desc: "IEEE 802.11ah multi-drone delta/vee vector formation control",
      prompt: "Generate a multi-UAV cooperative swarm mesh formation orchestrator with delta, vee, and perimeter ring routing.",
      icon: "🦅",
    },
    {
      title: "6S BMS Battery & Degradation Forecast",
      desc: "Solid-state multi-cell voltage telemetry and endurance model",
      prompt: "Create a 6S LiPo Smart BMS battery cell telemetry monitor with per-cell voltages and flight endurance forecast.",
      icon: "🔋",
    },
    {
      title: "Airspace ADS-B Radar Transponder",
      desc: "Commercial air traffic proximity beacon & TCAS collision warning",
      prompt: "Build an ADS-B airspace collision avoidance radar widget with transponder altitude detection.",
      icon: "📡",
    },
  ];

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 font-mono overflow-hidden">
      {/* Top Admin HUD Header */}
      <header className="h-14 bg-zinc-900/90 border-b border-cyan-500/30 px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>DRS ADMIN PANEL</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">OPERATOR: <strong className="text-white">admin</strong></span>
            <span className="text-zinc-500">•</span>
            <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 text-[10px] font-bold">
              CLEARANCE: LVL 5
            </span>
          </div>
        </div>

        {/* Global Quick Action Links */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLaunchCommandCenter}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-bold transition-all"
            title="Launch Tactical Drone Command Center"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tactical HUD</span>
          </button>

          <button
            onClick={onExploreSystem}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-bold transition-all"
            title="Open UAV Fleet Database"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fleet Registry</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold transition-all"
            title="Terminate Admin Session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar: Virtual File Tree & Prompt Presets */}
        <aside className="w-72 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 overflow-hidden">
          {/* File Explorer Header */}
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <FolderTree className="w-4 h-4 text-cyan-400" />
              <span>PROJECT FILES</span>
            </div>
            <span className="text-[10px] bg-zinc-900 text-cyan-400 px-1.5 py-0.5 rounded border border-zinc-800 font-bold">
              {projectFiles.length}
            </span>
          </div>

          {/* Search box */}
          <div className="p-2 border-b border-zinc-800">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search project files..."
                className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded pl-8 pr-2 py-1.5 outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {/* File List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredFiles.map((file) => {
              const isSelected = file.id === selectedFileId;
              return (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-all ${
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 font-bold"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-cyan-400" : "text-zinc-500"}`} />
                    <span className="truncate">{file.name}</span>
                  </div>
                  {file.status === "new" && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1 rounded uppercase font-bold shrink-0">
                      NEW
                    </span>
                  )}
                  {file.status === "modified" && (
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 rounded uppercase font-bold shrink-0">
                      MOD
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Vibe Prompt Presets */}
          <div className="border-t border-zinc-800 p-3 bg-zinc-900/40 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>VIBECODE PRESETS</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {promptPresets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setVibePrompt(preset.prompt);
                    handleRunVibePrompt(preset.prompt);
                  }}
                  className="w-full text-left p-2 rounded bg-zinc-900/80 hover:bg-cyan-950/40 hover:border-cyan-500/40 border border-zinc-800 transition-all text-[11px] group"
                >
                  <div className="flex items-center gap-1.5 font-bold text-zinc-200 group-hover:text-cyan-300">
                    <span>{preset.icon}</span>
                    <span className="truncate">{preset.title}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-0.5 truncate">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Center / Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-zinc-950 overflow-hidden">
          {/* Top VibeCoding Prompt Input Bar */}
          <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>VIBECODING ENGINE — PROMPT-TO-CODE SYNTHESIZER</span>
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Model: Gemini-3.7-Flash / DRS Synthesis
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={vibePrompt}
                  onChange={(e) => setVibePrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRunVibePrompt()}
                  placeholder="Enter prompt (e.g. 'Build an AI target tracking thermal sensor with ironbow mapping' or 'Add swarm formation mesh')..."
                  className="w-full bg-zinc-950 border border-cyan-500/30 focus:border-cyan-400 text-zinc-100 rounded-lg px-3.5 py-2.5 text-xs outline-none placeholder:text-zinc-600 font-mono"
                  disabled={isGenerating}
                />
              </div>

              <button
                onClick={() => handleRunVibePrompt()}
                disabled={isGenerating || !vibePrompt.trim()}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-extrabold text-xs rounded-lg transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Code &amp; Files</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Editor Tabs & File Metadata Header */}
          <div className="h-11 bg-zinc-900/80 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs font-bold text-white">
                <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                <span>{selectedFile.name}</span>
                <span className="text-[10px] text-zinc-500">({selectedFile.path})</span>
              </div>
            </div>

            {/* View Mode Switcher Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveTab("code")}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === "code"
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>

              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === "preview"
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>

              <button
                onClick={() => setActiveTab("diff")}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === "diff"
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Split className="w-3.5 h-3.5" />
                <span>File Diff</span>
              </button>

              <button
                onClick={() => setActiveTab("architecture")}
                className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                  activeTab === "architecture"
                    ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Architecture</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveFile}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded text-xs font-bold flex items-center gap-1 transition-all"
                title="Save changes to virtual file"
              >
                {saveSuccess ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                <span>{saveSuccess ? "Saved!" : "Save"}</span>
              </button>

              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold flex items-center gap-1 transition-all"
                title="Copy code to clipboard"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? "Copied" : "Copy"}</span>
              </button>

              <button
                onClick={handleDownloadFile}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-bold flex items-center gap-1 transition-all"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Tab Content Display */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-zinc-950">
            {activeTab === "code" && (
              <div className="h-full flex flex-col border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
                <div className="flex-1 flex overflow-hidden">
                  {/* Line numbers gutter */}
                  <div className="w-12 bg-zinc-900/60 border-r border-zinc-800 text-zinc-600 select-none py-3 font-mono text-xs text-right pr-3 shrink-0 overflow-hidden leading-6">
                    {editorCode.split("\n").map((_, i) => (
                      <div key={i}>{i + 1}</div>
                    ))}
                  </div>
                  {/* Code Editor Textarea */}
                  <textarea
                    value={editorCode}
                    onChange={(e) => setEditorCode(e.target.value)}
                    spellCheck={false}
                    className="flex-1 bg-zinc-950 text-cyan-100 font-mono text-xs p-3 leading-6 outline-none resize-none border-none selection:bg-cyan-500/30 overflow-auto whitespace-pre"
                  />
                </div>
              </div>
            )}

            {activeTab === "preview" && (
              <div className="max-w-4xl mx-auto py-2">
                <LivePreviewSandbox
                  previewType={lastVibeResult?.previewComponentType}
                  customCode={editorCode}
                  fileName={selectedFile.name}
                />
              </div>
            )}

            {activeTab === "diff" && (
              <div className="h-full border border-zinc-800 rounded-xl p-4 bg-zinc-950 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                    <GitCommit className="w-4 h-4 text-cyan-400" />
                    <span>UNIFIED CODE DIFF PREVIEW</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-bold">
                    +{editorCode.split("\n").length} additions • 0 conflicts
                  </span>
                </div>

                <div className="bg-zinc-900/90 rounded-lg p-4 font-mono text-xs space-y-1 overflow-x-auto border border-zinc-800">
                  <div className="text-zinc-500 font-bold mb-2">--- a{selectedFile.path}</div>
                  <div className="text-cyan-400 font-bold mb-2">+++ b{selectedFile.path}</div>
                  {editorCode.split("\n").slice(0, 35).map((line, idx) => (
                    <div key={idx} className="text-emerald-300 bg-emerald-950/20 px-2 py-0.5 rounded">
                      + {line}
                    </div>
                  ))}
                  {editorCode.split("\n").length > 35 && (
                    <div className="text-zinc-500 italic py-1">
                      ... (+{editorCode.split("\n").length - 35} more lines generated)
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "architecture" && (
              <div className="h-full border border-zinc-800 rounded-xl p-5 bg-zinc-950 space-y-5">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-300">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>SYSTEM ARCHITECTURE &amp; IMPORT GUIDE</span>
                  </div>
                  <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded font-bold">
                    TARGET: {selectedFile.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-900/80 rounded-lg border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-white">Suggested Integration Import</div>
                    <pre className="p-3 bg-zinc-950 rounded text-xs text-cyan-300 font-mono border border-zinc-800 overflow-x-auto">
                      {`import { ${selectedFile.name.replace(/\.(tsx|ts)/, "")} } from "${selectedFile.path.replace("/src/", "./").replace(/\.(tsx|ts)/, "")}";`}
                    </pre>
                    <p className="text-[11px] text-zinc-400">
                      Import this synthesized module directly into your main Dashboard or ExploreSystemPage view.
                    </p>
                  </div>

                  <div className="p-4 bg-zinc-900/80 rounded-lg border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-white">Component Architecture Rationale</div>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {selectedFile.description || "Synthesized React functional component utilizing Tailwind utility styling, motion animations, and standard TypeScript interfaces."}
                    </p>
                  </div>
                </div>

                {lastVibeResult && (
                  <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-800 space-y-2">
                    <div className="text-xs font-bold text-cyan-400">Last VibeCoding Session Summary</div>
                    <div className="text-xs text-zinc-300">{lastVibeResult.summary}</div>
                    <div className="flex items-center gap-2 pt-1">
                      {lastVibeResult.tags.map((tag) => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-bold">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Execution Console Log */}
          <div className="h-28 bg-zinc-900/90 border-t border-zinc-800 px-4 py-2 flex flex-col shrink-0">
            <div className="flex items-center justify-between pb-1 text-[11px] font-bold text-zinc-400 border-b border-zinc-800/80">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <Terminal className="w-3.5 h-3.5" />
                <span>VIBECODING COMPILER STREAM</span>
              </div>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-zinc-300 space-y-0.5 pt-1">
              {executionLogs.map((log, index) => (
                <div key={index} className="leading-tight">
                  <span className="text-cyan-500">&gt;</span> {log}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
