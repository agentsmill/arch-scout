export type Provider = "openai" | "openrouter";

const STORAGE_KEYS = {
  provider: "edudiag_provider",
  apiKey: "edudiag_api_key",
  model: "edudiag_model",
};

export const Settings = {
  save(provider: Provider, apiKey: string, model?: string) {
    localStorage.setItem(STORAGE_KEYS.provider, provider);
    localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
    if (model) localStorage.setItem(STORAGE_KEYS.model, model);
  },
  get() {
    return {
      provider: (localStorage.getItem(STORAGE_KEYS.provider) as Provider) ||
        (localStorage.getItem(STORAGE_KEYS.apiKey) ? ("openai" as Provider) : undefined),
      apiKey: localStorage.getItem(STORAGE_KEYS.apiKey) || "",
      model: localStorage.getItem(STORAGE_KEYS.model) || "",
    } as { provider?: Provider; apiKey: string; model: string };
  },
};

export async function callLLM(messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  const { provider, apiKey, model } = Settings.get();
  if (!provider || !apiKey) throw new Error("Brak ustawionego dostawcy lub klucza API");

  const defaults = {
    openai: "o4-mini-deep-research-2025-06-26",
    openrouter: "openrouter/auto",
  } as const;

  if (provider === "openai") {
    const selected = (model || defaults.openai).trim();
    const endpoint = "https://api.openai.com/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    } as const;

    const attempt = async (body: Record<string, unknown>) => {
      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        let err: any = undefined;
        try { err = await res.json(); } catch {}
        const code = err?.error?.code; const message = err?.error?.message;
        throw { status: res.status, code, message };
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content as string;
    };

    try {
      // Prefer JSON mode + temperature for supporting models
      return await attempt({ model: selected, messages, temperature: 0.2, response_format: { type: "json_object" } });
    } catch (e: any) {
      // Retry without temperature/response_format if unsupported
      if (e?.status === 400) {
        try {
          return await attempt({ model: selected, messages });
        } catch (e2: any) {
          if (selected !== defaults.openai) {
            // Fallback to safe default model
            return await attempt({ model: defaults.openai, messages, temperature: 0.2, response_format: { type: "json_object" } });
          }
          throw new Error(`OpenAI błąd: ${e2?.status || ""} ${e2?.message || ""}`.trim());
        }
      }
      throw new Error(`OpenAI błąd: ${e?.status || ""} ${e?.message || ""}`.trim());
    }
  }

  if (provider === "openrouter") {
    const selected = (model || defaults.openrouter).trim();
    const endpoint = "https://openrouter.ai/api/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": window.location.origin,
      "X-Title": "EduDiag",
    } as const;

    const attempt = async (body: Record<string, unknown>) => {
      const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(body) });
      if (!res.ok) {
        let err: any = undefined;
        try { err = await res.json(); } catch {}
        const code = err?.error?.code; const message = err?.error?.message;
        throw { status: res.status, code, message };
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content as string;
    };

    try {
      return await attempt({ model: selected, messages, temperature: 0.2 });
    } catch (e: any) {
      if (e?.status === 400) {
        return await attempt({ model: selected, messages });
      }
      throw new Error(`OpenRouter błąd: ${e?.status || ""} ${e?.message || ""}`.trim());
    }
  }

  throw new Error("Nieznany dostawca");
}

export function extractJSON(text: string) {
  if (!text) throw new Error("Pusta odpowiedź LLM");
  const fenceMatch = text.match(/```json[\s\S]*?```/i) || text.match(/```[\s\S]*?```/);
  const raw = fenceMatch ? fenceMatch[0].replace(/```json|```/gi, "").trim() : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const slice = start >= 0 && end >= 0 ? raw.slice(start, end + 1) : raw;
  return JSON.parse(slice);
}
