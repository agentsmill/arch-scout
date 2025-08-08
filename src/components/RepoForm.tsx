import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getRepoText, saveGitHubToken, getGitHubToken, clearGitHubToken } from "@/utils/GitHubService";
import { callLLM, extractJSON } from "@/utils/LLMService";
import type { Architecture } from "@/types/architecture";
interface Props {
  onResult: (arch: Architecture) => void;
}

export const RepoForm = ({ onResult }: Props) => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"public" | "token">("public");
  const [ghToken, setGhToken] = useState("");

  useEffect(() => {
    const existing = getGitHubToken();
    setGhToken(existing);
    setAuthMode(existing ? "token" : "public");
  }, []);
  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === "token" && !getGitHubToken()) {
        throw new Error("Brak zapisanego tokenu GitHub. Zapisz token lub wybierz tryb publiczny.");
      }
      toast({ title: "Pobieram dokumentację", description: "Czytanie README i docs z GitHub" });
      const text = await getRepoText(url);

      toast({ title: "Analiza LLM", description: "Tworzę diagram architektury" });
      const system = `Jesteś architektem oprogramowania i edukatorem. Na podstawie README i dokumentacji repozytorium GitHub przygotuj zwięzły, edukacyjny JSON opisu architektury.
- Skup się na: modułach/systemach, bazach danych i schematach tabel, API/endpoints, kolejkach/zdarzeniach, komunikacji między komponentami.
- Wyjaśnij rolę każdego elementu w polu description/notes i cel tabel w purpose.
- Zwróć wyłącznie poprawny JSON w poniższym schemacie.`;

      const user = `REPO: ${url}\n\nDOKUMENTACJA:\n\n${text.substring(0, 100000)}`;

      const schemaHint = `Struktura JSON:
{
  "nodes": [
    {"id":"svc-api","type":"service|db|api|queue|cache|frontend|external|cron","label":"...","description":"...","tech":["..."],"notes":"...","dbSchema":[{"table":"...","columns":[{"name":"id","type":"uuid","pk":true,"fk":"table.col?"}],"purpose":"..."}]}],
  "edges": [
    {"id":"e1","source":"svc-api","target":"db-main","label":"POST /v1/items","protocol":"http|rpc|sql|queue|event","details":"...","security":"...","frequency":"..."}
  ],
  "legend": {"service":"usługi/serwisy","db":"bazy danych", "api":"interfejsy API"}
}`;

      const content = await callLLM([
        { role: "system", content: system },
        { role: "user", content: `${schemaHint}\n\n${user}` },
      ]);

      const json = extractJSON(content);
      onResult(json as Architecture);
      toast({ title: "Gotowe", description: "Diagram został zaktualizowany" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Błąd", description: err.message || "Nie udało się przeanalizować repo", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSaveToken = () => {
    saveGitHubToken(ghToken);
    toast({ title: "Zapisano token", description: "Token GitHub przechowywany lokalnie (localStorage)" });
  };
  const onClearToken = () => {
    clearGitHubToken();
    setGhToken("");
    setAuthMode("public");
    toast({ title: "Usunięto token", description: "Wyczyszczono token z przeglądarki" });
  };

  return (
    <section className="w-full rounded-lg border bg-card p-4 grid gap-4">
      <form onSubmit={analyze} className="grid gap-3">
        <div className="grid gap-2">
          <Label>Link do GitHub (publiczne lub prywatne repo)</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" required />
        </div>

        <div className="grid gap-2">
          <Label>Dostęp do GitHub</Label>
          <div className="flex flex-col gap-2">
            <Select value={authMode} onValueChange={(v) => setAuthMode(v as any)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Wybierz tryb" /></SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="public">Publiczny (bez tokenu)</SelectItem>
                <SelectItem value="token">Token PAT (lokalnie)</SelectItem>
              </SelectContent>
            </Select>
            {authMode === "token" && (
              <div className="flex gap-2">
                <Input type="password" placeholder="ghp_..." value={ghToken} onChange={(e) => setGhToken(e.target.value)} />
                <Button type="button" variant="secondary" onClick={onSaveToken}>Zapisz token</Button>
                {ghToken && <Button type="button" variant="outline" onClick={onClearToken}>Wyczyść</Button>}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Token przechowywany wyłącznie lokalnie (localStorage). Nie wysyłamy go na żaden serwer.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="hero" disabled={loading}>{loading ? "Analizuję..." : "Analizuj repo"}</Button>
        </div>
      </form>
    </section>
  );
};
