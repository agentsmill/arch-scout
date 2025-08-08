import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

type Lang = "en" | "pl";

const STORAGE_KEY = "app.lang";

const MESSAGES: Record<Lang, Record<string, string>> = {
  en: {
    security_title: "Security & Privacy by Design",
    security_desc: "The app runs entirely in your browser. We do not process user data or send tokens to any server.",
    hero_title: "Interactive architecture diagram from GitHub + LLM",
    hero_desc: "Paste a repository link, add your OpenAI/OpenRouter key, and get an educational view: databases, APIs, flows, dependencies.",
    cta_analyze: "Start analysis",
    cta_set_api: "Set API key",
    footer: "EduDiag — educational architecture visualization from a repository. Powered by LLM.",

    repo_link_label: "GitHub link (public or private repo)",
    github_access: "GitHub access",
    select_mode: "Select mode",
    public_mode: "Public (no token)",
    token_mode: "Personal Access Token (local)",
    save_token: "Save token",
    clear: "Clear",
    token_note: "Token stored locally only (localStorage). We never send it to a server.",
    analyze: "Analyze repo",
    analyzing: "Analyzing...",
    loading: "Loading",

    llm_fetch_docs: "Fetching repository docs",
    llm_fetch_docs_desc: "Building a condensed context from GitHub",
    llm_analyze: "LLM analysis",
    llm_analyze_desc: "Generating architecture diagram",
    done: "Done",
    done_desc: "Diagram updated",
    error: "Error",
    token_missing: "No saved GitHub token. Save a token or choose Public mode.",
    token_saved: "Token saved",
    token_saved_desc: "GitHub token stored locally (localStorage)",
    token_cleared: "Token removed",
    token_cleared_desc: "Token cleared from the browser",

    llm_settings: "LLM Settings",
    providers_supported: "Supported providers: OpenAI and OpenRouter",
    provider: "Provider",
    api_key: "API key",
    model: "Model",
    save: "Save",
    loading_models: "Loading models...",
    choose_provider: "Choose provider",
    choose_model: "Choose model",

    diagram_title: "Architecture diagram",
    add_service: "+ Service",
    add_db: "+ DB",
    add_api: "+ API",
    download_json: "Download JSON",
    download_md: "Download Markdown",

    // Node editor ARIA
    node_name: "Node name",
    node_desc: "Node description",
    edit: "Edit",
    save_action: "Save",
    cancel: "Cancel",
  },
  pl: {
    security_title: "Security & Privacy by Design",
    security_desc: "Aplikacja działa wyłącznie w Twojej przeglądarce. Nie przetwarzamy żadnych danych ani tokenów na serwerze.",
    hero_title: "Interaktywny diagram architektury z GitHub i LLM",
    hero_desc: "Wklej link do repozytorium, dodaj klucz OpenAI/OpenRouter i otrzymaj edukacyjny widok: bazy danych, API, przepływy i zależności.",
    cta_analyze: "Zacznij analizę",
    cta_set_api: "Ustaw klucz API",
    footer: "EduDiag — naukowa wizualizacja architektury z repozytorium. Wspierane przez LLM.",

    repo_link_label: "Link do GitHub (publiczne lub prywatne repo)",
    github_access: "Dostęp do GitHub",
    select_mode: "Wybierz tryb",
    public_mode: "Publiczny (bez tokenu)",
    token_mode: "Token PAT (lokalnie)",
    save_token: "Zapisz token",
    clear: "Wyczyść",
    token_note: "Token przechowywany wyłącznie lokalnie (localStorage). Nie wysyłamy go na żaden serwer.",
    analyze: "Analizuj repo",
    analyzing: "Analizuję...",
    loading: "Ładowanie",

    llm_fetch_docs: "Pobieram dokumentację",
    llm_fetch_docs_desc: "Buduję skondensowany kontekst z GitHub",
    llm_analyze: "Analiza LLM",
    llm_analyze_desc: "Tworzę diagram architektury",
    done: "Gotowe",
    done_desc: "Diagram został zaktualizowany",
    error: "Błąd",
    token_missing: "Brak zapisanego tokenu GitHub. Zapisz token lub wybierz tryb publiczny.",
    token_saved: "Zapisano token",
    token_saved_desc: "Token GitHub przechowywany lokalnie (localStorage)",
    token_cleared: "Usunięto token",
    token_cleared_desc: "Wyczyszczono token z przeglądarki",

    llm_settings: "Ustawienia LLM",
    providers_supported: "Obsługiwani dostawcy: OpenAI lub OpenRouter",
    provider: "Dostawca",
    api_key: "Klucz API",
    model: "Model",
    save: "Zapisz",
    loading_models: "Ładowanie modeli...",
    choose_provider: "Wybierz dostawcę",
    choose_model: "Wybierz model",

    diagram_title: "Diagram architektury",
    add_service: "+ Service",
    add_db: "+ DB",
    add_api: "+ API",
    download_json: "Pobierz JSON",
    download_md: "Pobierz Markdown",

    node_name: "Nazwa węzła",
    node_desc: "Opis węzła",
    edit: "Edytuj",
    save_action: "Zapisz",
    cancel: "Anuluj",
  },
};

const QUIPS: Record<Lang, string[]> = {
  en: [
    "Perfect architecture doesn’t exist — but you can always add another layer of abstraction.",
    "If it works, it’s time to write unit tests... and integration... and contract tests.",
    "A monolith is a microservice that hasn’t found itself yet.",
    "Horizontal scaling fixes everything — except the cloud bill.",
    "Documentation is alive. Sadly, it often lives its own life.",
    "There’s no tech debt. Only long-term investments.",
    "Kubernetes: because one YAML a day keeps DevOps in motion.",
    "Caching is magic. It works — until it doesn’t.",
    "Event-driven? Great — now nobody knows who calls whom.",
    "CI/CD — Continuous Investigation / Continuous Debugging.",
    "Every problem can be solved with yet another message queue.",
    "There are no bad architectural decisions — only underdocumented ones.",
  ],
  pl: [
    "Architektura idealna nie istnieje, ale zawsze można dodać jeszcze jedną warstwę abstrakcji.",
    "Jeśli coś działa, to czas na testy jednostkowe... integracyjne... i kontraktowe.",
    "Monolit to mikroserwis, który jeszcze nie zrozumiał swojego przeznaczenia.",
    "Skalowalność pozioma rozwiązuje wszystko — poza rachunkiem za chmurę.",
    "Dokumentacja żyje. Niestety najczęściej własnym życiem.",
    "Nie ma długów technicznych. Są tylko inwestycje o długim terminie zwrotu.",
    "Kubernetes: bo jeden YAML dziennie trzyma DevOpsy w ruchu.",
    "Caching to magia. Działa, dopóki nie działa.",
    "Event-driven? Idealnie — teraz nikt nie wie, kto kogo woła.",
    "CI/CD — Continuous Investigation / Continuous Debugging.",
    "Każdy problem da się rozwiązać kolejną kolejką wiadomości.",
    "Nie ma złych decyzji architektonicznych — są tylko mniej udokumentowane.",
  ],
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  quips: string[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem(STORAGE_KEY) as Lang) || "en");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    // Update HTML lang attribute
    document.documentElement.lang = lang === "pl" ? "pl" : "en";
  }, [lang]);

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    setLang,
    t: (key: string) => MESSAGES[lang][key] ?? MESSAGES.en[key] ?? key,
    quips: QUIPS[lang] || QUIPS.en,
  }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
