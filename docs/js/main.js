// main.js
// - Load GitHub repo directory tree (folders + files)
// - Click folder: expand/collapse
// - Click file: fetch raw content and render
//   - Markdown: render to HTML via marked (if present)
//   - Other text files: render as <pre>
// Notes:
// 1) You must include marked.js in your HTML if you want Markdown rendering:
//    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
// 2) Your HTML must have:
//    <div id="sidebar"></div>
//    <div id="content"></div>

const user = "1abhax";
const repo = "CTF";
const branch = "main";

// Default content directory if config.json is missing/unavailable
const fallbackDir = "writeups";

// Optional: GitHub API token to avoid rate limits (recommended if you browse a lot)
// Create a fine-grained token and only allow "Contents: Read" for the repo.
// Then set it here, or better: load from config.json and keep it private (not in public repo).
const GITHUB_TOKEN = ""; // e.g. "ghp_..." (leave empty for public/no-auth)

function ghHeaders() {
  const h = { "Accept": "application/vnd.github+json" };
  if (GITHUB_TOKEN) h["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isMarkdown(name) {
  const lower = name.toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}

function renderTextAsPre(text) {
  return `<pre style="
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    padding: 16px;
    line-height: 1.45;
  ">${escapeHtml(text)}</pre>`;
}

function setContentLoading(path) {
  const el = document.getElementById("content");
  el.innerHTML = `<div style="padding:16px">Loading: ${escapeHtml(path)} ...</div>`;
}

function setContentError(msg) {
  const el = document.getElementById("content");
  el.innerHTML = `<div style="padding:16px;color:#ff6b6b">${escapeHtml(msg)}</div>`;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: ghHeaders() });

  // Helpful errors (rate limit / not found / etc.)
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }

  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return res.text();
}

async function loadDir(path = "", container) {
  const url = `https://api.github.com/repos/${user}/${repo}/contents/${encodeURIComponent(
    path
  )}?ref=${encodeURIComponent(branch)}`;

  const data = await fetchJson(url);

  // GitHub returns object (not array) if path is a file; we only call this for dirs
  if (!Array.isArray(data)) return;

  // Sort: folders first, then files; alphabetical
  data.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  data.forEach((item) => {
    const div = document.createElement("div");

    if (item.type === "dir") {
      div.innerText = "📁 " + item.name;
      div.className = "folder";

      const sub = document.createElement("div");
      sub.style.display = "none";

      let loaded = false;

      div.onclick = async () => {
        // toggle
        if (!loaded && sub.innerHTML.trim() === "") {
          // lazy-load only once
          try {
            // small loading indicator inside folder
            sub.style.display = "block";
            sub.innerHTML = `<div style="padding:6px 12px;opacity:.7">Loading...</div>`;
            await loadDir(item.path, sub);
            loaded = true;
          } catch (e) {
            sub.innerHTML = `<div style="padding:6px 12px;color:#ff6b6b">Failed: ${escapeHtml(
              String(e.message || e)
            )}</div>`;
          }
        } else {
          sub.style.display = sub.style.display === "none" ? "block" : "none";
        }
      };

      container.appendChild(div);
      container.appendChild(sub);
    } else {
      div.innerText = "📄 " + item.name;
      div.className = "file";

      div.onclick = async () => {
        try {
          setContentLoading(item.path);

          // Use download_url to fetch raw content (iframe/html_url will be blocked)
          if (!item.download_url) {
            setContentError("No download_url available for this file.");
            return;
          }

          const text = await fetchText(item.download_url);

          // Render
          const contentEl = document.getElementById("content");
          if (isMarkdown(item.name) && typeof window.marked !== "undefined") {
            contentEl.innerHTML = `
              <div style="padding:16px">
                ${window.marked.parse(text)}
              </div>
            `;
          } else if (isMarkdown(item.name) && typeof window.marked === "undefined") {
            // Markdown but marked.js not loaded
            contentEl.innerHTML = renderTextAsPre(text);
          } else {
            // Other text files
            contentEl.innerHTML = renderTextAsPre(text);
          }
        } catch (e) {
          setContentError(`Failed to load file: ${String(e.message || e)}`);
        }
      };

      container.appendChild(div);
    }
  });
}

async function loadConfig() {
  // Optional config file:
  // {
  //   "content_dir": "writeups"
  // }
  // If missing, fallbackDir will be used.
  try {
    const res = await fetch("data/config.json");
    if (!res.ok) throw new Error("config.json not found");
    return await res.json();
  } catch {
    return { content_dir: fallbackDir };
  }
}

async function start() {
  const sidebar = document.getElementById("sidebar");
  const content = document.getElementById("content");

  if (!sidebar || !content) {
    console.error("Missing #sidebar or #content elements in HTML.");
    return;
  }

  sidebar.innerHTML = "";
  content.innerHTML = `<div style="padding:16px;opacity:.8">Select a file to view.</div>`;

  try {
    const config = await loadConfig();
    const dir = config.content_dir || fallbackDir;

    // Root load
    await loadDir(dir, sidebar);
  } catch (e) {
    sidebar.innerHTML = `<div style="padding:12px;color:#ff6b6b">Failed to load sidebar: ${escapeHtml(
      String(e.message || e)
    )}</div>`;
  }
}

start();
