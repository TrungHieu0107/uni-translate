import { useState } from "react";
import { FolderOpen, Download, Plus, Settings2, HelpCircle } from "lucide-react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { SnippetFile, exportSnippetFile } from "../lib/snippetMatcher";

interface SnippetPanelProps {
  snippetFile: SnippetFile;
  fileName: string | null;
  unmatched: string[];
  onLoad: (file: SnippetFile, name: string) => void;
  onUpdate: (file: SnippetFile) => void;
}

export function SnippetPanel({ snippetFile, fileName, unmatched, onLoad, onUpdate }: SnippetPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleLoad = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "JSON", extensions: ["json"] }]
      });

      if (selected && !Array.isArray(selected)) {
        const content = await readTextFile(selected);
        const data = JSON.parse(content);
        onLoad(data, selected.split(/[\\/]/).pop() || "snippets.json");
      }
    } catch (e) {
      console.error("Failed to load snippet file", e);
    }
  };

  const handleExport = async () => {
    try {
      const path = await save({
        filters: [{ name: "JSON", extensions: ["json"] }],
        defaultPath: fileName || "snippets.json"
      });

      if (path) {
        const content = exportSnippetFile(snippetFile);
        await writeTextFile(path, content);
      }
    } catch (e) {
      console.error("Failed to export snippet file", e);
    }
  };

  const addExact = (condition: string) => {
    const description = prompt(`Enter Japanese description for "${condition}":`);
    if (description) {
      const newFile = {
        ...snippetFile,
        exact: { ...snippetFile.exact, [condition]: description }
      };
      onUpdate(newFile);
    }
  };

  const addPattern = (condition: string) => {
    // Suggest a pattern: replace identifiers with {var}
    // Very simple heuristic: find the first word and replace it
    const suggestedPattern = condition.replace(/^[\w\d_]+/, "{var}");
    const pattern = prompt(`Confirm/Edit pattern:`, suggestedPattern);
    const template = prompt(`Enter template (e.g. {var}がnullでない場合):`);
    
    if (pattern && template) {
      const newFile = {
        ...snippetFile,
        patterns: [...snippetFile.patterns, { pattern, template }]
      };
      onUpdate(newFile);
    }
  };

  const exactCount = Object.keys(snippetFile.exact).length;
  const patternCount = snippetFile.patterns.length;

  return (
    <div className="mb-6 flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border overflow-hidden shadow-lg transition-all">
      {/* Header */}
      <div 
        className="px-4 py-3 bg-drac-bg-tertiary/50 border-b border-drac-border flex items-center justify-between cursor-pointer hover:bg-drac-bg-tertiary/80 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <Settings2 size={18} className="text-drac-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-drac-text-primary">Snippet System</span>
          {fileName && (
            <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-drac-success/10 border border-drac-success/20 text-[10px] text-drac-success font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-drac-success animate-pulse" />
              {fileName} ({exactCount} exact, {patternCount} patterns)
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
           {!isOpen && unmatched.length > 0 && (
             <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
               {unmatched.length} UNMATCHED
             </span>
           )}
           <span className="text-drac-text-secondary text-xs">{isOpen ? "Collapse ▲" : "Expand ▼"}</span>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 flex flex-col gap-6 animate-slide-down">
          {/* File Actions */}
          <div className="flex gap-2">
            <button 
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-drac-bg-tertiary border border-drac-border rounded-lg text-xs font-bold text-drac-text-primary hover:border-drac-accent hover:text-drac-accent transition-all active:scale-95 shadow-sm"
              onClick={handleLoad}
            >
              <FolderOpen size={16} />
              LOAD SNIPPET FILE
            </button>
            <button 
              className="flex items-center justify-center gap-2 px-6 py-3 bg-drac-bg-tertiary border border-drac-border rounded-lg text-xs font-bold text-drac-text-secondary hover:text-drac-purple hover:border-drac-purple transition-all active:scale-95 disabled:opacity-30"
              onClick={handleExport}
              disabled={!fileName && exactCount === 0 && patternCount === 0}
            >
              <Download size={16} />
              EXPORT JSON
            </button>
          </div>

          {/* Unmatched Conditions Summary */}
          {unmatched.length > 0 && (
            <div className="flex flex-col gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                 <HelpCircle size={80} className="text-amber-500" />
               </div>
               
               <div className="flex items-center gap-2 text-amber-500 mb-1">
                 <HelpCircle size={16} />
                 <span className="text-[10px] font-bold uppercase tracking-wider">Unmatched Conditions ({unmatched.length})</span>
               </div>
               
               <p className="text-[10px] text-amber-500/80 mb-2">
                 These conditions have no snippet — add them to your file to improve visualization:
               </p>

               <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-dracula">
                 {unmatched.map((cond, idx) => (
                   <div key={idx} className="flex items-center justify-between p-2 bg-drac-bg-primary/50 rounded border border-amber-500/10 group">
                     <code className="text-[10px] font-mono text-amber-500 truncate mr-4">{cond}</code>
                     <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button 
                         className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500 text-drac-bg-secondary text-[9px] font-bold hover:scale-105 active:scale-95 transition-all"
                         onClick={() => addExact(cond)}
                       >
                         <Plus size={10} />
                         ADD EXACT
                       </button>
                       <button 
                         className="flex items-center gap-1 px-2 py-1 rounded bg-drac-bg-tertiary border border-drac-border text-amber-500 text-[9px] font-bold hover:border-amber-500 transition-all active:scale-95"
                         onClick={() => addPattern(cond)}
                       >
                         <Plus size={10} />
                         ADD PATTERN
                       </button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {!fileName && unmatched.length === 0 && (
            <div className="py-8 flex flex-col items-center justify-center text-drac-text-secondary opacity-30 text-center gap-2">
              <FolderOpen size={40} />
              <p className="text-xs italic">Load a snippet file to enable condition translation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
