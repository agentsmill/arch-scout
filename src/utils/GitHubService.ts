export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/^\//, "").split("/");
    const owner = parts[0];
    let repo = (parts[1] || "").replace(/\.git$/, "");
    if (!owner || !repo) throw new Error("Nieprawidłowy link repozytorium");
    return { owner, repo };
  } catch (e) {
    throw new Error("Nieprawidłowy link repozytorium");
  }
}

export const GH_TOKEN_KEY = "gh_token";

export function saveGitHubToken(token: string) {
  try {
    if (token) localStorage.setItem(GH_TOKEN_KEY, token);
  } catch {}
}

export function getGitHubToken(): string {
  try {
    return localStorage.getItem(GH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function clearGitHubToken() {
  try {
    localStorage.removeItem(GH_TOKEN_KEY);
  } catch {}
}

async function fetchRaw(url: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github.v3.raw" };
  const token = getGitHubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GitHub błąd: ${res.status}`);
  return res.text();
}

export async function fetchReadme(owner: string, repo: string) {
  const endpoint = `https://api.github.com/repos/${owner}/${repo}/readme`;
  try {
    return await fetchRaw(endpoint);
  } catch {
    return "";
  }
}

export async function fetchDocs(owner: string, repo: string) {
  const collected: string[] = [];
  const tryPaths = ["docs", "doc", ".", "architecture", "Documentation"];
  for (const path of tryPaths) {
    const listUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    try {
      const res = await fetch(listUrl);
      if (!res.ok) continue;
      const entries = (await res.json()) as Array<any>;
      const files = entries.filter((e) => e.type === "file" && /\.(md|mdx|txt)$/i.test(e.name));
      for (const file of files.slice(0, 5)) {
        const raw = file.download_url ? await fetchRaw(file.download_url) : await fetchRaw(file.url);
        collected.push(`# ${file.name}\n\n${raw.substring(0, 8000)}`);
      }
      if (collected.length > 0) break;
    } catch {}
  }
  return collected.join("\n\n---\n\n");
}

export async function getRepoText(repoUrl: string) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const [readme, docs] = await Promise.all([fetchReadme(owner, repo), fetchDocs(owner, repo)]);
  const combined = [readme, docs].filter(Boolean).join("\n\n");
  return combined.substring(0, 120_000);
}

// Enhanced context building utilities

interface TreeItem {
  path: string;
  mode: string;
  type: "blob" | "tree";
  sha: string;
  size?: number;
  url: string;
}

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
  };
  const token = getGitHubToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function fetchJSON<T = any>(url: string): Promise<T> {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

async function getRepoMeta(owner: string, repo: string) {
  const repoInfo = await fetchJSON<any>(`https://api.github.com/repos/${owner}/${repo}`);
  const branch = repoInfo.default_branch || "main";
  const langsObj = await fetchJSON<Record<string, number>>(`https://api.github.com/repos/${owner}/${repo}/languages`).catch(() => ({} as any));
  const languages = Object.keys(langsObj || {}).slice(0, 5);
  return { defaultBranch: branch, languages };
}

async function getBranchSha(owner: string, repo: string, branch: string) {
  const data = await fetchJSON<any>(`https://api.github.com/repos/${owner}/${repo}/branches/${branch}`);
  return data?.commit?.sha as string;
}

async function fetchTreeRecursive(owner: string, repo: string, sha: string) {
  const data = await fetchJSON<{ truncated: boolean; tree: TreeItem[] }>(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`
  );
  return data;
}

function isTextual(path: string) {
  return /(md|mdx|txt|json|ya?ml|xml|csv|ts|tsx|js|jsx|py|rb|go|rs|java|cs|php)$/i.test(path);
}

function extOf(path: string) {
  const m = path.match(/\.([^.]+)$/);
  return (m?.[1] || "").toLowerCase();
}

async function fetchRawFromBranch(owner: string, repo: string, branch: string, path: string) {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${path}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`Raw fetch failed: ${res.status}`);
  return res.text();
}

function pickDocs(tree: TreeItem[]) {
  const mdFiles = tree.filter((t) => t.type === "blob" && /(^|\/)README(\.|$)/i.test(t.path));
  const docsFiles = tree.filter(
    (t) => t.type === "blob" && /^(docs|doc|architecture|Documentation)\//i.test(t.path) && /\.(md|mdx|txt)$/i.test(t.path)
  );
  return { mdFiles, docsFiles: docsFiles.slice(0, 5) };
}

function pickOpenAPI(tree: TreeItem[]) {
  return tree.filter(
    (t) =>
      t.type === "blob" && /(^|\/)((openapi|swagger).*(\.ya?ml|\.json)|.*\/(openapi|swagger)\.(ya?ml|json))$/i.test(t.path)
  ).slice(0, 2);
}

function pickConfig(tree: TreeItem[]) {
  return tree.filter(
    (t) =>
      t.type === "blob" && (/(^|\/)package\.json$/i.test(t.path) || /(^|\/)requirements.*\.txt$/i.test(t.path) || /(^|\/)pyproject\.toml$/i.test(t.path))
  ).slice(0, 4);
}

function pickPrioritySrc(tree: TreeItem[]) {
  return tree.filter(
    (t) =>
      t.type === "blob" &&
      /(^|\/)src\/(routes|controllers|services|db|migrations)\//i.test(t.path) &&
      /\.(ts|tsx|js|py)$/i.test(t.path)
  ).slice(0, 20);
}

function pickLargestCode(tree: TreeItem[], n = 15) {
  const code = tree.filter((t) => t.type === "blob" && /\.(ts|tsx|js|py)$/i.test(t.path));
  return code
    .sort((a, b) => (b.size || 0) - (a.size || 0))
    .slice(0, n);
}

function extractImports(lang: string, head: string) {
  const lines = head.split(/\r?\n/).slice(0, 100);
  const out: string[] = [];
  for (const ln of lines) {
    const s = ln.trim();
    if (!s) continue;
    if (["js", "ts", "tsx", "jsx"].includes(lang)) {
      if (s.startsWith("import ") || s.startsWith("const ") && s.includes("require(") || s.startsWith("require(")) out.push(s);
    } else if (lang === "py") {
      if (s.startsWith("import ") || s.startsWith("from ")) out.push(s);
    }
  }
  return out;
}

function langFromPath(p: string) {
  const e = extOf(p);
  if (["ts", "tsx"].includes(e)) return "ts";
  if (["js", "jsx"].includes(e)) return "js";
  if (e === "py") return "py";
  return e || "txt";
}

async function buildImportsIndex(owner: string, repo: string, branch: string, tree: TreeItem[]) {
  const top = pickLargestCode(tree, 15);
  const items = await Promise.all(
    top.map(async (t) => {
      try {
        const content = await fetchRawFromBranch(owner, repo, branch, t.path);
        const head = content.substring(0, 20_000);
        const lang = langFromPath(t.path);
        const imports = extractImports(lang, head);
        return { path: t.path, lang, top100: true, imports };
      } catch {
        return { path: t.path, lang: langFromPath(t.path), top100: true, imports: [] as string[] };
      }
    })
  );
  return items.filter((i) => i.imports.length > 0);
}

function tryParseJSON<T = any>(text: string): T | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractOpenAPISections(text: string) {
  const json = tryParseJSON<any>(text);
  if (json && typeof json === "object") {
    const sub: any = {};
    for (const k of ["openapi", "info", "servers", "paths", "components"]) {
      if (json[k]) sub[k] = k === "components" && json.components?.schemas ? { schemas: json.components.schemas } : json[k];
    }
    return JSON.stringify(sub, null, 2).substring(0, 30_000);
  }
  // Fallback: return first 200 lines of YAML
  return text.split(/\r?\n/).slice(0, 200).join("\n");
}

async function fetchSelectedTexts(owner: string, repo: string, branch: string, tree: TreeItem[]) {
  const { mdFiles, docsFiles } = pickDocs(tree);
  const openapi = pickOpenAPI(tree);
  const cfg = pickConfig(tree);
  const src = pickPrioritySrc(tree);

  const paths = [
    ...mdFiles.slice(0, 1).map((t) => t.path),
    ...docsFiles.map((t) => t.path),
    ...openapi.map((t) => t.path),
    ...cfg.map((t) => t.path),
    ...src.map((t) => t.path),
  ];

  const results = await Promise.all(
    paths.map(async (p) => {
      try {
        const raw = await fetchRawFromBranch(owner, repo, branch, p);
        return { path: p, content: raw };
      } catch {
        return { path: p, content: "" };
      }
    })
  );

  // Post-process some known types
  const blocks: string[] = [];
  for (const r of results) {
    const e = extOf(r.path);
    if (!r.content) continue;
    if (["json"].includes(e) && /openapi|swagger/i.test(r.path)) {
      blocks.push(`# ${r.path}\n\n${extractOpenAPISections(r.content)}`);
    } else if (r.path.endsWith("package.json")) {
      const pkg = tryParseJSON<any>(r.content) || {};
      const deps = Object.entries({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) })
        .slice(0, 40)
        .map(([k, v]) => `${k}@${v}`)
        .join(", ");
      blocks.push(`# ${r.path}\n\nDependencies: ${deps}`);
    } else if (/requirements.*\.txt$/i.test(r.path)) {
      const deps = r.content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#"))
        .slice(0, 80)
        .join(", ");
      blocks.push(`# ${r.path}\n\nRequirements: ${deps}`);
    } else if (isTextual(r.path)) {
      blocks.push(`# ${r.path}\n\n${r.content.substring(0, 8000)}`);
    }
  }

  return blocks.join("\n\n---\n\n");
}

export async function getRepoContext(repoUrl: string) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const meta = await getRepoMeta(owner, repo);
  const sha = await getBranchSha(owner, repo, meta.defaultBranch);
  const treeData = await fetchTreeRecursive(owner, repo, sha);
  const importsIndex = await buildImportsIndex(owner, repo, meta.defaultBranch, treeData.tree);

  // Combine README + docs fallbacks as before
  const [readme, selected] = await Promise.all([
    fetchReadme(owner, repo),
    fetchSelectedTexts(owner, repo, meta.defaultBranch, treeData.tree),
  ]);

  const metadataText = `Default branch: ${meta.defaultBranch}\nLanguages: ${meta.languages.join(", ")}`;
  const importsText = JSON.stringify(importsIndex, null, 2);

  const combined = [
    `METADATA\n${metadataText}`,
    `importsIndex\n${importsText}`,
    readme ? `README\n${readme.substring(0, 20000)}` : "",
    selected,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");

  return {
    metadata: { repo: `${owner}/${repo}`, defaultBranch: meta.defaultBranch, languages: meta.languages },
    importsIndex,
    contextText: combined.substring(0, 120_000),
  };
}
