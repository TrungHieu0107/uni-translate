import { useState, useEffect } from "react";
import { Send, Copy, Check, Trash2, Split, TableProperties, AlertCircle, Sparkles, Database } from "lucide-react";
import { resolveAliasesFromSQL, ResolveResult } from "../lib/sql-alias-resolver";
import { AliasBadgeList } from "./alias-badge-list";
import { DiffView } from "./diff-view";
import { Button } from "./ui/button";
import { PageHeader } from "./ui/page-header";
import { CodeContainer } from "./ui/code-container";
import { LoadingOverlay } from "./ui/loading-overlay";
import { Badge } from "./ui/badge";

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
  const [isResolving, setIsResolving] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("resolver_inputSql", inputSql);
    localStorage.setItem("resolver_tableMappings", JSON.stringify(tableMappings));
  }, [inputSql, tableMappings]);

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

    return () => clearTimeout(timer);
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
    <div className="flex-1 flex flex-col min-h-0 bg-drac-bg-primary overflow-hidden relative">
      <PageHeader 
        title="SQL Alias Resolver"
        description="Resolve table aliases into full names for unambiguous, clean SQL."
        icon={<TableProperties size={24} />}
        actions={
          <>
            <Button 
              variant={showMappings ? "accent" : "secondary"}
              size="sm"
              onClick={() => setShowMappings(!showMappings)}
              leftIcon={<Database size={14} />}
            >
              MAPPINGS
            </Button>
            <Button 
              variant={showDiff ? "accent" : "secondary"}
              size="sm"
              onClick={() => setShowDiff(!showDiff)}
              leftIcon={<Split size={14} />}
            >
              {showDiff ? "SHOW RESOLVED" : "COMPARE DIFF"}
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              onClick={clear}
              leftIcon={<Trash2 size={14} />}
              className="hover:text-drac-danger hover:bg-drac-danger/10"
            >
              CLEAR
            </Button>
          </>
        }
      />

      <div className="flex-1 flex flex-col p-6 min-h-0 overflow-hidden">
        {/* Mappings Panel */}
        {showMappings && (
          <div className="mb-4 p-4 bg-drac-bg-secondary rounded-xl border border-drac-accent/30 shadow-lg animate-slide-up">
             <div className="flex items-center justify-between mb-3">
               <div className="flex items-center gap-2 text-drac-accent">
                 <Database size={16} />
                 <span className="text-xs font-bold uppercase tracking-wider">Dynamic Table Mappings</span>
               </div>
               <span className="text-[10px] text-drac-text-secondary italic font-medium">Format: ALIAS = TABLE_NAME (one per line)</span>
             </div>
             <textarea 
               className="w-full h-24 p-3 bg-drac-bg-primary rounded-lg border border-drac-border font-mono text-xs focus:border-drac-accent outline-none text-drac-text-primary transition-all"
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
            <Badge variant="success" className="gap-1.5 animate-pulse py-1">
              <Sparkles size={12} />
              RESOLVED {result.changeCount} REFERENCES
            </Badge>
          )}
        </div>

        {/* Dual Pane View */}
        <div className="flex-1 flex gap-4 min-h-0">
          <CodeContainer 
            title="Raw SQL Input"
            className="flex-1"
            dotColor="bg-drac-danger"
          >
            <textarea 
              className="flex-1 p-4 bg-transparent outline-none resize-none font-mono text-xs leading-relaxed scrollbar-dracula text-drac-text-primary"
              placeholder="SELECT S.NAME FROM R_SYOHIN S JOIN ..."
              value={inputSql}
              onChange={(e) => setInputSql(e.target.value)}
              spellCheck={false}
            />
          </CodeContainer>

          <div className="flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-drac-bg-secondary border border-drac-border flex items-center justify-center text-drac-accent shadow-lg">
              <Send size={18} />
            </div>
          </div>

          <CodeContainer 
            title={showDiff ? "Diff Comparison" : "Resolved Output"}
            className="flex-1"
            dotColor="bg-drac-success"
            actions={
              <Button 
                variant="ghost"
                size="sm"
                className={`h-7 px-2 text-[10px] ${copied ? "text-drac-success" : ""}`}
                onClick={handleCopy}
                disabled={!result}
                leftIcon={copied ? <Check size={12} /> : <Copy size={12} />}
              >
                {copied ? "COPIED" : "COPY OUTPUT"}
              </Button>
            }
          >
            <div className="flex-1 flex flex-col min-h-0 relative">
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

              {result && result.unknownAliases.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3 animate-slide-up backdrop-blur-sm">
                  <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-amber-500 uppercase">Unknown Alias Detection</span>
                    <p className="text-[10px] text-amber-500/80 leading-tight font-medium">
                      References like <code className="font-bold underline">{result.unknownAliases.join(", ")}</code> were found but their tables aren't defined in the FROM/JOIN clauses.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CodeContainer>
        </div>
      </div>

      <LoadingOverlay isVisible={isResolving} title="Resolving SQL" subtitle="Analyzing Alias Mappings" />
      
      {copied && (
        <div className="absolute bottom-10 right-10 bg-drac-success text-drac-bg-primary text-xs font-black px-4 py-2 rounded-full shadow-[0_0_20px_rgba(80,250,123,0.4)] animate-bounce-in z-50 tracking-widest uppercase">
          Copied Resolved SQL
        </div>
      )}
    </div>
  );
}
