import { SettingsPanel } from "@/components/SettingsPanel";
import { RepoForm } from "@/components/RepoForm";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { useMemo, useState } from "react";
import type { Architecture } from "@/types/architecture";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Index = () => {
  const [arch, setArch] = useState<Architecture | undefined>(undefined);

  const heroBg = useMemo(() => ({
    backgroundImage: "radial-gradient(1200px 600px at 50% -20%, hsl(var(--accent) / 0.35), transparent)",
  }), []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="container py-10" style={heroBg}>
        <div className="mb-6">
          <Alert>
            <AlertTitle>Security & Privacy by Design</AlertTitle>
            <AlertDescription>
              Aplikacja działa wyłącznie w Twojej przeglądarce. Nie przetwarzamy żadnych danych użytkownika ani nie wysyłamy tokenów na serwer.
            </AlertDescription>
          </Alert>
        </div>
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Interaktywny diagram architektury z GitHub i LLM</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Wklej link do repozytorium, dodaj klucz OpenAI/OpenRouter i otrzymaj edukacyjny widok: bazy danych, API, przepływy i zależności.
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="#analyze">
              <Button variant="hero">Zacznij analizę</Button>
            </a>
            <a href="#settings">
              <Button variant="glow">Ustaw klucz API</Button>
            </a>
          </div>
        </div>
      </header>

      <section id="settings" className="container py-6">
        <SettingsPanel />
      </section>

      <section id="analyze" className="container py-6 grid gap-6">
        <RepoForm onResult={setArch} />
        <ArchitectureDiagram arch={arch} />
      </section>

      <footer className="container py-10 text-sm text-muted-foreground text-center">
        EduDiag — naukowa wizualizacja architektury z repozytorium. Wspierane przez LLM.
      </footer>
    </main>
  );
};

export default Index;
