import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Upload, FileText, Check, Loader2, Database, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Link } from "wouter";

interface ProcessingStats {
  wordCount: number;
  positions: number;
  arguments: number;
  trends: number;
  qas: number;
  sections: number;
}

export default function CoreProcessor() {
  const [authorName, setAuthorName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState("");
  const [result, setResult] = useState<{ documentTitle: string; stats: ProcessingStats } | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError("");
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || !authorName.trim()) {
      setError("Please select a file and enter the author's name");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatus("Starting...");
    setPhase("");
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("authorName", authorName.trim());

    try {
      const response = await fetch("/api/core-documents/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok && !response.headers.get('content-type')?.includes('text/event-stream')) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setError(errorData.error || 'Failed to process document');
        setIsProcessing(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
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
                setIsProcessing(false);
                break;
              }
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.error) {
                  setError(parsed.error);
                  setIsProcessing(false);
                  break;
                }
                
                if (parsed.status) setStatus(parsed.status);
                if (parsed.phase) setPhase(parsed.phase);
                if (parsed.progress) setProgress(parsed.progress);
                
                if (parsed.phase === "complete" && parsed.documentTitle) {
                  setResult({
                    documentTitle: parsed.documentTitle,
                    stats: parsed.stats
                  });
                }
              } catch (e) {
                console.error("Parse error:", e);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Processing error:", err);
      setError("Failed to process document. Please try again.");
      setIsProcessing(false);
    }
  };

  const phaseLabels: Record<string, string> = {
    outline: "Analyzing Structure",
    positions: "Extracting Positions",
    arguments: "Identifying Arguments",
    trends: "Finding Trends",
    qas: "Generating Q&As",
    saving: "Saving to Database",
    complete: "Complete"
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-semibold">CORE Document Processor</h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Process Philosophical Document
            </CardTitle>
            <CardDescription>
              Upload a philosophical work (up to 100,000 words) to generate detailed analysis including outline, positions, arguments, trends, and 50 Q&As. Documents are stored as CORE_AUTHOR_N format for priority querying.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="authorName">Author Name</Label>
              <Input
                id="authorName"
                placeholder="e.g., Sigmund Freud, Werner Heisenberg"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                disabled={isProcessing}
                data-testid="input-author-name"
              />
              <p className="text-sm text-muted-foreground">
                If this author doesn't exist in the database, they will be automatically created.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Document File</Label>
              <div 
                className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate cursor-pointer transition-colors"
                onClick={() => fileInputRef.current?.click()}
                data-testid="dropzone-file"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.txt,.md"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isProcessing}
                  data-testid="input-file"
                />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PDF, DOCX, TXT, or MD (up to 100,000 words)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg" data-testid="text-error">
                {error}
              </div>
            )}

            {isProcessing && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="font-medium">{phaseLabels[phase] || phase}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">{status}</p>
              </div>
            )}

            {result && (
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 space-y-4" data-testid="card-result">
                <div className="flex items-center gap-2 text-primary">
                  <Check className="h-6 w-6" />
                  <span className="font-semibold text-lg">Document Processed Successfully</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Document ID</p>
                    <p className="font-mono font-medium">{result.documentTitle}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Word Count</p>
                    <p className="font-medium">{result.stats.wordCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Positions Extracted</p>
                    <p className="font-medium">{result.stats.positions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Arguments Identified</p>
                    <p className="font-medium">{result.stats.arguments}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trends Found</p>
                    <p className="font-medium">{result.stats.trends}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Q&As Generated</p>
                    <p className="font-medium">{result.stats.qas}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  This document is now indexed and will be prioritized in all queries for {authorName}.
                </p>
              </div>
            )}

            <Button
              onClick={handleProcess}
              disabled={isProcessing || !selectedFile || !authorName.trim()}
              className="w-full"
              size="lg"
              data-testid="button-process"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Process Document
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
