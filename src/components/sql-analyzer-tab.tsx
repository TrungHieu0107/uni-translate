import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Code2, Layers, AlertTriangle, Info, Terminal, Search } from "lucide-react";
import { parseJavaSQL, PathResult, parseJavaSegments, extractConditionVariables } from "../lib/java-code-parser";
import { PathCard } from "./path-card";
import { useDictionary, DictionaryEntry } from "../hooks/use-dictionary";
import { formatError } from "../lib/errors";
import { Button } from "./ui/button";
import { PageHeader } from "./ui/page-header";
import { CodeContainer } from "./ui/code-container";
import { LoadingOverlay } from "./ui/loading-overlay";
import { Badge } from "./ui/badge";

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
      
      const segments = parseJavaSegments(javaCode);
      const detectedVars = extractConditionVariables(segments);
      setVariables(detectedVars);
      
      const generatedPaths = parseJavaSQL(javaCode);
      setPaths(generatedPaths);

      const allCols = new Set<string>();
      generatedPaths.forEach(p => p.columns.forEach(c => allCols.add(c.en)));
      
      const colArray = Array.from(allCols);
      const newTranslations: Record<string, DictionaryEntry | null> = {};
      
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
    <div className="flex-1 flex flex-col min-h-0 bg-drac-bg-primary overflow-hidden relative">
      <PageHeader 
        title="Java SQL Code Analyzer"
        description="Paste Java method body with StringBuffer.append() to extract column mappings."
        icon={<Code2 size={24} />}
        actions={
          <Button 
            variant="accent"
            size="lg"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !javaCode.trim() || isDictLoading}
            leftIcon={isAnalyzing ? <Layers className="animate-spin" size={18} /> : <Play size={18} fill="currentColor" />}
          >
            {isAnalyzing ? "ANALYZING..." : "ANALYZE CODE"}
          </Button>
        }
      />

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left Side: Code Input */}
        <motion.div 
          className="w-1/2 flex flex-col gap-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CodeContainer 
            className="flex-1"
            title="Java Source Snippet"
            icon={<Terminal size={12} />}
            actions={javaCode && (
              <button 
                className="text-[10px] text-drac-danger hover:underline font-bold uppercase tracking-widest"
                onClick={() => setJavaCode("")}
              >
                Clear
              </button>
            )}
          >
            <textarea 
              className="flex-1 p-4 bg-transparent outline-none resize-none font-mono text-xs leading-relaxed scrollbar-dracula text-drac-text-primary"
              placeholder={`Example:
sql.append("UKETSUKE_NO,");
if (AllRefrectFg) {
    sql.append("KOSHIN_FG,");
}`}
              value={javaCode}
              onChange={(e) => setJavaCode(e.target.value)}
              spellCheck={false}
            />
          </CodeContainer>
          
          {variables.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-drac-bg-secondary/50 border border-drac-border rounded-lg p-3"
            >
              <div className="flex items-center gap-2 mb-2 text-drac-text-secondary">
                <Info size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Detected Conditions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {variables.map(v => (
                  <Badge key={v} variant="accent" className="font-mono">
                    {v}
                  </Badge>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Right Side: Results */}
        <motion.div 
          className="w-1/2 flex flex-col gap-4"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {paths.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-drac-text-secondary border-2 border-dashed border-drac-border rounded-xl opacity-50 bg-drac-bg-secondary/10">
              <Search size={48} className="mb-4 opacity-20" />
              <p className="text-sm font-medium text-drac-text-primary">No analysis data yet</p>
              <p className="text-[10px]">Paths and Column mappings will appear here after analysis</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-drac-bg-secondary/10 rounded-xl border border-drac-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-drac-bg-tertiary/30 border-b border-drac-border shrink-0">
                <span className="text-xs font-bold uppercase tracking-widest text-drac-text-primary">
                  Found {paths.length} unique execution paths
                </span>
                {Object.values(translations).some(t => t === null) && (
                  <Badge variant="danger" className="gap-1">
                    <AlertTriangle size={12} />
                    MISSING MAPPINGS
                  </Badge>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto scrollbar-dracula p-4 flex flex-col gap-4 bg-drac-bg-primary/30">
                <AnimatePresence mode="popLayout">
                  {paths.map((path, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <PathCard 
                        path={path} 
                        translations={translations}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
        
        <LoadingOverlay 
          isVisible={isAnalyzing} 
          title="Analyzing System" 
          subtitle="Cross-Path Variable Resolution"
        />
      </div>
    </div>
  );
}
