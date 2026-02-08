import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Users, Swords, Upload, Search, X, Download, Copy, Trash2, User, Plus, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Figure } from "@shared/schema";
import { DragDropUpload } from "@/components/ui/drag-drop-upload";
import { usePopupManager } from "@/contexts/popup-manager-context";

interface DebaterSlot {
  figure: Figure | null;
  search: string;
  uploadedFileName: string;
  uploadedText: string;
}

function createEmptySlot(): DebaterSlot {
  return { figure: null, search: "", uploadedFileName: "", uploadedText: "" };
}

function DebaterSelector({
  slot,
  slotIndex,
  figures,
  excludeIds,
  onSelectFigure,
  onClearFigure,
  onSearchChange,
  onFileAccepted,
  onClearFile,
  onTextChange,
  onRemoveSlot,
  isRemovable,
}: {
  slot: DebaterSlot;
  slotIndex: number;
  figures: Figure[];
  excludeIds: string[];
  onSelectFigure: (figure: Figure) => void;
  onClearFigure: () => void;
  onSearchChange: (val: string) => void;
  onFileAccepted: (file: File) => void;
  onClearFile: () => void;
  onTextChange: (val: string) => void;
  onRemoveSlot: () => void;
  isRemovable: boolean;
}) {
  const filteredFigures = figures
    .filter(f => !excludeIds.includes(f.id))
    .filter(f =>
      slot.search.trim() === "" ||
      f.name.toLowerCase().includes(slot.search.toLowerCase()) ||
      f.title.toLowerCase().includes(slot.search.toLowerCase())
    );

  const wordCount = slot.uploadedText.trim() ? slot.uploadedText.trim().split(/\s+/).length : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4" />
            Debater {slotIndex + 1}
          </CardTitle>
          {isRemovable && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemoveSlot}
              data-testid={`button-remove-debater-${slotIndex}`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {slot.figure ? (
          <div className="flex items-center justify-between p-2 border rounded-lg bg-muted">
            <div className="flex items-center gap-2">
              {slot.figure.icon && (slot.figure.icon.startsWith('/') || slot.figure.icon.startsWith('http')) ? (
                <img src={slot.figure.icon} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm">{slot.figure.name}</p>
                <p className="text-xs text-muted-foreground">{slot.figure.title}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClearFigure} data-testid={`button-clear-debater-${slotIndex}`}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search thinkers..."
                value={slot.search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
                data-testid={`input-search-debater-${slotIndex}`}
              />
            </div>
            <ScrollArea className="h-[150px] border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredFigures.map((figure) => (
                  <div
                    key={figure.id}
                    onClick={() => onSelectFigure(figure)}
                    className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer transition-colors"
                    data-testid={`select-debater-${slotIndex}-${figure.id}`}
                  >
                    {figure.icon && (figure.icon.startsWith('/') || figure.icon.startsWith('http')) ? (
                      <img src={figure.icon} alt="" className="w-7 h-7 rounded-full object-cover" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{figure.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{figure.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {slot.figure && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs font-medium flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Material for {slot.figure.name} only (up to 50,000 words)
            </Label>
            <DragDropUpload
              onFileAccepted={onFileAccepted}
              onClear={onClearFile}
              currentFileName={slot.uploadedFileName}
              accept=".txt,.md,.doc,.docx,.pdf"
              maxSizeBytes={10 * 1024 * 1024}
              data-testid={`drag-drop-debater-${slotIndex}`}
            />
            <Textarea
              placeholder={`Paste text that only ${slot.figure.name} will draw from...`}
              value={slot.uploadedText}
              onChange={(e) => {
                const val = e.target.value;
                const words = val.trim().split(/\s+/).length;
                if (words > 50000) {
                  const truncated = val.split(/\s+/).slice(0, 50000).join(' ');
                  onTextChange(truncated);
                } else {
                  onTextChange(val);
                }
              }}
              rows={2}
              className="resize-none text-xs"
              data-testid={`textarea-debater-material-${slotIndex}`}
            />
            {wordCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {wordCount.toLocaleString()} words loaded
                {wordCount > 50000 && <span className="text-destructive ml-1">(exceeds 50,000 limit)</span>}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DebateCreatorSection() {
  const [debateMode, setDebateMode] = useState<"auto" | "custom">("auto");
  const [debaters, setDebaters] = useState<DebaterSlot[]>([createEmptySlot(), createEmptySlot()]);
  const [customInstructions, setCustomInstructions] = useState("");
  const [generalPaperText, setGeneralPaperText] = useState("");
  const [generalUploadedFileName, setGeneralUploadedFileName] = useState("");
  const [enhanced, setEnhanced] = useState(true);
  const [debateResult, setDebateResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [wordLengthInput, setWordLengthInput] = useState<string>("2500");
  const popupIdRef = useRef<string>("");
  const { toast } = useToast();
  const { registerPopup, updatePopup } = usePopupManager();

  const handleCopy = () => {
    navigator.clipboard.writeText(debateResult);
    toast({ title: "Copied to clipboard", description: "Debate has been copied." });
  };

  const handleClear = () => {
    setDebateResult("");
    toast({ title: "Output cleared", description: "The debate has been cleared." });
  };

  const { data: figures = [] } = useQuery<Figure[]>({
    queryKey: ['/api/figures'],
  });

  const selectedIds = debaters.map(d => d.figure?.id).filter(Boolean) as string[];
  const selectedFigures = debaters.filter(d => d.figure !== null);

  const updateDebater = (index: number, updates: Partial<DebaterSlot>) => {
    setDebaters(prev => prev.map((d, i) => i === index ? { ...d, ...updates } : d));
  };

  const addDebater = () => {
    if (debaters.length < 4) {
      setDebaters(prev => [...prev, createEmptySlot()]);
    }
  };

  const removeDebater = (index: number) => {
    if (debaters.length > 2) {
      setDebaters(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleDebaterFileAccepted = (index: number, file: File) => {
    updateDebater(index, { uploadedFileName: file.name });
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const words = content.trim().split(/\s+/).length;
      if (words > 50000) {
        toast({
          title: "File too long",
          description: `This file has ${words.toLocaleString()} words. Only the first 50,000 words will be used.`,
          variant: "destructive",
        });
        const truncated = content.split(/\s+/).slice(0, 50000).join(' ');
        updateDebater(index, { uploadedText: truncated });
      } else {
        updateDebater(index, { uploadedText: content });
      }
    };
    reader.readAsText(file);
  };

  const handleGeneralFileAccepted = (file: File) => {
    setGeneralUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setGeneralPaperText(e.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  const handleGenerate = () => {
    if (selectedFigures.length < 2 || isStreaming) return;

    const wordLength = parseInt(wordLengthInput) || 2500;
    if (wordLength < 100 || wordLength > 50000) {
      toast({
        title: "Invalid word length",
        description: "Please enter a number between 100 and 50,000",
        variant: "destructive",
      });
      return;
    }

    setIsStreaming(true);
    setDebateResult("");

    const debaterNames = selectedFigures.map(d => d.figure!.name);
    const debatePopupId = `debate-${Date.now()}`;
    popupIdRef.current = debatePopupId;
    registerPopup({
      id: debatePopupId,
      title: `Debate: ${debaterNames.join(' vs ')}`,
      content: "",
      isGenerating: true,
      filename: `debate_${debaterNames.map(n => n.replace(/\s+/g, '_')).join('_vs_')}.txt`,
    });

    const debaterUploads: Record<string, string> = {};
    for (const d of debaters) {
      if (d.figure && d.uploadedText.trim()) {
        debaterUploads[d.figure.id] = d.uploadedText.trim();
      }
    }

    const payload = {
      debaterIds: selectedFigures.map(d => d.figure!.id),
      mode: debateMode,
      instructions: debateMode === "custom" ? customInstructions : undefined,
      paperText: generalPaperText || undefined,
      debaterUploads,
      enhanced,
      wordLength,
    };

    fetch("/api/debate/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (response) => {
      if (!response.ok) {
        setIsStreaming(false);
        updatePopup(debatePopupId, { isGenerating: false });
        toast({ title: "Error", description: "Failed to generate debate", variant: "destructive" });
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setIsStreaming(false);
        return;
      }

      let accumulatedText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              setIsStreaming(false);
              updatePopup(debatePopupId, { isGenerating: false });
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                accumulatedText += parsed.content;
                setDebateResult(accumulatedText);
                updatePopup(debatePopupId, { content: accumulatedText });
              }
              if (parsed.exhaustion) {
                accumulatedText += `\n\n--- SOURCE MATERIAL EXHAUSTION NOTICE ---\n${parsed.status}\n---\n\n`;
                setDebateResult(accumulatedText);
                updatePopup(debatePopupId, { content: accumulatedText });
                toast({ title: "Source Material Alert", description: parsed.status });
              }
              if (parsed.error) {
                setIsStreaming(false);
                updatePopup(debatePopupId, { isGenerating: false });
                toast({ title: "Error", description: parsed.error, variant: "destructive" });
                return;
              }
            } catch {
            }
          }
        }
      }

      if (buffer.startsWith("data: ")) {
        const data = buffer.slice(6);
        if (data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              accumulatedText += parsed.content;
              setDebateResult(accumulatedText);
              updatePopup(debatePopupId, { content: accumulatedText });
            }
            if (parsed.exhaustion) {
              accumulatedText += `\n\n--- SOURCE MATERIAL EXHAUSTION NOTICE ---\n${parsed.status}\n---\n\n`;
              setDebateResult(accumulatedText);
              updatePopup(debatePopupId, { content: accumulatedText });
            }
          } catch {
          }
        }
      }

      setIsStreaming(false);
      updatePopup(debatePopupId, { isGenerating: false });
    }).catch((err) => {
      setIsStreaming(false);
      updatePopup(debatePopupId, { isGenerating: false });
      toast({ title: "Error", description: "Failed to generate debate", variant: "destructive" });
    });
  };

  const handleReset = () => {
    setDebaters([createEmptySlot(), createEmptySlot()]);
    setDebateMode("auto");
    setCustomInstructions("");
    setGeneralPaperText("");
    setGeneralUploadedFileName("");
    setDebateResult("");
  };

  const handleDownload = () => {
    if (!debateResult) return;
    const names = selectedFigures.map(d => d.figure!.name);
    const filename = `debate-${names.join('-vs-')}-${Date.now()}.txt`;
    const blob = new Blob([debateResult], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Swords className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">Create a Debate</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Select 2-4 thinkers to engage in philosophical combat. Each debater can have their own dedicated source material.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Left Panel - Configuration */}
        <div className="space-y-4">
          {/* Debater Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Select Debaters ({selectedFigures.length}/{debaters.length})
                </CardTitle>
                {debaters.length < 4 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addDebater}
                    data-testid="button-add-debater"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Debater
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {debaters.map((slot, index) => (
                <DebaterSelector
                  key={index}
                  slot={slot}
                  slotIndex={index}
                  figures={figures}
                  excludeIds={selectedIds.filter(id => id !== slot.figure?.id)}
                  onSelectFigure={(figure) => updateDebater(index, { figure })}
                  onClearFigure={() => updateDebater(index, { figure: null, uploadedFileName: "", uploadedText: "" })}
                  onSearchChange={(val) => updateDebater(index, { search: val })}
                  onFileAccepted={(file) => handleDebaterFileAccepted(index, file)}
                  onClearFile={() => updateDebater(index, { uploadedFileName: "", uploadedText: "" })}
                  onTextChange={(val) => updateDebater(index, { uploadedText: val })}
                  onRemoveSlot={() => removeDebater(index)}
                  isRemovable={debaters.length > 2}
                />
              ))}
            </CardContent>
          </Card>

          {/* Common Document Upload - moved to prominent position */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="w-4 h-4" />
                Common Document for Debate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Upload a document that ALL debaters will debate about. Each debater also has their own upload area above for debater-specific material.
              </p>
              <DragDropUpload
                onFileAccepted={handleGeneralFileAccepted}
                onClear={() => { setGeneralPaperText(""); setGeneralUploadedFileName(""); }}
                currentFileName={generalUploadedFileName}
                accept=".txt,.md,.doc,.docx,.pdf"
                maxSizeBytes={5 * 1024 * 1024}
                data-testid="drag-drop-upload-debate-common"
              />
              <div>
                <Label className="text-sm mb-2 block">Or paste text directly:</Label>
                <Textarea
                  placeholder="Paste a paper, article, or argument for all debaters to engage with..."
                  value={generalPaperText}
                  onChange={(e) => setGeneralPaperText(e.target.value)}
                  rows={3}
                  className="resize-none"
                  data-testid="textarea-common-document-content"
                />
              </div>
            </CardContent>
          </Card>

          {/* Debate Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Debate Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="debate-mode"
                  checked={debateMode === "custom"}
                  onCheckedChange={(checked) => setDebateMode(checked ? "custom" : "auto")}
                  data-testid="switch-debate-mode"
                />
                <Label htmlFor="debate-mode" className="cursor-pointer">
                  {debateMode === "auto" ? "Auto (Maximum Disagreement)" : "Custom Instructions"}
                </Label>
              </div>

              {debateMode === "custom" && (
                <div>
                  <Label className="text-sm mb-2 block">Topic or Instructions</Label>
                  <Textarea
                    placeholder="Enter a topic (e.g., 'free will', 'the nature of consciousness') or specific instructions..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={4}
                    className="resize-none"
                    data-testid="textarea-custom-instructions"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enhanced Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Switch
                  id="enhanced-mode"
                  checked={enhanced}
                  onCheckedChange={setEnhanced}
                  data-testid="switch-enhanced-mode"
                />
                <Label htmlFor="enhanced-mode" className="cursor-pointer">
                  Enable RAG for deeper philosophical grounding
                </Label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Uses retrieval-augmented generation to ground responses in actual philosophical positions
              </p>
            </CardContent>
          </Card>

          {/* Word Length */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Debate Length</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="word-length-input">Word Count (100 - 50,000)</Label>
              <Input
                id="word-length-input"
                type="number"
                min={100}
                max={50000}
                value={wordLengthInput}
                onChange={(e) => setWordLengthInput(e.target.value)}
                placeholder="Enter desired word count..."
                className="mt-2"
                data-testid="input-word-length"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {parseInt(wordLengthInput) > 3000
                  ? `Will be generated using coherence system for quality across ${Math.ceil(parseInt(wordLengthInput) / 2000)} rounds`
                  : "Standard single-generation debate"
                }
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleGenerate}
              disabled={selectedFigures.length < 2 || isStreaming}
              className="flex-1"
              data-testid="button-generate-debate"
            >
              {isStreaming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Streaming Debate...
                </>
              ) : (
                <>
                  <Swords className="w-4 h-4 mr-2" />
                  Generate Debate ({selectedFigures.length} debaters)
                </>
              )}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={isStreaming}
              data-testid="button-reset-debate"
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Right Panel - Results */}
        <div className="flex flex-col">
          <Card className="flex flex-col h-full min-h-[600px]">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle>Debate Results</CardTitle>
                  {debateResult && !isStreaming && (
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-debate-word-count">
                      {debateResult.split(/\s+/).filter(w => w.length > 0).length.toLocaleString()} words
                    </p>
                  )}
                </div>
                {(debateResult || isStreaming) && (
                  <div className="flex items-center gap-2">
                    <Button onClick={handleCopy} variant="ghost" size="sm" data-testid="button-copy-debate">
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                    <Button onClick={handleClear} variant="ghost" size="sm" className="text-destructive hover:text-destructive" data-testid="button-clear-debate">
                      <Trash2 className="h-3 w-3 mr-1" />
                      Clear
                    </Button>
                    <Button onClick={handleDownload} variant="outline" size="sm" className="gap-2" data-testid="button-download-debate">
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
              {debateResult ? (
                <ScrollArea className="flex-1 px-6 pb-6">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap" data-testid="debate-result">
                    {debateResult}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center flex-1 text-center text-muted-foreground px-6 pb-6">
                  <div>
                    <Swords className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select at least two thinkers and click "Generate Debate"</p>
                    <p className="text-sm mt-1">The debate will appear here</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
