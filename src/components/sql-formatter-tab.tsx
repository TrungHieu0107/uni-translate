import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  Sparkles, 
  Trash2, 
  Copy, 
  Check, 
  Code, 
  Maximize2, 
  Layout, 
  Terminal,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { PageHeader } from "./ui/page-header";
import { CodeContainer } from "./ui/code-container";
import { LoadingOverlay } from "./ui/loading-overlay";

export function SQLFormatterTab() {
  const [inputSql, setInputSql] = useState(() => localStorage.getItem("formatter_inputSql") || "");
  const [outputSql, setOutputSql] = useState("");
  const [isFormatting, setIsFormatting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("formatter_inputSql", inputSql);
  }, [inputSql]);

  const handleFormat = async () => {
    if (!inputSql.trim()) return;

    try {
      setIsFormatting(true);
      // Artificial delay for "pro" feel and animation visibility
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const result = await invoke<string>("format_sql", { query: inputSql });
      setOutputSql(result);
    } catch (err) {
      console.error("Formatting failed:", err);
      alert(`Failed to format SQL: ${err}`);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleCopy = () => {
    if (!outputSql) return;
    navigator.clipboard.writeText(outputSql);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClear = () => {
    setInputSql("");
    setOutputSql("");
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-drac-bg-primary overflow-hidden relative">
      <PageHeader 
        title="SQL Formatter Pro"
        description="Transform messy SQL queries into clean, standardized, and readable code."
        icon={<Layout size={24} className="text-drac-accent" />}
        actions={
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isFormatting || !inputSql}
              className="text-drac-text-secondary hover:text-drac-danger"
            >
              <Trash2 size={16} className="mr-2" />
              Clear
            </Button>
            <Button 
              variant="accent"
              size="lg"
              onClick={handleFormat}
              disabled={isFormatting || !inputSql.trim()}
              className="shadow-lg shadow-drac-accent/20 px-8"
              leftIcon={isFormatting ? (
                <Zap className="animate-pulse text-yellow-400" size={18} />
              ) : (
                <Sparkles size={18} />
              )}
            >
              {isFormatting ? "FORMATTING..." : "FORMAT SQL"}
            </Button>
          </div>
        }
      />

      <div className="flex-1 flex gap-6 p-6 overflow-hidden">
        {/* Left Side: Input */}
        <motion.div 
          className="w-1/2 flex flex-col"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <CodeContainer 
            title="Raw SQL Input"
            icon={<Code size={14} />}
            className="flex-1"
            dotColor="bg-drac-warning"
          >
            <textarea 
              wrap="off"
              className="flex-1 p-6 bg-transparent outline-none resize-none font-mono text-sm leading-relaxed scrollbar-dracula text-drac-text-primary placeholder:text-drac-text-secondary/30 transition-all focus:bg-drac-bg-tertiary/10 whitespace-pre overflow-x-auto"
              placeholder={`-- Paste your messy SQL here\nSELECT * FROM dbo.Employees e WHERE e.ManagerID IS NULL UNION ALL SELECT e.EmployeeID, e.Name, e.ManagerID, h.Level + 1 FROM dbo.Employees e INNER JOIN EmployeeHierarchy h ON e.ManagerID = h.EmployeeID`}
              value={inputSql}
              onChange={(e) => setInputSql(e.target.value)}
              spellCheck={false}
            />
          </CodeContainer>
        </motion.div>

        {/* Right Side: Output */}
        <motion.div 
          className="w-1/2 flex flex-col"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <CodeContainer 
            title="Standardized Output"
            icon={<Maximize2 size={14} />}
            className="flex-1"
            dotColor="bg-drac-success"
            actions={outputSql && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCopy}
                className="h-7 px-3 text-[10px] bg-drac-bg-tertiary/50 hover:bg-drac-accent/20 hover:text-drac-accent transition-all"
              >
                {isCopied ? (
                  <><Check size={12} className="mr-1" /> COPIED</>
                ) : (
                  <><Copy size={12} className="mr-1" /> COPY SQL</>
                )}
              </Button>
            )}
          >
            <AnimatePresence mode="wait">
              {outputSql ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 p-6 font-mono text-sm leading-relaxed whitespace-pre scrollbar-dracula overflow-auto text-drac-text-primary selection:bg-drac-accent/30"
                >
                  {outputSql}
                </motion.div>
              ) : (
                <motion.div 
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 flex flex-col items-center justify-center text-drac-text-secondary/40 select-none"
                >
                  <Terminal size={64} className="mb-4 opacity-10" />
                  <p className="text-xs font-medium tracking-widest uppercase">Waiting for formatting...</p>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Shimmer effect when loading */}
            {isFormatting && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none bg-drac-bg-secondary/50 backdrop-blur-[1px]">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-drac-accent/5 to-transparent -translate-x-full animate-shimmer" />
                <div className="flex flex-col gap-3 p-6 mt-2">
                  <div className="h-4 w-3/4 bg-drac-border/50 rounded animate-pulse" />
                  <div className="h-4 w-1/2 bg-drac-border/50 rounded animate-pulse delay-75" />
                  <div className="h-4 w-5/6 bg-drac-border/50 rounded animate-pulse delay-150" />
                  <div className="h-4 w-2/3 bg-drac-border/50 rounded animate-pulse delay-300" />
                </div>
              </div>
            )}
          </CodeContainer>
        </motion.div>
      </div>

      <LoadingOverlay 
        isVisible={isFormatting} 
        title="Engine Processing" 
        subtitle="Applying Lexical Normalization..."
      />
    </div>
  );
}
