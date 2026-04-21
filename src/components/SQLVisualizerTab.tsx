import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Trash2, Send, FileText, Code, Loader2 } from "lucide-react";
import { parseToIR, renderIR, IRNode } from "../lib/sqlConditionVisualizer";
import { SnippetFile, SnippetMatcher } from "../lib/snippetMatcher";
import { VisualizerOutput } from "./VisualizerOutput";
import { SnippetPanel } from "./SnippetPanel";

export function SQLVisualizerTab() {
  const [inputCode, setInputCode] = useState(() => localStorage.getItem("visualizer_inputCode") || "");
  const [copied, setCopied] = useState<"text" | "md" | null>(null);
  const [nodes, setNodes] = useState<IRNode[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  
  // Snippet State
  const [snippetFile, setSnippetFile] = useState<SnippetFile>(() => {
    const saved = localStorage.getItem("visualizer_snippetFile");
    return saved ? JSON.parse(saved) : { exact: {}, patterns: [] };
  });
  const [snippetFileName, setSnippetFileName] = useState<string | null>(() => 
    localStorage.getItem("visualizer_snippetFileName")
  );

  const matcher = useMemo(() => new SnippetMatcher(snippetFile), [snippetFile]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("visualizer_inputCode", inputCode);
  }, [inputCode]);

  useEffect(() => {
    localStorage.setItem("visualizer_snippetFile", JSON.stringify(snippetFile));
    if (snippetFileName) localStorage.setItem("visualizer_snippetFileName", snippetFileName);
  }, [snippetFile, snippetFileName]);

  const [isVisualizing, setIsVisualizing] = useState(false);
  const [outputText, setOutputText] = useState("");

  // Debounced parsing and rendering
  useEffect(() => {
    if (!inputCode.trim()) {
      setOutputText("");
      setUnmatched([]);
      setIsVisualizing(false);
      return;
    }

    setIsVisualizing(true);
    const timer = setTimeout(() => {
      try {
        const irNodes = parseToIR(inputCode);
        setNodes(irNodes);
        const renderRes = renderIR(irNodes, { matcher });
        setOutputText(renderRes.output);
        setUnmatched(renderRes.unmatched);
      } catch (e) {
        console.error("Parse error", e);
        setOutputText("");
        setUnmatched([]);
      } finally {
        setIsVisualizing(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [inputCode, matcher]);

  const groupIds = useMemo(() => {
    const ids = new Set<string>();
    nodes.forEach(n => {
      if (n.kind === "if_group") ids.add(n.id);
    });
    return Array.from(ids).sort();
  }, [nodes]);

  const handleCopy = (type: "text" | "md") => {
    // Strip internal markers used for UI styling
    let content = outputText
      .replace(/\[E\]/g, "")
      .replace(/\[P\]~/g, "") // Strip pattern marker and the prefix ~
      .replace(/\[F\]/g, ""); // Strip fallback marker

    if (type === "md") {
      content = "```sql\n" + content + "\n```";
    }
    navigator.clipboard.writeText(content);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const clear = () => {
    setInputCode("");
    setNodes([]);
  };

  const jumpToGroup = (id: string) => {
    const el = document.getElementById(`group-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-amber-400", "ring-offset-2", "ring-offset-drac-bg-primary");
      setTimeout(() => {
        el.classList.remove("ring-2", "ring-amber-400", "ring-offset-2", "ring-offset-drac-bg-primary");
      }, 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-drac-bg-primary overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-2 border-b border-drac-border bg-drac-bg-secondary/30 flex justify-between items-end shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-amber-400">
            <FileText size={24} />
            <h1 className="text-xl font-bold tracking-tight">SQL Condition Visualizer</h1>
          </div>
          <p className="text-xs text-drac-text-secondary">
            Visualize complex SQL construction logic with inline condition blocks.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-drac-bg-tertiary border border-drac-border text-drac-text-secondary hover:text-drac-danger hover:border-drac-danger transition-all active:scale-95"
            onClick={clear}
          >
            <Trash2 size={14} />
            CLEAR
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 min-h-0 overflow-y-auto scrollbar-dracula">
        {/* Snippet Panel */}
        <SnippetPanel 
          snippetFile={snippetFile}
          fileName={snippetFileName}
          unmatched={unmatched}
          onLoad={(file, name) => {
            setSnippetFile(file);
            setSnippetFileName(name);
          }}
          onUpdate={setSnippetFile}
        />

        {/* Dual Pane View */}
        <div className="flex-1 flex gap-4 min-h-[500px]">
          {/* Input Pane */}
          <div className="flex-1 flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-lg group focus-within:border-amber-400/50 transition-colors">
            <div className="px-4 py-1.5 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-drac-danger" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary">Java Code Input</span>
            </div>
            <textarea 
              className="flex-1 p-4 bg-transparent outline-none resize-none font-mono text-xs leading-relaxed scrollbar-dracula"
              placeholder='sql.append("SELECT * FROM PRODUCT ");&#10;if(code != null) {&#10;  sql.append("WHERE CD = " + code);&#10;}'
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Icon Gap */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-drac-bg-secondary border border-drac-border flex items-center justify-center text-amber-400 shadow-lg animate-bounce-x">
              <Send size={18} />
            </div>
          </div>

          {/* Output Pane */}
          <div className="flex-1 flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-lg relative">
            <div className="px-4 py-1.5 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-drac-success" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary">
                  SQL Document Output
                </span>
              </div>
              
              <div className="flex gap-2">
                <button 
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold transition-all active:scale-95 ${
                    copied === "text" ? "text-drac-success bg-drac-success/10" : "text-amber-400 hover:bg-drac-bg-primary"
                  }`}
                  onClick={() => handleCopy("text")}
                  disabled={!outputText}
                >
                  {copied === "text" ? <Check size={12} /> : <Copy size={12} />}
                  {copied === "text" ? "COPIED" : "COPY TEXT"}
                </button>
                <button 
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold transition-all active:scale-95 ${
                    copied === "md" ? "text-drac-success bg-drac-success/10" : "text-drac-purple hover:bg-drac-bg-primary"
                  }`}
                  onClick={() => handleCopy("md")}
                  disabled={!outputText}
                >
                  <Code size={12} />
                  {copied === "md" ? "COPIED" : "COPY MD"}
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {isVisualizing && (
                <div className="absolute inset-0 bg-drac-bg-primary/50 backdrop-blur-[1px] z-10 flex items-center justify-center animate-fade-in">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="text-amber-400 animate-spin" size={24} />
                    <span className="text-[10px] font-bold text-amber-400 tracking-widest animate-pulse">VISUALIZING...</span>
                  </div>
                </div>
              )}
              {!outputText && !inputCode.trim() ? (
                <div className="flex-1 flex flex-col items-center justify-center text-drac-text-secondary opacity-30 italic p-6 text-center">
                  <FileText size={48} className="mb-4" />
                  <p className="text-sm">Enter Java code on the left to visualize conditions</p>
                </div>
              ) : (
                <VisualizerOutput content={outputText} />
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        {groupIds.length > 0 && (
          <div className="mt-4 p-4 bg-drac-bg-secondary rounded-xl border border-drac-border flex items-center gap-4 animate-slide-up shrink-0">
            <span className="text-[10px] font-bold text-drac-text-secondary uppercase tracking-wider">Condition Groups detected:</span>
            <div className="flex gap-2">
              {groupIds.map(id => (
                <button
                  key={id}
                  onClick={() => jumpToGroup(id)}
                  className="w-8 h-8 rounded-lg bg-drac-bg-tertiary border border-drac-border text-amber-400 font-bold text-xs flex items-center justify-center hover:bg-amber-400 hover:text-drac-bg-secondary transition-all"
                >
                  {id}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-drac-text-secondary italic ml-auto">Click a group to jump to its location in the output</span>
          </div>
        )}
      </div>
    </div>
  );
}
