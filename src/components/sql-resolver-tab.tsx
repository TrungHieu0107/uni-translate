import { useState, useEffect } from "react";
import { Send, Copy, Check, Trash2, Split, TableProperties, AlertCircle, Sparkles, Database, Loader2 } from "lucide-react";
import { resolveAliasesFromSQL, ResolveResult } from "../lib/sql-alias-resolver";
import { AliasBadgeList } from "./alias-badge-list";
import { DiffView } from "./diff-view";

export function SQLResolverTab() {
  const [inputSql, setInputSql] = useState(() => localStorage.getItem("resolver_inputSql") || "");
const [result, setResult] = useState<ResolveResult | null>(null);
  const [tableMappings, setTableMappings] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("resolver_tableMappings");
    return saved ? JSON.parse(saved) : { "HANBAI": "R_HANBAI_SYOHIN", "RHS": "R_HANBAI_SYOHIN" };
  });
  const [showDiff, setShowDiff] = useState(false);
  const [showMappings, setShowMappings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("resolver_inputSql", inputSql);
    localStorage.setItem("resolver_tableMappings", JSON.stringify(tableMappings));
  }, [inputSql, tableMappings]);

  const [isResolving, setIsResolving] = useState(false);
  
  // Debounced resolution
  useEffect(() => {
    setIsResolving(true);
    const timer = setTimeout(() => {
      try {
        if (inputSql.trim()) {
          const res = resolveAliasesFromSQL(inputSql, tableMappings);
          setResult(res);
        } else {
          setResult(null);
        }
      } finally {
        setIsResolving(false);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [inputSql, tableMappings]);

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.resolvedSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clear = () => {
    setInputSql("");
    setResult(null);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-drac-bg-primary overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-2 border-b border-drac-border bg-drac-bg-secondary/30 flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-drac-accent">
            <TableProperties size={24} />
            <h1 className="text-xl font-bold tracking-tight">SQL Alias Resolver</h1>
          </div>
          <p className="text-xs text-drac-text-secondary">
            Resolve table aliases into full names for unambiguous, clean SQL.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
              showMappings 
                ? "bg-drac-accent text-drac-bg-secondary border-drac-accent shadow-[0_0_15px_rgba(189,147,249,0.3)]" 
                : "bg-drac-bg-tertiary text-drac-text-primary border-drac-border hover:border-drac-accent"
            }`}
            onClick={() => setShowMappings(!showMappings)}
            title="Configure Table Mappings"
          >
            <Database size={14} />
            MAPPINGS
          </button>

          <button 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 border ${
              showDiff 
                ? "bg-drac-accent text-drac-bg-secondary border-drac-accent shadow-[0_0_15px_rgba(189,147,249,0.3)]" 
                : "bg-drac-bg-tertiary text-drac-text-primary border-drac-border hover:border-drac-accent"
            }`}
            onClick={() => setShowDiff(!showDiff)}
            title="Toggle Diff View"
          >
            <Split size={14} />
            {showDiff ? "SHOW RESOLVED" : "COMPARE DIFF"}
          </button>
          
          <button 
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-drac-bg-tertiary border border-drac-border text-drac-text-secondary hover:text-drac-danger hover:border-drac-danger transition-all active:scale-95"
            onClick={clear}
          >
            <Trash2 size={14} />
            CLEAR
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-6 min-h-0">
        {/* Mappings Panel */}
        {showMappings && (
          <div className="mb-4 p-4 bg-drac-bg-secondary rounded-xl border border-drac-accent/30 shadow-lg animate-slide-down">
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2 text-drac-accent">
                 <Database size={16} />
                 <span className="text-xs font-bold uppercase tracking-wider">Dynamic Table Mappings</span>
               </div>
               <span className="text-[10px] text-drac-text-secondary italic">Format: ALIAS = TABLE_NAME (one per line)</span>
             </div>
             <textarea 
               className="w-full h-24 p-3 bg-drac-bg-primary rounded-lg border border-drac-border font-mono text-xs focus:border-drac-accent outline-none"
               placeholder="HANBAI = R_HANBAI_SYOHIN&#10;RHS = R_HANBAI_SYOHIN"
               value={Object.entries(tableMappings).map(([k, v]) => `${k} = ${v}`).join("\n")}
               onChange={(e) => {
                 const newMappings: Record<string, string> = {};
                 e.target.value.split("\n").forEach(line => {
                   const [k, v] = line.split("=").map(s => s.trim());
                   if (k && v) newMappings[k.toUpperCase()] = v;
                 });
                 setTableMappings(newMappings);
               }}
             />
          </div>
        )}
        {/* Alias Bar */}
        <div className="mb-4 px-4 py-3 bg-drac-bg-secondary rounded-xl border border-drac-border shadow-inner flex items-center justify-between min-h-[50px]">
          <AliasBadgeList 
            aliasMap={result?.aliasMap || {}} 
            unknownAliases={result?.unknownAliases || []} 
          />
          
          {result && result.changeCount > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-bold text-drac-success bg-drac-success/10 px-2 py-1 rounded-full border border-drac-success/20 animate-pulse">
              <Sparkles size={12} />
              RESOLVED {result.changeCount} REFERENCES
            </div>
          )}
        </div>

        {/* Dual Pane View */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Input Pane */}
          <div className="flex-1 flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-lg group focus-within:border-drac-accent/50 transition-colors">
            <div className="px-4 py-1.5 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-drac-danger" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary">Raw SQL Input</span>
            </div>
            <textarea 
              className="flex-1 p-4 bg-transparent outline-none resize-none font-mono text-xs leading-relaxed scrollbar-dracula"
              placeholder="SELECT S.NAME FROM R_SYOHIN S JOIN ..."
              value={inputSql}
              onChange={(e) => setInputSql(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Icon Gap */}
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-drac-bg-secondary border border-drac-border flex items-center justify-center text-drac-accent shadow-lg animate-bounce-x">
              <Send size={18} />
            </div>
          </div>

          {/* Output Pane */}
          <div className="flex-1 flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-lg relative">
            <div className="px-4 py-1.5 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-drac-success" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary">
                  {showDiff ? "Diff Comparison" : "Resolved Output"}
                </span>
              </div>
              
              <button 
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] font-bold transition-all active:scale-95 ${
                  copied ? "text-drac-success bg-drac-success/10" : "text-drac-accent hover:bg-drac-bg-primary"
                }`}
                onClick={handleCopy}
                disabled={!result}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "COPIED" : "COPY OUTPUT"}
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {isResolving && (
                <div className="absolute inset-0 bg-drac-bg-primary/50 backdrop-blur-[1px] z-10 flex items-center justify-center animate-fade-in">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="text-drac-accent animate-spin" size={24} />
                    <span className="text-[10px] font-bold text-drac-accent tracking-widest animate-pulse">RESOLVING...</span>
                  </div>
                </div>
              )}
              {!result && !inputSql.trim() ? (
                <div className="flex-1 flex flex-col items-center justify-center text-drac-text-secondary opacity-30 italic p-6 text-center">
                  <TableProperties size={48} className="mb-4" />
                  <p className="text-sm">Enter SQL on the left to resolve aliases</p>
                </div>
              ) : showDiff && result ? (
                <DiffView tokens={result.tokens} />
              ) : (
                <pre className="flex-1 p-4 m-0 font-mono text-xs leading-relaxed overflow-auto scrollbar-dracula whitespace-pre-wrap select-text bg-drac-bg-primary text-drac-text-primary">
                  {result?.resolvedSQL || inputSql}
                </pre>
              )}
            </div>

            {result && result.unknownAliases.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3 animate-slide-up backdrop-blur-sm">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-amber-500 uppercase">Unknown Alias Detection</span>
                  <p className="text-[10px] text-amber-500/80 leading-tight">
                    References like <code className="font-bold underline">{result.unknownAliases.join(", ")}</code> were found but their tables aren't defined in the FROM/JOIN clauses.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
