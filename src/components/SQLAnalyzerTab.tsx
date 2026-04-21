import { useState, useEffect } from "react";
import { Play, Code2, Layers, AlertTriangle, Info, Terminal, Search } from "lucide-react";
import { parseJavaSQL, PathResult, parseJavaSegments, extractConditionVariables } from "../lib/javaCodeParser";
import { PathCard } from "./PathCard";
import { useDictionary, DictionaryEntry } from "../hooks/useDictionary";
import { formatError } from "../lib/errors";

export function SQLAnalyzerTab() {
  const { search, isLoading: isDictLoading } = useDictionary();
  const [javaCode, setJavaCode] = useState(() => localStorage.getItem("analyzer_javaCode") || "");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [paths, setPaths] = useState<PathResult[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [translations, setTranslations] = useState<Record<string, DictionaryEntry | null>>({});

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("analyzer_javaCode", javaCode);
  }, [javaCode]);

  useEffect(() => {
    if (javaCode.trim() && paths.length === 0 && !isDictLoading) {
      handleAnalyze();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDictLoading]);

  const handleAnalyze = async () => {
    if (!javaCode.trim()) return;

    try {
      setIsAnalyzing(true);
      
      // 1. Analyze Java Code
      const segments = parseJavaSegments(javaCode);
      const detectedVars = extractConditionVariables(segments);
      setVariables(detectedVars);
      
      const generatedPaths = parseJavaSQL(javaCode);
      setPaths(generatedPaths);

      // 2. Batch translation lookup for all unique columns
      const allCols = new Set<string>();
      generatedPaths.forEach(p => p.columns.forEach(c => allCols.add(c.en)));
      
      const colArray = Array.from(allCols);
      const newTranslations: Record<string, DictionaryEntry | null> = {};
      
      // Perform parallel lookups
      await Promise.all(colArray.map(async (col) => {
        const res = await search(col);
        if (res && res.exact && res.exact.length > 0) {
          newTranslations[col] = res.exact[0];
        } else {
          newTranslations[col] = null;
        }
      }));

      setTranslations(newTranslations);
    } catch (err) {
      const { message, code } = formatError(err);
      console.error(`[${code}] Analysis failed:`, message);
      alert(`Failed to analyze code: ${message} (Code: ${code})`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-drac-bg-primary overflow-hidden">
      {/* Header Area */}
      <div className="p-6 pb-2 border-b border-drac-border flex justify-between items-end bg-drac-bg-secondary/30">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-drac-accent">
            <Code2 size={24} />
            <h1 className="text-xl font-bold tracking-tight">Java SQL Code Analyzer</h1>
          </div>
          <p className="text-xs text-drac-text-secondary">
            Paste Java method body with <code className="text-drac-text-accent">StringBuffer.append()</code> to extract column mappings.
          </p>
        </div>
        <button 
          className="flex items-center gap-2 bg-drac-accent text-drac-bg-secondary px-6 py-2.5 rounded-lg font-bold shadow-lg hover:bg-drac-accent-hover active:scale-95 transition-all disabled:opacity-50"
          onClick={handleAnalyze}
          disabled={isAnalyzing || !javaCode.trim() || isDictLoading}
        >
          {isAnalyzing ? (
            <Layers className="animate-spin" size={18} />
          ) : (
            <Play size={18} fill="currentColor" />
          )}
          {isAnalyzing ? "ANALYZING..." : "ANALYZE CODE"}
        </button>
      </div>

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left Side: Code Input */}
        <div className="w-1/2 flex flex-col gap-4">
          <div className="flex-1 flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-inner group focus-within:border-drac-accent/50 transition-colors">
            <div className="px-4 py-2 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary flex items-center gap-2">
                <Terminal size={12} />
                Java Source Snippet
              </span>
              {javaCode && (
                <button 
                  className="text-[10px] text-drac-danger hover:underline"
                  onClick={() => setJavaCode("")}
                >
                  Clear
                </button>
              )}
            </div>
            <textarea 
              className="flex-1 p-4 bg-transparent outline-none resize-none font-mono text-xs leading-relaxed scrollbar-dracula"
              placeholder={`Example:
sql.append("UKETSUKE_NO,");
if (AllRefrectFg) {
    sql.append("KOSHIN_FG,");
}`}
              value={javaCode}
              onChange={(e) => setJavaCode(e.target.value)}
              spellCheck={false}
            />
          </div>
          
          {variables.length > 0 && (
            <div className="bg-drac-bg-secondary/50 border border-drac-border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2 text-drac-text-secondary">
                <Info size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Detected Conditions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {variables.map(v => (
                  <span key={v} className="px-2 py-0.5 rounded bg-drac-bg-tertiary border border-drac-border text-[10px] text-drac-accent font-mono">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Results */}
        <div className="w-1/2 flex flex-col gap-4">
          {paths.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-drac-text-secondary border-2 border-dashed border-drac-border rounded-xl opacity-50 bg-drac-bg-secondary/10">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium">No analysis data yet</p>
              <p className="text-[10px]">Paths and Column mappings will appear here after analysis</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-drac-bg-secondary/10 rounded-xl border border-drac-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-drac-bg-tertiary/30 border-b border-drac-border shrink-0">
                <span className="text-xs font-bold uppercase tracking-widest text-drac-text-primary">
                  Found {paths.length} unique execution paths
                </span>
                {Object.values(translations).some(t => t === null) && (
                  <div className="flex items-center gap-1 text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    <AlertTriangle size={12} />
                    MISSING MAPPINGS
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-dracula p-4 flex flex-col gap-4 bg-drac-bg-primary/30">
                {paths.map((path, idx) => (
                  <PathCard 
                    key={idx} 
                    path={path} 
                    translations={translations}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
