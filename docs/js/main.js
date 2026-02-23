// Configurable GitHub-backed writeups browser with robust Markdown loading + custom ordering + auto-open

let CFG = {
  user: "",
  repo: "CTF",
  branch: "main",
  content_dir: "writeups",
  token: "",
  default_open: "" // optional: file or directory path to open on load
};

let ORDER = {}; // optional: { "writeups": ["BITSCTF 2026", ...], "writeups/LACTF": ["Web", ...] }

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function ghHeaders() {
  const h = { "Accept": "application/vnd.github+json" };
  if (CFG.token) h["Authorization"] = `Bearer ${CFG.token}`;
  return h;
}

function isMarkdown(name) {
  const n = name.toLowerCase();
  return n.endsWith(".md") || n.endsWith(".markdown");
}

function renderTextAsPre(text) {
  return `<pre>${escapeHtml(text)}</pre>`;
}

function setContentLoading(path) {
  document.getElementById("content").innerHTML =
    `<div class="loading">⏳ 載入中: ${escapeHtml(path)}</div>`;
}

function setContentError(msg) {
  document.getElementById("content").innerHTML =
    `<div class="error">❌ ${escapeHtml(msg)}</div>`;
}

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(encodeURI(url));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.text();
}

function encodePathSegments(path) {
  if (!path) return "";
  return path.split("/").map(encodeURIComponent).join("/");
}

function getRawUrl(user, repo, branch, path) {
  const encodedPath = encodePathSegments(path);
  return `https://raw.githubusercontent.com/${encodeURIComponent(user)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
}

function baseDirOf(path) {
  const idx = path.lastIndexOf("/");
  return idx === -1 ? "" : path.slice(0, idx);
}

function joinPaths(a, b) {
  if (!a) return b;
  if (!b) return a;
  return a.replace(/\/+$/, "") + "/" + b.replace(/^\/+/, "");
}

function isAbsoluteUrl(u) {
  return /^(?:[a-z]+:)?\/\//i.test(u) || u.startsWith("data:") || u.startsWith("blob:");
}

function fixRelativeUrls(container, currentPath) {
  const dir = baseDirOf(currentPath);
  const imgs = container.querySelectorAll("img[src]");
  imgs.forEach(img => {
    const src = img.getAttribute("src");
    if (!src || isAbsoluteUrl(src)) return;
    const raw = getRawUrl(CFG.user, CFG.repo, CFG.branch, joinPaths(dir, src));
    img.setAttribute("src", raw);
  });
  const anchors = container.querySelectorAll("a[href]");
  anchors.forEach(a => {
    const href = a.getAttribute("href");
    if (!href || isAbsoluteUrl(href)) return;
    const raw = getRawUrl(CFG.user, CFG.repo, CFG.branch, joinPaths(dir, href));
    a.setAttribute("href", raw);
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });
}

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = url;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + url));
    document.head.appendChild(s);
  });
}

async function ensureMarkdown() {
  if (typeof window.marked !== "undefined") return;
  const cdns = [
    "vendor/marked.min.js",
    "https://cdn.jsdelivr.net/npm/marked/marked.min.js",
    "https://unpkg.com/marked/marked.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/marked/14.1.2/marked.min.js"
  ];
  let lastErr;
  for (const url of cdns) {
    try { await loadScript(url); if (typeof window.marked !== "undefined") return; } catch (e) { lastErr = e; }
  }
  if (typeof window.marked === "undefined") {
    console.warn("Marked not available; will render as plain text.", lastErr);
  }
}

function renderMarkdown(text) {
  try {
    if (typeof window.marked === "function") {
      return window.marked(text);
    }
    if (window.marked && typeof window.marked.parse === "function") {
      return window.marked.parse(text);
    }
  } catch (e) {
    console.warn("Marked parse failed, falling back to <pre>.", e);
  }
  return null; // signal caller to use <pre>
}

function normalizePathKey(p) {
  return String(p || "").replace(/^\/+|\/+$/g, "").replace(/\/+/, "/");
}

function getOrderListFor(path) {
  const key = normalizePathKey(path);
  return ORDER[key] || ORDER['/' + key] || ORDER[key + '/'] || [];
}

function cmpName(a, b) { return a.localeCompare(b); }

function sortItemsWithOrder(path, items) {
  const wanted = getOrderListFor(path);
  const indexOf = (name) => {
    const i = wanted.indexOf(name);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  return items.slice().sort((a, b) => {
    const ar = a.type === "dir" ? 0 : 1;
    const br = b.type === "dir" ? 0 : 1;
    if (ar !== br) return ar - br; // keep folders first overall
    const ia = indexOf(a.name), ib = indexOf(b.name);
    if (ia !== ib) return ia - ib; // apply custom order within same type
    return cmpName(a.name, b.name);
  });
}

async function openFileByPath(path) {
  try {
    setContentLoading(path);
    const rawUrl = getRawUrl(CFG.user, CFG.repo, CFG.branch, path);
    const text = await fetchText(rawUrl);
    const contentEl = document.getElementById("content");
    const name = path.split("/").pop();
    if (isMarkdown(name)) {
      await ensureMarkdown();
      const html = renderMarkdown(text);
      if (html !== null) {
        contentEl.innerHTML = `<div class="markdown-content">${html}</div>`;
        fixRelativeUrls(contentEl, path);
      } else {
        contentEl.innerHTML = renderTextAsPre(text);
      }
    } else {
      contentEl.innerHTML = renderTextAsPre(text);
    }
  } catch (e) {
    setContentError(`無法載入: ${String(e.message)}`);
  }
}

function navigateToPath(path) {
  const hash = "#" + encodePathSegments(path);
  if (window.location.hash !== hash) {
    window.location.hash = hash; // will trigger hashchange and call open
  } else {
    openFileByPath(path);
  }
}

function getInitialPathFromUrl() {
  const h = window.location.hash || "";
  if (h.startsWith("#")) {
    try { return decodeURIComponent(h.slice(1)); } catch {}
  }
  const m = window.location.search.match(/[?&]path=([^&#]+)/);
  if (m) { try { return decodeURIComponent(m[1]); } catch {} }
  return "";
}

async function findFirstFilePath(rootPath, depth = 0) {
  if (depth > 6) return ""; // safety
  const pathPart = rootPath ? "/" + encodePathSegments(rootPath) : "";
  const url = `https://api.github.com/repos/${encodeURIComponent(CFG.user)}/${encodeURIComponent(CFG.repo)}/contents${pathPart}?ref=${encodeURIComponent(CFG.branch)}`;
  const data = await fetchJson(url, ghHeaders());
  if (!Array.isArray(data)) return "";

  const items = sortItemsWithOrder(rootPath, data);

  const readme = items.find(i => i.type !== "dir" && /^readme(\.|$)/i.test(i.name) && isMarkdown(i.name));
  if (readme) return readme.path;

  const firstMd = items.find(i => i.type !== "dir" && isMarkdown(i.name));
  if (firstMd) return firstMd.path;

  for (const it of items) {
    if (it.type === "dir") {
      const found = await findFirstFilePath(it.path, depth + 1);
      if (found) return found;
    }
  }
  return "";
}

async function loadDir(path = "", container) {
  const pathPart = path ? "/" + encodePathSegments(path) : "";
  const url = `https://api.github.com/repos/${encodeURIComponent(CFG.user)}/${encodeURIComponent(CFG.repo)}/contents${pathPart}?ref=${encodeURIComponent(CFG.branch)}`;

  const data = await fetchJson(url, ghHeaders());
  if (!Array.isArray(data)) return;

  const items = sortItemsWithOrder(path, data);

  items.forEach((item) => {
    const div = document.createElement("div");

    if (item.type === "dir") {
      div.className = "folder";
      div.innerHTML = `<span>📁 ${item.name}</span>`;

      const sub = document.createElement("div");
      sub.className = "folder-content";
      sub.style.display = "none";
      let loaded = false;

      div.onclick = async (e) => {
        e.stopPropagation();
        if (!loaded && !sub.innerHTML.trim()) {
          try {
            sub.style.display = "block";
            sub.innerHTML = `<div class="loading-sub">...</div>`;
            await loadDir(item.path, sub);
            loaded = true;
          } catch (e) {
            sub.innerHTML = `<div class="error-sub">${escapeHtml(String(e.message))}</div>`;
          }
        } else {
          sub.style.display = sub.style.display === "none" ? "block" : "none";
        }
      };

      container.appendChild(div);
      container.appendChild(sub);
    } else {
      div.className = "file";
      div.innerHTML = `<span>📄 ${item.name}</span>`;

      div.onclick = (e) => {
        e.stopPropagation();
        navigateToPath(item.path);
      };

      container.appendChild(div);
    }
  });
}

function inferUserFromHost() {
  const host = window.location.hostname || "";
  if (host.endsWith("github.io")) {
    const parts = host.split(".");
    if (parts.length >= 3) return parts[0];
  }
  return "";
}

async function loadConfig() {
  try {
    const res = await fetch("data/config.json?cb=" + Date.now());
    if (res.ok) {
      const json = await res.json();
      CFG = { ...CFG, ...json };
    }
  } catch {}

  if (!CFG.user) {
    const inferred = inferUserFromHost();
    if (inferred) CFG.user = inferred;
  }
}

async function loadOrder() {
  try {
    const res = await fetch("data/order.json?cb=" + Date.now());
    if (res.ok) {
      const json = await res.json();
      if (json && typeof json === 'object') {
        if (json.order && typeof json.order === 'object') ORDER = json.order; else ORDER = json;
      }
    }
  } catch {}
}

async function start() {
  const sidebar = document.getElementById("sidebar");
  const content = document.getElementById("content");
  if (!sidebar || !content) return;

  sidebar.innerHTML = "";
  content.innerHTML = `<div class="welcome">👈 選擇檔案查看</div>`;

  await loadConfig();
  await loadOrder();

  if (!CFG.user) {
    sidebar.innerHTML = `<div class="error">找不到 GitHub 使用者。請在 <code>docs/data/config.json</code> 中設定 <code>user</code>，例如: { "user": "your-username" }。</div>`;
    return;
  }

  try {
    await loadDir(CFG.content_dir || "writeups", sidebar);
  } catch (e) {
    sidebar.innerHTML = `<div class="error">${escapeHtml(String(e.message))}</div>`;
  }

  // Initial auto-open: URL hash > config.default_open > first Markdown under content_dir
  let initial = getInitialPathFromUrl();
  if (!initial && CFG.default_open) {
    try {
      const pathPart = "/" + encodePathSegments(CFG.default_open);
      const url = `https://api.github.com/repos/${encodeURIComponent(CFG.user)}/${encodeURIComponent(CFG.repo)}/contents${pathPart}?ref=${encodeURIComponent(CFG.branch)}`;
      const res = await fetch(url, { headers: ghHeaders() });
      if (res.ok) {
        const js = await res.json();
        if (Array.isArray(js)) {
          initial = await findFirstFilePath(CFG.default_open);
        } else {
          initial = CFG.default_open;
        }
      } else {
        initial = CFG.default_open;
      }
    } catch {
      initial = CFG.default_open;
    }
  }
  if (!initial) {
    initial = await findFirstFilePath(CFG.content_dir || "writeups");
  }
  if (initial) navigateToPath(initial);

  window.addEventListener('hashchange', () => {
    const p = getInitialPathFromUrl();
    if (p) openFileByPath(p);
  });
}

start();
