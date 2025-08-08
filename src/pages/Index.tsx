import { SettingsPanel } from "@/components/SettingsPanel";
import { RepoForm } from "@/components/RepoForm";
import { ArchitectureDiagram } from "@/components/ArchitectureDiagram";
import { useMemo, useState } from "react";
import type { Architecture } from "@/types/architecture";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/i18n";
import LanguageSwitch from "@/components/LanguageSwitch";
const Index = () => {
  const [arch, setArch] = useState<Architecture | undefined>(undefined);
  const { t } = useI18n();

  const heroBg = useMemo(() => ({
    backgroundImage: "radial-gradient(1200px 600px at 50% -20%, hsl(var(--accent) / 0.35), transparent)",
  }), []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="container py-10" style={heroBg}>
        <div className="flex justify-end mb-4">
          <LanguageSwitch />
        </div>
        <div className="mb-6">
          <Alert>
            <AlertTitle>{t("security_title")}</AlertTitle>
            <AlertDescription>
              {t("security_desc")}
            </AlertDescription>
          </Alert>
        </div>
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{t("hero_title")}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("hero_desc")}
          </p>
          <div className="flex items-center justify-center gap-3">
            <a href="#analyze">
              <Button variant="hero">{t("cta_analyze")}</Button>
            </a>
            <a href="#settings">
              <Button variant="glow">{t("cta_set_api")}</Button>
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
        {t("footer")}
      </footer>
    </main>
  );
};

export default Index;
