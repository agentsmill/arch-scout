import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Provider, Settings } from "@/utils/LLMService";
import { fetchModels, ModelInfo } from "@/utils/ModelService";
import { useI18n } from "@/i18n";

export const SettingsPanel = () => {
  const { toast } = useToast();
  const { t } = useI18n();
  const init = Settings.get();
  const [provider, setProvider] = useState<Provider | "">((init.provider as Provider) ?? "");
  const [apiKey, setApiKey] = useState(init.apiKey || "");
  const [model, setModel] = useState(init.model || "");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!provider || !apiKey) { setModels([]); return; }
      setModelsLoading(true);
      try {
        const list = await fetchModels(provider as Provider, apiKey);
        if (!cancelled) {
          setModels(list);
          if (!model && list[0]) setModel(list[0].id);
        }
      } catch {
        if (!cancelled) setModels([]);
      } finally {
        if (!cancelled) setModelsLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [provider, apiKey]);
  const onSave = () => {
    if (!provider || !apiKey) {
      toast({ title: t("error_validate"), description: t("error_api_missing"), variant: "destructive" });
      return;
    }
    Settings.save(provider as Provider, apiKey, model);
    toast({ title: t("settings_saved"), description: t("settings_saved_desc") });
  };

  return (
    <section className="w-full rounded-lg border bg-card p-4 grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">{t("llm_settings")}</h2>
        <p className="text-sm text-muted-foreground">{t("providers_supported")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>{t("provider")}</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
            <SelectTrigger>
              <SelectValue placeholder={t("choose_provider")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label>{t("api_key")}</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-... lub ..." />
        </div>
        <div className="grid gap-2 md:col-span-3">
          <Label>{t("model")}</Label>
          <Select value={model} onValueChange={(v) => setModel(v)}>
            <SelectTrigger>
              <SelectValue placeholder={modelsLoading ? t("loading_models") : t("choose_model")} />
            </SelectTrigger>
            <SelectContent>
              {(models.length ? models : (provider === "openai" ? [{id:"gpt-4.1-2025-04-14", label:`gpt-4.1-2025-04-14 ${t("model_recommended")}`}] : [{id:"openrouter/auto", label:`openrouter/auto ${t("model_auto_select")}`}])).map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="glow" onClick={onSave} disabled={modelsLoading}>{t("save")}</Button>
      </div>
    </section>
  );
};
