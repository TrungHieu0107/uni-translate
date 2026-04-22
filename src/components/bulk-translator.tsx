import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Languages, Database } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { ScanResult, SheetMeta } from "../hooks/use-dictionary";
import { SessionRow, Session } from "./bulk-translator/session-row";
import { PageHeader } from "./ui/page-header";
import { Badge } from "./ui/badge";

interface BulkTranslateResult {
  outputText: string;
  inputSpans: any[];
  outputSpans: any[];
}

function decodeBinaryResponse(buffer: ArrayBuffer): BulkTranslateResult {
  const view = new DataView(buffer);
  let offset = 0;

  const outputTextLen = view.getUint32(offset, true);
  offset += 4;
  const outputTextBytes = new Uint8Array(buffer, offset, outputTextLen);
  const outputText = new TextDecoder().decode(outputTextBytes);
  offset += outputTextLen;

  const inputSpanCount = view.getUint32(offset, true);
  offset += 4;
  const inputSpans = [];
  for (let i = 0; i < inputSpanCount; i++) {
    inputSpans.push({
      start: view.getUint32(offset, true),
      end: view.getUint32(offset + 4, true),
      match_id: view.getUint32(offset + 8, true),
    });
    offset += 12;
  }

  const outputSpanCount = view.getUint32(offset, true);
  offset += 4;
  const outputSpans = [];
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
    return [{
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
    }];
  });

  useEffect(() => {
    const toSave = sessions.map(({ isTranslating, copied, isInputFocused, ...rest }) => rest);
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
      updateSession(id, { input: "", output: "", inputSpans: [], outputSpans: [] });
      return;
    }
    setSessions(sessions.filter((s) => s.id !== id));
  };

  const updateSession = (id: string, update: Partial<Session>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...update } : s)));
  };

  const toggleDirection = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    updateSession(id, { direction: session.direction === "en_to_ja" ? "ja_to_en" : "en_to_ja" });
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

  const inputsJoined = sessions.map(s => s.input).join('|');
  const directionsJoined = sessions.map(s => s.direction).join('|');
  const sheetsJoined = selectedSheets.join('|');

  useEffect(() => {
    if (isApplying) return;
    sessions.forEach((session) => {
      if (!session.input.trim()) {
        if (session.output !== "" || session.outputSpans.length > 0) {
          updateSession(session.id, { output: "", inputSpans: [], outputSpans: [] });
        }
        return;
      }
      if (timersRef.current[session.id]) window.clearTimeout(timersRef.current[session.id]);
      timersRef.current[session.id] = window.setTimeout(() => handleTranslate(session.id), 500);
    });
    return () => Object.values(timersRef.current).forEach(window.clearTimeout);
  }, [inputsJoined, directionsJoined, sheetsJoined, isApplying]);

  const knownSheets = useMemo(() => {
    if (!scanResult) return [];
    const all: SheetMeta[] = [];
    scanResult.files.forEach((f: any) => f.table_sheets.forEach((s: SheetMeta) => all.push(s)));
    return all;
  }, [scanResult]);

  const activeSelectionSet = useMemo(() => new Set(selectedSheets), [selectedSheets]);

  return (
    <div className="flex flex-col h-full w-full bg-drac-bg-primary text-drac-text-primary overflow-hidden">
      <PageHeader 
        title="Bulk Translator"
        icon={<Languages size={18} className="text-drac-accent" />}
        actions={
          <Badge variant="accent" className="gap-2 py-1 px-3">
            <Database size={10} className="text-drac-accent" />
            <span className="font-mono uppercase tracking-widest text-[9px]">
              {selectedSheets.length} Active Tables • {sessions.reduce((acc, s) => acc + s.outputSpans.length, 0)} Total Matches
            </span>
          </Badge>
        }
      />

      <div className="flex-1 overflow-y-auto scrollbar-dracula p-6 relative">
        <div className="flex flex-col gap-8 pb-32 w-full pt-4">
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
              isApplying={isApplying}
            />
          ))}

          <button
            onClick={addSession}
            className="w-full py-8 rounded-2xl border-2 border-dashed border-drac-border hover:border-drac-accent hover:bg-drac-bg-secondary flex flex-col items-center justify-center gap-3 group transition-all shrink-0 active:scale-[0.99] bg-drac-bg-secondary/20"
          >
            <div className="w-12 h-12 rounded-full bg-drac-bg-secondary flex items-center justify-center border border-drac-border group-hover:bg-drac-accent group-hover:text-drac-bg-primary transition-all group-hover:scale-110 shadow-lg">
              <Plus size={24} />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-drac-text-secondary group-hover:text-drac-accent transition-colors">
              Add Translation Unit
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
