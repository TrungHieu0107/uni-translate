import React, { useState, useEffect, useRef, useCallback } from "react";
import { Copy, ArrowRightLeft, Languages, Check, Loader2, Trash2, RefreshCw, Database, GripHorizontal } from "lucide-react";
import { SheetMeta } from "../../hooks/use-dictionary";
import { useAutoTableDetect } from "../../hooks/use-auto-table-detect";
import { DetectionBanner } from "../detection-banner";
import { SegmentedViewer } from "./segmented-viewer";
import { Button } from "../ui/button";

interface MatchSpan {
  start: number;
  end: number;
  match_id: number;
}

export interface Session {
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

interface SessionRowProps {
  session: Session;
  index: number;
  disabled: boolean;
  hoverMatchId: number | null;
  setHoverMatchId: (id: number | null) => void;
  updateSession: (id: string, update: Partial<Session>) => void;
  toggleDirection: (id: string) => void;
  handleTranslate: (id: string) => void;
  handleCopy: (id: string) => void;
  removeSession: (id: string) => void;
  startResize: (id: string, startHeight: number, clientY: number) => void;
  knownSheets: SheetMeta[];
  activeSelection: Set<string>;
  onAutoAdd: (sheetNames: string[]) => Promise<void>;
  onAutoRemove: (sheetNames: string[]) => Promise<void>;
  isApplying: boolean;
}

export const SessionRow = React.memo(({ 
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
  onAutoRemove,
  isApplying
}: SessionRowProps) => {
  const inputRef = useRef<any>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  const {
    detectionResult,
    handleInput,
    dismissBanner,
    toggleExclusion,
    excludedTables,
  } = useAutoTableDetect(
    knownSheets,
    activeSelection,
    onAutoAdd,
    onAutoRemove
  );

  useEffect(() => {
    handleInput(session.input);
  }, [session.input, handleInput]);

  useEffect(() => {
    if (!session.input.trim()) return;
    const hasJapanese = /[^\x00-\x7F]/.test(session.input);
    const targetDirection = hasJapanese ? "ja_to_en" : "en_to_ja";
    if (session.direction !== targetDirection) {
      updateSession(session.id, { direction: targetDirection });
    }
  }, [session.input, session.id, session.direction, updateSession]);

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) handleInput(text);
  };

  const handleScroll = useCallback((source: 'input' | 'output') => (e: any) => {
    if (isSyncing.current) return;
    const target = source === 'input' ? outputRef.current : inputRef.current;
    if (target) {
      isSyncing.current = true;
      target.scrollTop = e.target.scrollTop;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isSyncing.current = false;
        });
      });
    }
  }, []);

  const showOverlay = session.isTranslating || isApplying;
  const [internalLoading, setInternalLoading] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (showOverlay) {
      setInternalLoading(true);
      setIsFadingOut(false);
    } else if (internalLoading) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsFadingOut(true);
          setTimeout(() => {
            setInternalLoading(false);
            setIsFadingOut(false);
          }, 400);
        });
      });
    }
  }, [showOverlay, internalLoading]);

  return (
    <div className="flex flex-col bg-drac-bg-secondary rounded-xl border border-drac-border shadow-lg animate-slide-up relative group overflow-hidden">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <span className="w-6 h-6 rounded-full bg-drac-bg-tertiary flex items-center justify-center text-[10px] font-bold text-drac-text-secondary border border-drac-border shadow-sm">
          {index + 1}
        </span>
      </div>
      
      <div className="flex flex-col border-t border-transparent">
        <div 
          className="flex gap-2 p-3 pl-12"
          style={{ height: `${session.height}px` }}
        >
          {/* Input Box */}
          <div className="flex-1 flex flex-col bg-drac-bg-primary rounded-lg border border-drac-border overflow-hidden shadow-inner focus-within:border-drac-accent/50 transition-colors">
            <div className="bg-drac-bg-tertiary px-3 py-1.5 flex justify-between items-center border-b border-drac-border/50">
              <button 
                className="text-[10px] font-bold uppercase tracking-widest text-drac-accent hover:text-drac-accent-hover flex items-center gap-1 transition-colors"
                onClick={() => toggleDirection(session.id)}
              >
                {session.direction === "en_to_ja" ? "Source: English" : "Source: Japanese"}
                <RefreshCw size={10} className="opacity-50" />
              </button>
              
              <button 
                className={`p-1 rounded hover:bg-drac-bg-secondary transition-colors ${session.isTranslating ? 'animate-spin text-drac-accent' : 'text-drac-success'}`}
                onClick={() => handleTranslate(session.id)}
                disabled={disabled || session.isTranslating || isApplying || !session.input.trim()}
              >
                {session.isTranslating ? <Loader2 size={12} /> : <Languages size={12} />}
              </button>
            </div>
            {session.isInputFocused || !session.inputSpans.length ? (
              <textarea
                ref={inputRef}
                className="flex-1 w-full bg-transparent p-3 resize-none outline-none font-mono text-sm leading-relaxed scrollbar-dracula text-drac-text-primary"
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

          <div className="flex flex-col items-center justify-center gap-2 text-drac-border/50 w-8">
            <button 
              className="p-1.5 rounded-full hover:bg-drac-bg-tertiary text-drac-text-secondary hover:text-drac-accent transition-all active:rotate-180"
              onClick={() => toggleDirection(session.id)}
            >
              <ArrowRightLeft size={16} />
            </button>
          </div>

          {/* Output Box */}
          <div className="flex-1 flex flex-col bg-drac-bg-primary rounded-lg border border-drac-border overflow-hidden shadow-inner relative group/output">
            <div className="bg-drac-bg-tertiary px-3 py-1.5 flex justify-between items-center border-b border-drac-border/50">
              <button 
                className="text-[10px] font-bold uppercase tracking-widest text-drac-text-secondary hover:text-drac-text-primary flex items-center gap-1 transition-colors"
                onClick={() => toggleDirection(session.id)}
              >
                {session.direction === "en_to_ja" ? "Target: Japanese" : "Target: English"}
                <RefreshCw size={10} className="opacity-50" />
              </button>
            </div>
            
            <div className="flex-1 relative overflow-hidden">
              <SegmentedViewer 
                ref={outputRef}
                text={session.output}
                spans={session.outputSpans}
                className="h-full"
                placeholder="Translation will appear here..."
                hoverMatchId={hoverMatchId}
                setHoverMatchId={setHoverMatchId}
                onScroll={handleScroll('output')}
              />

              {internalLoading && (
                <div className={`absolute inset-0 bg-drac-bg-primary/80 backdrop-blur-md z-20 flex flex-col items-center justify-center overflow-hidden transition-all duration-400 ease-out ${isFadingOut ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'}`}>
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(189,147,249,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(189,147,249,0.05)_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-drac-accent/10 to-transparent h-32 w-full animate-scanline opacity-40" />
                  
                  <div className="relative flex flex-col items-center justify-center p-8">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="absolute inset-0 w-full h-full text-drac-accent/30 drop-shadow-[0_0_10px_rgba(189,147,249,0.5)]" viewBox="0 0 100 100" style={{ animation: 'spin 4s linear infinite' }}>
                        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="10 5 30 15" opacity="0.5" />
                        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="50 20" opacity="0.8" />
                      </svg>
                      <svg className="absolute inset-2 w-20 h-20 text-drac-text-secondary/50" viewBox="0 0 100 100" style={{ animation: 'spin 3s linear infinite reverse' }}>
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10 5 10" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-drac-accent/20 rounded-full blur-md absolute animate-pulse" />
                        <Database size={24} className="text-drac-accent animate-pulse relative z-10 drop-shadow-[0_0_8px_rgba(189,147,249,1)]" />
                      </div>
                    </div>
                    <div className="mt-8 flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3">
                        <div className="h-px w-8 bg-gradient-to-r from-transparent to-drac-accent/80" />
                        <span className="text-[11px] font-black text-drac-accent tracking-[0.4em] animate-pulse uppercase drop-shadow-[0_0_8px_rgba(189,147,249,0.8)]">
                          {isApplying ? "Syncing Dictionary..." : "Neural Matrix Active..."}
                        </span>
                        <div className="h-px w-8 bg-gradient-to-l from-transparent to-drac-accent/80" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {session.copied && (
                <div className="absolute top-4 right-4 bg-drac-success text-drac-bg-primary text-[10px] font-black px-3 py-1 rounded shadow-lg animate-bounce-in z-50 tracking-widest uppercase">
                  Copied to clipboard
                </div>
              )}
            </div>
          </div>
        </div>

        {detectionResult && (
          <DetectionBanner 
            result={detectionResult}
            isApplied={true}
            onDismiss={dismissBanner}
            onToggleExclusion={toggleExclusion}
            excludedTables={excludedTables}
          />
        )}

        <div className="flex items-center justify-between px-3 py-2 bg-drac-bg-tertiary/30 border-t border-drac-border/50">
          <div className="text-[10px] text-drac-text-secondary font-medium uppercase tracking-widest">
            {session.input.length > 0 && `${session.input.length} characters • ${session.outputSpans.length} matches`}
          </div>
          
          <div className="flex items-center gap-2">
            {session.output && (
              <Button
                variant={session.copied ? "success" : "secondary"}
                size="sm"
                onClick={() => handleCopy(session.id)}
                leftIcon={session.copied ? <Check size={14} /> : <Copy size={14} />}
              >
                {session.copied ? "COPIED" : "COPY RESULT"}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeSession(session.id)}
              leftIcon={<Trash2 size={14} />}
              className="hover:text-drac-danger hover:bg-drac-danger/10"
            >
              REMOVE
            </Button>
          </div>
        </div>

        <div 
          className="h-1 bg-drac-bg-tertiary hover:bg-drac-accent/50 cursor-ns-resize flex items-center justify-center transition-colors group/handle active:bg-drac-accent"
          onMouseDown={(e) => startResize(session.id, session.height, e.clientY)}
        >
          <GripHorizontal size={12} className="text-drac-border opacity-0 group-hover/handle:opacity-100 transition-opacity" />
        </div>
      </div>
    </div>
  );
});

SessionRow.displayName = "SessionRow";
