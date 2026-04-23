import { useState, useEffect, useMemo } from "react";
import { Copy, Check, Trash2, Send, FileText, Code, Loader2 } from "lucide-react";
import { parseToIR, renderIR, IRNode } from "../lib/sql-condition-visualizer";
import { SnippetFile, SnippetMatcher } from "../lib/snippet-matcher";
import { VisualizerOutput } from "./visualizer-output";
import { SnippetPanel } from "./snippet-panel";
import { PageHeader } from "./ui/page-header";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export function SQLVisualizerTab() {
  const [inputCode, setInputCode] = useState(() => localStorage.getItem("visualizer_inputCode") || "");
  const [copied, setCopied] = useState<"text" | "md" | null>(null);
  const [nodes, setNodes] = useState<IRNode[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  
  const [snippetFile, setSnippetFile] = useState<SnippetFile>(() => {
    const saved = localStorage.getItem("visualizer_snippetFile");
    return saved ? JSON.parse(saved) : { exact: {}, patterns: [] };
  });
  const [snippetFileName, setSnippetFileName] = useState<string | null>(() => 
    localStorage.getItem("visualizer_snippetFileName")
  );

  const matcher = useMemo(() => new SnippetMatcher(snippetFile), [snippetFile]);

  useEffect(() => {
    localStorage.setItem("visualizer_inputCode", inputCode);
  }, [inputCode]);

  useEffect(() => {
    localStorage.setItem("visualizer_snippetFile", JSON.stringify(snippetFile));
    if (snippetFileName) localStorage.setItem("visualizer_snippetFileName", snippetFileName);
  }, [snippetFile, snippetFileName]);

  const [isVisualizing, setIsVisualizing] = useState(false);
  const [outputText, setOutputText] = useState("");

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
    let content = outputText
      .replace(/\[E\]/g, "")
      .replace(/\[P\]~/g, "")
      .replace(/\[F\]/g, "");

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
      <PageHeader 
        title="SQL Condition Visualizer"
        icon={<FileText size={24} className="text-amber-400" />}
        actions={
          <Button 
            variant="ghost" 
            size="sm"
            onClick={clear}
            leftIcon={<Trash2 size={14} />}
            className="text-drac-text-secondary hover:text-drac-danger hover:bg-drac-danger/10"
          >
            CLEAR
          </Button>
        }
        description="Visualize complex SQL construction logic with inline condition blocks."
      />

      <div className="flex-1 flex flex-col p-6 pt-2 min-h-0 overflow-y-auto scrollbar-dracula">
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

        <div className="flex-1 flex gap-6 min-h-[500px] mt-4">
          {/* Input Pane */}
          <div className="flex-1 flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-lg group focus-within:border-amber-400/50 transition-all">
            <div className="px-4 py-2 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-drac-danger" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-drac-text-secondary">Java Logic Source</span>
            </div>
            <textarea 
              wrap="off"
              className="flex-1 p-5 bg-transparent outline-none resize-none font-mono text-xs leading-relaxed scrollbar-dracula text-drac-text-primary whitespace-pre overflow-x-auto"
              placeholder='sql.append("SELECT * FROM PRODUCT ");&#10;if(code != null) {&#10;  sql.append("WHERE CD = " + code);&#10;}'
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-drac-bg-secondary border border-drac-border flex items-center justify-center text-amber-400 shadow-xl animate-pulse ring-4 ring-amber-400/10">
              <Send size={20} />
            </div>
          </div>

          {/* Output Pane */}
          <div className="flex-1 flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-lg relative group/output">
            <div className="px-4 py-2 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-drac-success" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-drac-text-secondary">
                  SQL Documentation
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  variant={copied === "text" ? "success" : "ghost"}
                  size="xs"
                  onClick={() => handleCopy("text")}
                  disabled={!outputText}
                  leftIcon={copied === "text" ? <Check size={12} /> : <Copy size={12} />}
                  className="text-[10px]"
                >
                  {copied === "text" ? "COPIED" : "COPY TEXT"}
                </Button>
                <Button 
                  variant={copied === "md" ? "success" : "ghost"}
                  size="xs"
                  onClick={() => handleCopy("md")}
                  disabled={!outputText}
                  leftIcon={<Code size={12} />}
                  className="text-[10px]"
                >
                  {copied === "md" ? "COPIED" : "COPY MD"}
                </Button>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {isVisualizing && (
                <div className="absolute inset-0 bg-drac-bg-primary/50 backdrop-blur-sm z-10 flex items-center justify-center animate-fade-in">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="text-amber-400 animate-spin" size={32} />
                    <span className="text-[10px] font-black text-amber-400 tracking-[0.4em] animate-pulse uppercase">Visualizing Matrix</span>
                  </div>
                </div>
              )}
              {!outputText && !inputCode.trim() ? (
                <div className="flex-1 flex flex-col items-center justify-center text-drac-text-secondary opacity-30 italic p-10 text-center">
                  <FileText size={48} className="mb-6 opacity-20" />
                  <p className="text-sm font-medium tracking-wide">Enter Java logic to generate documentation</p>
                </div>
              ) : (
                <VisualizerOutput content={outputText} />
              )}

              {copied && (
                <div className="absolute top-4 right-4 bg-drac-success text-drac-bg-primary text-[10px] font-black px-4 py-1.5 rounded shadow-lg animate-bounce-in z-50 tracking-widest uppercase">
                  {copied === "md" ? "Markdown Sync Complete" : "Clipboard Updated"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Interactive Legend */}
        {groupIds.length > 0 && (
          <div className="mt-6 p-5 bg-drac-bg-secondary rounded-2xl border border-drac-border flex items-center gap-6 animate-slide-up shrink-0 shadow-lg">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-black text-drac-text-secondary uppercase tracking-[0.2em]">Logical Groups</span>
              <span className="text-[9px] text-drac-text-secondary/50 italic">Quick navigation matrix</span>
            </div>
            
            <div className="flex gap-2.5">
              {groupIds.map(id => (
                <button
                  key={id}
                  onClick={() => jumpToGroup(id)}
                  className="w-9 h-9 rounded-xl bg-drac-bg-tertiary border border-drac-border text-amber-400 font-black text-sm flex items-center justify-center hover:bg-amber-400 hover:text-drac-bg-primary hover:scale-110 transition-all shadow-md"
                >
                  {id}
                </button>
              ))}
            </div>
            
            <Badge variant="ghost" className="ml-auto text-[9px] opacity-60">
              Interactive Documentation v2.0
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
