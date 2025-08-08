import { Provider } from "./LLMService";

export type ModelInfo = { id: string; label: string };

const OPENAI_FALLBACK: ModelInfo[] = [
  { id: "gpt-4.1-2025-04-14", label: "gpt-4.1-2025-04-14 (zalecany)" },
  { id: "o4-mini-2025-04-16", label: "o4-mini-2025-04-16" },
  { id: "gpt-4o", label: "gpt-4o" },
];

const OPENROUTER_FALLBACK: ModelInfo[] = [
  { id: "openrouter/auto", label: "openrouter/auto (auto-wybór)" },
];

const excludeRe = /(embedding|whisper|tts|audio|image|dall|clip|moderation|realtime)/i;
const includeRe = /(gpt|^o[0-9]|openrouter\/auto|claude|llama|mixtral)/i;
const responsesOnlyRe = /(deep-research)/i; // wykluczamy na razie z listy chatowej

export async function fetchModels(provider: Provider, apiKey: string): Promise<ModelInfo[]> {
  if (!provider || !apiKey) return [];

  if (provider === "openai") {
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const items: ModelInfo[] = (data?.data || [])
        .map((m: any) => ({ id: m.id as string, label: m.id as string }))
        .filter((m: ModelInfo) => includeRe.test(m.id) && !excludeRe.test(m.id) && !responsesOnlyRe.test(m.id));

      const priority = [
        "gpt-4.1-2025-04-14",
        "o4-mini-2025-04-16",
        "gpt-4o",
      ];
      items.sort((a, b) => (priority.indexOf(a.id) + 1 || 999) - (priority.indexOf(b.id) + 1 || 999) || a.id.localeCompare(b.id));
      return items.length ? items : OPENAI_FALLBACK;
    } catch {
      return OPENAI_FALLBACK;
    }
  }

  if (provider === "openrouter") {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "EduDiag",
        },
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const items: ModelInfo[] = (data?.data || [])
        .map((m: any) => ({ id: m.id as string, label: m.name || (m.id as string) }))
        .filter((m: ModelInfo) => includeRe.test(m.id) && !excludeRe.test(m.id));

      // Umieszczamy auto na górze
      const auto = items.find((i) => i.id === "openrouter/auto");
      const rest = items.filter((i) => i.id !== "openrouter/auto").sort((a, b) => a.label.localeCompare(b.label));
      return auto ? [auto, ...rest] : items.length ? items : OPENROUTER_FALLBACK;
    } catch {
      return OPENROUTER_FALLBACK;
    }
  }

  return [];
}
