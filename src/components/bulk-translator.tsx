import { useState, useEffect, useMemo, useRef, forwardRef } from "react";
import { Copy, ArrowRightLeft, Languages, Check, Loader2, Plus, Trash2, GripHorizontal, RefreshCw, Database } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { SheetMeta, ScanResult } from "../hooks/use-dictionary";
import { useAutoTableDetect } from "../hooks/use-auto-table-detect";
import { DetectionBanner } from "./detection-banner";

interface MatchSpan {
  start: number;
  end: number;
  match_id: number;
}

interface BulkTranslateResult {
  outputText: string;
  inputSpans: MatchSpan[];
  outputSpans: MatchSpan[];
}

interface Session {
  id: string;
  name: string;
  input: string;
  output: string;
  inputSpans: MatchSpan[];
  outputSpans: MatchSpan[];
  direction: "en_to_ja" | "ja_to_en";
  height: number;
  isTranslating: boolean;
  copied: boolean;
  isInputFocused: boolean;
}

function decodeBinaryResponse(buffer: ArrayBuffer): BulkTranslateResult {
  const view = new DataView(buffer);
  let offset = 0;

  // 1. Output Text
  const outputTextLen = view.getUint32(offset, true);
  offset += 4;
  const outputTextBytes = new Uint8Array(buffer, offset, outputTextLen);
  const outputText = new TextDecoder().decode(outputTextBytes);
  offset += outputTextLen;

  // 2. Input Spans
  const inputSpanCount = view.getUint32(offset, true);
  offset += 4;
  const inputSpans: MatchSpan[] = [];
  for (let i = 0; i < inputSpanCount; i++) {
    inputSpans.push({
      start: view.getUint32(offset, true),
      end: view.getUint32(offset + 4, true),
      match_id: view.getUint32(offset + 8, true),
    });
    offset += 12;
  }

  // 3. Output Spans
  const outputSpanCount = view.getUint32(offset, true);
  offset += 4;
  const outputSpans: MatchSpan[] = [];
  for (let i = 0; i < outputSpanCount; i++) {
    outputSpans.push({
      start: view.getUint32(offset, true),
      end: view.getUint32(offset + 4, true),
      match_id: view.getUint32(offset + 8, true),
    });
    offset += 12;
  }

  return { outputText, inputSpans, outputSpans };
}

const SegmentedViewer = forwardRef<HTMLDivElement, { 
  text: string,
  spans: MatchSpan[], 
  className?: string, 
  placeholder?: string,
  onManualClick?: () => void,
  hoverMatchId: number | null,
  setHoverMatchId: (id: number | null) => void,
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void
}>(({ text, spans, className, placeholder, onManualClick, hoverMatchId, setHoverMatchId, onScroll }, ref) => {
  if (!text && placeholder) {
    return (
      <div className={`p-4 text-drac-text-secondary italic text-sm ${className}`} onClick={onManualClick}>
        {placeholder}
      </div>
    );
  }

  // Render text segments by splitting on-the-fly using spans
  const elements: any[] = [];
  let lastPos = 0;

  spans.forEach((span, idx) => {
    // Add plain text before match
    if (span.start > lastPos) {
      elements.push(<span key={`p-${idx}`}>{text.slice(lastPos, span.start)}</span>);
    }
    // Add highlighted match
    elements.push(
      <span
        key={`m-${idx}`}
        className={`transition-all duration-150 rounded text-drac-accent font-bold cursor-help ${
          hoverMatchId !== null && span.match_id === hoverMatchId 
            ? "bg-drac-accent/30 text-drac-accent-hover ring-1 ring-drac-accent/50" 
            : ""
        }`}
        onMouseEnter={() => setHoverMatchId(span.match_id)}
        onMouseLeave={() => setHoverMatchId(null)}
      >
        {text.slice(span.start, span.end)}
      </span>
    );
    lastPos = span.end;
  });

  // Add remaining text
  if (lastPos < text.length) {
    elements.push(<span key="final">{text.slice(lastPos)}</span>);
  }

  return (
    <div 
      ref={ref}
      className={`p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words overflow-y-auto scrollbar-dracula ${className}`}
      onClick={onManualClick}
      onScroll={onScroll}
    >
      {elements}
    </div>
  );
});

SegmentedViewer.displayName = "SegmentedViewer";

function SessionRow({ 
  session, 
  index, 
  disabled, 
  hoverMatchId, 
  setHoverMatchId,
  updateSession,
  toggleDirection,
  handleTranslate,
  handleCopy,
  removeSession,
  startResize,
  knownSheets,
  activeSelection,
  onAutoAdd,
  onAutoRemove
}: { 
  session: Session, 
  index: number, 
  disabled: boolean,
  hoverMatchId: number | null,
  setHoverMatchId: (id: number | null) => void,
  updateSession: (id: string, update: Partial<Session>) => void,
  toggleDirection: (id: string) => void,
  handleTranslate: (id: string) => void,
  handleCopy: (id: string) => void,
  removeSession: (id: string) => void,
  startResize: (id: string, startHeight: number, clientY: number) => void,
  knownSheets: SheetMeta[],
  activeSelection: Set<string>,
  onAutoAdd: (sheetNames: string[]) => Promise<void>,
  onAutoRemove: (sheetNames: string[]) => Promise<void>
}) {
  const inputRef = useRef<any>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const {
    detectionResult,
    handleInput,
    dismissBanner,
  } = useAutoTableDetect(
    knownSheets,
    activeSelection,
    onAutoAdd,
    onAutoRemove
  );

  useEffect(() => {
    handleInput(session.input);
  }, [session.input, handleInput]);

  // Auto-detect direction based on input content
  useEffect(() => {
    if (!session.input.trim()) return;
    
    const hasJapanese = /[^\x00-\x7F]/.test(session.input); // Simple check for non-ASCII
    const targetDirection = hasJapanese ? "ja_to_en" : "en_to_ja";
    
    if (session.direction !== targetDirection) {
      updateSession(session.id, { direction: targetDirection });
    }
  }, [session.input, session.id]); // Note: only triggers on input change

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      handleInput(text);
    }
  };

  const handleScroll = (source: 'input' | 'output') => (e: any) => {
    if (isSyncing.current) return;
    
    const target = source === 'input' ? outputRef.current : inputRef.current;
    if (target) {
      isSyncing.current = true;
      target.scrollTop = e.target.scrollTop;
      // Reset sync flag in the next frame to allow the target's scroll event to be ignored
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isSyncing.current = false;
        });
      });
    }
  };

  return (
    <div className="flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border shadow-lg animate-slide-up relative group overflow-hidden">
      
      {/* Overlay Index */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <span className="w-6 h-6 rounded-full bg-drac-bg-tertiary flex items-center justify-center text-[10px] font-bold text-drac-text-secondary border border-drac-border shadow-sm">
          {index + 1}
        </span>
      </div>
      
      {/* High Density Editor Pane */}
      <div className="flex flex-col border-t border-transparent">
        <div 
          className="flex gap-2 p-3 pl-12" // Padding left to clear the index circle
          style={{ height: `${session.height}px` }}
        >
          {/* Input Box */}
          <div className="flex-1 flex flex-col bg-drac-bg-primary rounded-lg border border-drac-border overflow-hidden shadow-inner focus-within:border-drac-accent/50 transition-colors">
            <div className="bg-drac-bg-tertiary px-3 py-1.5 flex justify-between items-center border-b border-drac-border/50">
              <button 
                className="text-[10px] font-bold uppercase tracking-widest text-drac-accent hover:text-drac-accent-hover flex items-center gap-1 transition-colors"
                onClick={() => toggleDirection(session.id)}
                title="Click to toggle language"
              >
                {session.direction === "en_to_ja" ? "Source: English" : "Source: Japanese"}
                <RefreshCw size={10} className="opacity-50" />
              </button>
              
              <button 
                className={`p-1 rounded hover:bg-drac-bg-secondary transition-colors ${session.isTranslating ? 'animate-spin text-drac-accent' : 'text-drac-success'}`}
                onClick={() => handleTranslate(session.id)}
                disabled={disabled || session.isTranslating || !session.input.trim()}
                title="Force translate now"
              >
                {session.isTranslating ? <Loader2 size={12} /> : <Languages size={12} />}
              </button>
            </div>
            {session.isInputFocused || !session.inputSpans.length ? (
              <textarea
                ref={inputRef}
                className="flex-1 w-full bg-transparent p-3 resize-none outline-none font-mono text-sm leading-relaxed scrollbar-dracula"
                placeholder={session.direction === "en_to_ja" ? "Paste English text..." : "Paste Japanese text..."}
                value={session.input}
                onChange={(e) => updateSession(session.id, { input: e.target.value })}
                onFocus={() => updateSession(session.id, { isInputFocused: true })}
                onBlur={() => updateSession(session.id, { isInputFocused: false })}
                onScroll={handleScroll('input')}
                disabled={disabled}
                spellCheck={false}
                autoFocus={session.isInputFocused}
                onPaste={onPaste}
              />
            ) : (
              <SegmentedViewer 
                ref={inputRef}
                text={session.input}
                spans={session.inputSpans}
                className="flex-1 cursor-text"
                onManualClick={() => updateSession(session.id, { isInputFocused: true })}
                hoverMatchId={hoverMatchId}
                setHoverMatchId={setHoverMatchId}
                onScroll={handleScroll('input')}
              />
            )}
          </div>

          {/* Middle Controls */}
          <div className="flex flex-col items-center justify-center gap-2 text-drac-border/50 w-8">
            <button 
              className="p-1.5 rounded-full hover:bg-drac-bg-tertiary text-drac-text-secondary hover:text-drac-accent transition-all active:rotate-180"
              onClick={() => toggleDirection(session.id)}
              title="Swap Languages"
            >
              <ArrowRightLeft size={16} />
            </button>
          </div>

          {/* Output Box */}
          <div className="flex-1 flex flex-col bg-drac-bg-primary rounded-lg border border-drac-border overflow-hidden shadow-inner relative">
            <div className="bg-drac-bg-tertiary px-3 py-1.5 flex justify-between items-center border-b border-drac-border/50">
              <button 
                className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary hover:text-drac-text-primary flex items-center gap-1 transition-colors"
                onClick={() => toggleDirection(session.id)}
                title="Click to toggle language"
              >
                {session.direction === "en_to_ja" ? "Target: Japanese" : "Target: English"}
                <RefreshCw size={10} className="opacity-50" />
              </button>
            </div>
            <SegmentedViewer 
              ref={outputRef}
              text={session.output}
              spans={session.outputSpans}
              className="flex-1"
              placeholder="Translation will appear here..."
              hoverMatchId={hoverMatchId}
              setHoverMatchId={setHoverMatchId}
              onScroll={handleScroll('output')}
            />
          </div>
        </div>

        {/* Detection Banner (Auto-applied notification) */}
        {detectionResult && (
          <DetectionBanner 
            result={detectionResult}
            isApplied={true}
            onDismiss={dismissBanner}
          />
        )}

        {/* Footer Action Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-drac-bg-tertiary/30 border-t border-drac-border/50">
          <div className="text-[10px] text-drac-text-secondary font-medium">
            {session.input.length > 0 && `${session.input.length} characters`}
          </div>
          
          <div className="flex items-center gap-2">
            {session.output && (
              <button
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95 ${
                  session.copied 
                    ? "bg-drac-success/20 text-drac-success border border-drac-success/30" 
                    : "bg-drac-bg-primary text-drac-text-primary border border-drac-border hover:border-drac-accent hover:text-drac-accent shadow-sm"
                }`}
                onClick={() => handleCopy(session.id)}
              >
                {session.copied ? <Check size={14} /> : <Copy size={14} />}
                {session.copied ? "COPIED" : "COPY RESULT"}
              </button>
            )}
            
            <button
              className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold bg-drac-bg-primary text-drac-text-secondary border border-drac-border hover:border-drac-danger hover:text-drac-danger hover:bg-drac-danger-bg transition-all active:scale-95 shadow-sm"
              onClick={() => removeSession(session.id)}
              title="Remove Section"
            >
              <Trash2 size={14} />
              REMOVE
            </button>
          </div>
        </div>

        {/* Resize Handle at the very bottom */}
        <div 
          className="h-1 bg-drac-bg-tertiary hover:bg-drac-accent/50 cursor-ns-resize flex items-center justify-center transition-colors group/handle active:bg-drac-accent"
          onMouseDown={(e) => startResize(session.id, session.height, e.clientY)}
          title="Drag to resize height"
        >
          <GripHorizontal size={12} className="text-drac-border opacity-0 group-hover/handle:opacity-100 transition-opacity" />
        </div>

        {/* Translation Overlay */}
        {session.isTranslating && (
          <div className="absolute inset-0 bg-drac-bg-secondary/40 backdrop-blur-[1px] z-[60] flex items-center justify-center animate-fade-in pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="text-drac-accent animate-spin" size={24} />
              <span className="text-[10px] font-bold text-drac-accent tracking-widest animate-pulse">TRANSLATING...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


export function BulkTranslator({ 
  disabled,
  scanResult,
  selectedSheets,
  onAutoAdd,
  onAutoRemove,
  isApplying
}: { 
  disabled: boolean,
  scanResult: ScanResult | null,
  selectedSheets: string[],
  onAutoAdd: (sheetNames: string[]) => Promise<void>,
  onAutoRemove: (sheetNames: string[]) => Promise<void>,
  isApplying: boolean
}) {
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const saved = localStorage.getItem("bulk_translator_sessions");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(s => ({ 
            ...s, 
            isTranslating: false, 
            copied: false, 
            isInputFocused: false,
            inputSpans: s.inputSpans || [],
            outputSpans: s.outputSpans || []
          }));
        }
      }
    } catch (e) {
      console.warn("Failed to restore bulk translator sessions");
    }
    return [
      {
        id: "1",
        name: "Translation 1",
        input: "",
        output: "",
        direction: "en_to_ja",
        height: 250,
        isTranslating: false,
        copied: false,
        isInputFocused: false,
        inputSpans: [],
        outputSpans: [],
      },
    ];
  });

  useEffect(() => {
    const toSave = sessions.map(s => {
      const { isTranslating, copied, isInputFocused, ...rest } = s;
      return rest;
    });
    localStorage.setItem("bulk_translator_sessions", JSON.stringify(toSave));
  }, [sessions]);

  const [hoverMatchId, setHoverMatchId] = useState<number | null>(null);

  const [resizingId, setResizingId] = useState<string | null>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const timersRef = useRef<{ [key: string]: number }>({});

  const addSession = () => {
    const newId = Date.now().toString();
    const newSession: Session = {
      id: newId,
      name: `Translation ${sessions.length + 1}`,
      input: "",
      output: "",
      direction: sessions[sessions.length - 1]?.direction || "en_to_ja",
      height: 250,
      isTranslating: false,
      copied: false,
      isInputFocused: false,
      inputSpans: [],
      outputSpans: [],
    };
    setSessions([...sessions, newSession]);
  };

  const removeSession = (id: string) => {
    if (timersRef.current[id]) {
      window.clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    if (sessions.length <= 1) {
      updateSession(id, { input: "", output: "" });
      return;
    }
    setSessions(sessions.filter((s) => s.id !== id));
  };

  const updateSession = (id: string, update: Partial<Session>) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...update } : s))
    );
  };

  const toggleDirection = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    updateSession(id, { 
      direction: session.direction === "en_to_ja" ? "ja_to_en" : "en_to_ja" 
    });
  };

  const handleTranslate = async (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session || !session.input.trim()) return;

    try {
      updateSession(id, { isTranslating: true });
      const res = await invoke<number[]>("bulk_translate_v2", {
        text: session.input,
        direction: session.direction,
      });
      
      // Tauri returns Vec<u8> as a number array, convert to ArrayBuffer
      const uint8 = new Uint8Array(res);
      const result = decodeBinaryResponse(uint8.buffer);
      
      updateSession(id, { 
        output: result.outputText,
        inputSpans: result.inputSpans,
        outputSpans: result.outputSpans
      });
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      updateSession(id, { isTranslating: false });
    }
  };

  const knownSheets = useMemo(() => {
    if (!scanResult) return [];
    const all: SheetMeta[] = [];
    scanResult.files.forEach((f: any) => {
      // Collect table sheets for detection matching
      f.table_sheets.forEach((s: SheetMeta) => all.push(s));
    });
    return all;
  }, [scanResult]);

  const activeSelectionSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);


  const handleCopy = (id: string) => {
    const session = sessions.find((s) => s.id === id);
    if (!session || !session.output) return;
    navigator.clipboard.writeText(session.output);
    updateSession(id, { copied: true });
    setTimeout(() => updateSession(id, { copied: false }), 2000);
  };

  const startResize = (id: string, startHeight: number, clientY: number) => {
    setResizingId(id);
    resizeStartY.current = clientY;
    resizeStartHeight.current = startHeight;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (resizingId) {
        const deltaY = e.clientY - resizeStartY.current;
        const newHeight = Math.max(100, Math.min(1000, resizeStartHeight.current + deltaY));
        updateSession(resizingId, { height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (resizingId) {
        setResizingId(null);
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    if (resizingId) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingId]);

  useEffect(() => {
    // Don't trigger translation while the backend is busy rebuilding the dictionary
    if (isApplying) return;

    sessions.forEach((session) => {
      if (!session.input.trim()) {
        if (session.output !== "" || session.outputSpans.length > 0) {
          updateSession(session.id, { 
            output: "", 
            inputSpans: [], 
            outputSpans: [] 
          });
        }
        return;
      }
      if (timersRef.current[session.id]) {
        window.clearTimeout(timersRef.current[session.id]);
      }
      timersRef.current[session.id] = window.setTimeout(() => {
        handleTranslate(session.id);
      }, 500);
    });

    return () => {
      Object.values(timersRef.current).forEach(window.clearTimeout);
    };
  }, [
    sessions.map(s => s.input).join('|'), 
    sessions.map(s => s.direction).join('|'),
    selectedSheets.join('|'),
    isApplying
  ]);

  return (
    <div className="flex flex-col h-full w-full bg-drac-bg-primary text-drac-text-primary overflow-hidden">
      {/* Header with Stats */}
      <div className="px-6 py-3 bg-drac-bg-tertiary/30 border-b border-drac-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Languages size={18} className="text-drac-accent" />
          <h2 className="text-sm font-bold tracking-tight">Bulk Translator</h2>
          <div className="flex items-center gap-2 px-2 py-0.5 bg-drac-accent/10 border border-drac-accent/20 rounded-full">
            <Database size={10} className="text-drac-accent" />
            <span className="text-[10px] font-mono text-drac-accent">
              {scanResult ? selectedSheets.length : 0} Tables • {sessions.reduce((acc, s) => acc + s.outputSpans.length, 0)} Matches
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-dracula p-6 relative">
        <div className="flex flex-col gap-6 pb-32 w-full pt-4">
          {sessions.map((session, index) => (
            <SessionRow 
              key={session.id}
              session={session}
              index={index}
              disabled={disabled}
              hoverMatchId={hoverMatchId}
              setHoverMatchId={setHoverMatchId}
              updateSession={updateSession}
              toggleDirection={toggleDirection}
              handleTranslate={handleTranslate}
              handleCopy={handleCopy}
              removeSession={removeSession}
              startResize={startResize}
              knownSheets={knownSheets}
              activeSelection={activeSelectionSet}
              onAutoAdd={onAutoAdd}
              onAutoRemove={onAutoRemove}
            />
          ))}

          {/* Large Add Button at bottom */}
          <button
            onClick={addSession}
            className="w-full py-5 rounded-xl border-2 border-dashed border-drac-border hover:border-drac-accent hover:bg-drac-bg-secondary flex flex-col items-center justify-center gap-2 group transition-all shrink-0 active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-full bg-drac-bg-secondary flex items-center justify-center border border-drac-border group-hover:bg-drac-accent group-hover:text-drac-text-inverse transition-colors">
              <Plus size={20} />
            </div>
            <span className="text-xs font-bold text-drac-text-secondary group-hover:text-drac-accent">Add Another Translation Section</span>
          </button>
        </div>
      </div>
    </div>
  );
}
