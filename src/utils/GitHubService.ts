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

async function fetchRaw(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3.raw" },
  });
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
