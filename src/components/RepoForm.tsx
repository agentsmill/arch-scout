import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getRepoContext, saveGitHubToken, getGitHubToken, clearGitHubToken } from "@/utils/GitHubService";
import { callLLM, extractJSON } from "@/utils/LLMService";
import type { Architecture } from "@/types/architecture";
import { useI18n } from "@/i18n";
interface Props {
  onResult: (arch: Architecture) => void;
}

export const RepoForm = ({ onResult }: Props) => {
  const { toast } = useToast();
  const { t, quips } = useI18n();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"public" | "token">("public");
  const [ghToken, setGhToken] = useState("");

  useEffect(() => {
    const existing = getGitHubToken();
    setGhToken(existing);
    setAuthMode(existing ? "token" : "public");
  }, []);

  const [quipIdx, setQuipIdx] = useState(0);
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setQuipIdx((i) => (i + 1) % quips.length), 3000);
    return () => clearInterval(id);
  }, [loading, quips]);
  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === "token" && !getGitHubToken()) {
        throw new Error(t("token_missing"));
      }
      toast({ title: t("llm_fetch_docs"), description: t("llm_fetch_docs_desc") });
      const ctx = await getRepoContext(url);

      toast({ title: t("llm_analyze"), description: t("llm_analyze_desc") });
      
      // Use localized system prompt
      const systemPrompt = t("lang") === "pl" 
        ? `Jesteś architektem oprogramowania i edukatorem. Na podstawie dostarczonych materiałów przygotuj zwięzły JSON opisu architektury zgodny ze schematem.
- Zwróć WYŁĄCZNIE poprawny JSON (bez komentarzy i tekstu poza JSON).
- Jeśli elementu nie rozpoznajesz: ustaw type="service", label="unknown-service:<krótki-domysł>", a description zaczynaj od "Niepewne: ..." i podaj prawdopodobną rolę z odwołaniami do plików.
- Wykorzystuj importsIndex i ŹRÓDŁA do wnioskowania powiązań/tech. Nie halucynuj.
- API podawaj tylko, gdy występują w materiałach. dbSchema twórz tylko z jawnych definicji.
- Używaj zwięzłych, URL-safe id i zachowaj spójność między nodes/edges.`
        : `You are a software architect and educator. Based on the provided materials, prepare a concise JSON architecture description following the schema.
- Return ONLY valid JSON (no comments or text outside JSON).
- If you don't recognize an element: set type="service", label="unknown-service:<short-guess>", and start description with "Uncertain: ..." and provide probable role with file references.
- Use importsIndex and SOURCES to infer connections/tech. Don't hallucinate.
- Only include APIs when they appear in materials. Create dbSchema only from explicit definitions.
- Use concise, URL-safe ids and maintain consistency between nodes/edges.`;

      const schemaHint = `Struktura JSON:\n{\n  \"nodes\": [\n    {\"id\":\"svc-api\",\"type\":\"service|db|api|queue|cache|frontend|external|cron\",\"label\":\"...\",\"description\":\"...\",\"tech\":[\"...\"],\"notes\":\"...\",\"dbSchema\":[{\"table\":\"...\",\"columns\":[{\"name\":\"id\",\"type\":\"uuid\",\"pk\":true,\"fk\":\"table.col?\"}],\"purpose\":\"...\"}]}],\n  \"edges\": [\n    {\"id\":\"e1\",\"source\":\"svc-api\",\"target\":\"db-main\",\"label\":\"POST /v1/items\",\"protocol\":\"http|rpc|sql|queue|event\",\"details\":\"...\",\"security\":\"...\",\"frequency\":\"...\"}\n  ],\n  \"legend\": {\"service\":\"usługi/serwisy\",\"db\":\"bazy danych\", \"api\":\"interfejsy API\"}\n}`;

      const metaBlock = `REPO: ${url}\nMETADATA:\n- Default branch: ${ctx.metadata.defaultBranch}\n- Languages: ${ctx.metadata.languages.join(", ")}`;
      const importsBlock = `importsIndex:\n${JSON.stringify(ctx.importsIndex, null, 2).substring(0, 20000)}`;
      const docsBlock = `ŹRÓDŁA (wycinki):\n${ctx.contextText.substring(0, 100000)}`;

      const content = await callLLM([
        { role: "system", content: systemPrompt },
        { role: "user", content: `${schemaHint}\n\n${metaBlock}\n\n${importsBlock}\n\n${docsBlock}` },
      ]);
      const json = extractJSON(content);
      onResult(json as Architecture);
      toast({ title: t("done"), description: t("done_desc") });
    } catch (err: any) {
      console.error(err);
      toast({ title: t("error"), description: err.message || "Analysis failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSaveToken = () => {
    saveGitHubToken(ghToken);
    toast({ title: t("token_saved"), description: t("token_saved_desc") });
  };
  const onClearToken = () => {
    clearGitHubToken();
    setGhToken("");
    setAuthMode("public");
    toast({ title: t("token_cleared"), description: t("token_cleared_desc") });
  };

  return (
    <section className="w-full rounded-lg border bg-card p-4 grid gap-4">
      <form onSubmit={analyze} className="grid gap-3">
        <div className="grid gap-2">
          <Label>{t("repo_link_label")}</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://github.com/owner/repo" required />
        </div>

        <div className="grid gap-2">
          <Label>{t("github_access")}</Label>
          <div className="flex flex-col gap-2">
            <Select value={authMode} onValueChange={(v) => setAuthMode(v as any)}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t("select_mode")} /></SelectTrigger>
              <SelectContent className="z-50 bg-popover">
                <SelectItem value="public">{t("public_mode")}</SelectItem>
                <SelectItem value="token">{t("token_mode")}</SelectItem>
              </SelectContent>
            </Select>
            {authMode === "token" && (
              <div className="flex gap-2">
                <Input type="password" placeholder="ghp_..." value={ghToken} onChange={(e) => setGhToken(e.target.value)} />
                <Button type="button" variant="secondary" onClick={onSaveToken}>{t("save_token")}</Button>
                {ghToken && <Button type="button" variant="outline" onClick={onClearToken}>{t("clear")}</Button>}
              </div>
            )}
            <p className="text-xs text-muted-foreground">{t("token_note")}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="hero" disabled={loading}>{loading ? t("analyzing") : t("analyze")}</Button>
        </div>
        {loading && (
          <div className="mt-3 flex items-center gap-3 rounded-md border bg-card p-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" aria-label={t("loading")}></div>
            <p className="text-sm text-muted-foreground">{quips[quipIdx]}</p>
          </div>
        )}
      </form>
    </section>
  );
};
