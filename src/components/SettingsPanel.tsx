import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Provider, Settings } from "@/utils/LLMService";

export const SettingsPanel = () => {
  const { toast } = useToast();
  const init = Settings.get();
  const [provider, setProvider] = useState<Provider | "">((init.provider as Provider) ?? "");
  const [apiKey, setApiKey] = useState(init.apiKey || "");
  const [model, setModel] = useState(init.model || "");

  const onSave = () => {
    if (!provider || !apiKey) {
      toast({ title: "Błąd", description: "Wybierz dostawcę i wprowadź klucz API", variant: "destructive" });
      return;
    }
    Settings.save(provider as Provider, apiKey, model);
    toast({ title: "Zapisano", description: "Ustawienia API zostały zapisane" });
  };

  return (
    <section className="w-full rounded-lg border bg-card p-4 grid gap-4">
      <div>
        <h2 className="text-lg font-semibold">Ustawienia LLM</h2>
        <p className="text-sm text-muted-foreground">Obsługiwani dostawcy: OpenAI lub OpenRouter</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="grid gap-2">
          <Label>Dostawca</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz dostawcę" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="openrouter">OpenRouter</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label>Klucz API</Label>
          <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-... lub ..." />
        </div>
        <div className="grid gap-2 md:col-span-3">
          <Label>Model (opcjonalnie)</Label>
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="np. gpt-4o-mini lub openrouter/auto" />
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="glow" onClick={onSave}>Zapisz</Button>
      </div>
    </section>
  );
};
