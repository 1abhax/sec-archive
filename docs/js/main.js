// ==========================================
// CTF Writeups Site (Level 2)
// Home: event cards (no sidebar)
// Event: sidebar tree for current event + content + optional TOC
// Files: md/text/pdf/embed-if-possible/zip-download
// ==========================================

let CFG = {};
let ORDER = {};

const CACHE_DIR = new Map(); // path -> GitHub contents list
const CACHE_ITEM = new Map(); // path -> GitHub content item (file metadata)
const state = {
  view: "home",            // "home" | "event"
  eventName: null,         // e.g. "LACTF"
  currentPath: null,       // current folder path
  currentFilePath: null,   // opened file path
  tocEnabled: true,
  search: "",
};

window.addEventListener("load", init);

async function init() {
  bindUI();
  restorePrefs();

  await loadConfig();
  await loadOrder();

  // repo link
  document.getElementById("repoLink").href = `https://github.com/${CFG.user}/${CFG.repo}`;

  // background
  applyBackground();

  // load home
  await renderHome();

  // route
  await handleRouteFromHash();
  window.addEventListener("hashchange", handleRouteFromHash);
}

function bindUI() {
  document.getElementById("homeBtn").addEventListener("click", () => goHome());

  document.getElementById("toggleTheme").addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    document.body.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  });

  document.getElementById("toggleToc").addEventListener("click", () => {
    state.tocEnabled = !state.tocEnabled;
    localStorage.setItem("toc_enabled", state.tocEnabled ? "1" : "0");
    updateTocVisibility();
  });

  const searchBox = document.getElementById("searchBox");
  const clearSearch = document.getElementById("clearSearch");
  searchBox.addEventListener("input", () => {
    state.search = (searchBox.value || "").trim().toLowerCase();
    filterTree(state.search);
  });
  clearSearch.addEventListener("click", () => {
    searchBox.value = "";
    state.search = "";
    filterTree("");
    searchBox.focus();
  });
}

function restorePrefs() {
  const theme = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark", theme === "dark");

  state.tocEnabled = (localStorage.getItem("toc_enabled") ?? "1") === "1";
  updateTocVisibility();
}

function updateTocVisibility() {
  const toc = document.getElementById("toc");
  // hide only when in event view; home doesn't show toc anyway
  toc.classList.toggle("hidden", !state.tocEnabled || state.view !== "event");
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(el._t);
  el._t = window.setTimeout(() => el.classList.remove("show"), 1200);
}

async function loadConfig() {
  const res = await fetch("data/config.json");
  if (!res.ok) throw new Error(`Failed to load config.json: ${res.status}`);
  CFG = await res.json();
}

async function loadOrder() {
  try {
    const res = await fetch("data/order.json");
    ORDER = await res.json();
  } catch {
    ORDER = {};
  }
}

function applyBackground() {
  const bg = document.getElementById("bg");
  const list = Array.isArray(CFG.backgrounds) ? CFG.backgrounds : [];
  if (!list.length) return; // keep default gradient

  const pick = list[Math.floor(Math.random() * list.length)];
  bg.style.backgroundImage = `url("${pick}")`;
  bg.style.backgroundSize = "cover";
  bg.style.backgroundPosition = "center";
}

function setView(view) {
  state.view = view;
  document.getElementById("homeView").classList.toggle("hidden", view !== "home");
  document.getElementById("eventView").classList.toggle("hidden", view !== "event");
  updateTocVisibility();
}

function setCrumbs(parts) {
  const el = document.getElementById("crumbs");
  el.innerHTML = "";
  if (!parts || !parts.length) return;

  parts.forEach((p, idx) => {
    if (idx > 0) {
      const sep = document.createElement("span");
      sep.className = "sep";
      sep.textContent = "/";
      el.appendChild(sep);
    }
    if (p.href) {
      const a = document.createElement("a");
      a.href = p.href;
      a.textContent = p.text;
      el.appendChild(a);
    } else {
      const s = document.createElement("span");
      s.textContent = p.text;
      el.appendChild(s);
    }
  });
}

function goHome() {
  location.hash = "#/";
}

function goEvent(eventName) {
  location.hash = `#/event/${encodeURIComponent(eventName)}`;
}

function goPath(eventName, relPath) {
  // relPath is under content_dir
  location.hash = `#/event/${encodeURIComponent(eventName)}/path/${encodeURIComponent(relPath)}`;
}

function goFile(eventName, filePath) {
  location.hash = `#/event/${encodeURIComponent(eventName)}/file/${encodeURIComponent(filePath)}`;
}

async function handleRouteFromHash() {
  const h = location.hash || "#/";
  const parts = h.replace(/^#\/?/, "").split("/").filter(Boolean);

  if (parts.length === 0) {
    setView("home");
    setCrumbs([]);
    return;
  }

  if (parts[0] !== "event") {
    setView("home");
    setCrumbs([]);
    return;
  }

  const eventName = decodeURIComponent(parts[1] || "");
  if (!eventName) {
    setView("home");
    setCrumbs([]);
    return;
  }

  state.eventName = eventName;
  setView("event");
  updateTocVisibility();

  // Always load sidebar root for this event
  // event root path = `${content_dir}/${eventName}`
  const eventRoot = `${CFG.content_dir}/${eventName}`;

  document.getElementById("sidebarTitle").textContent = eventName;
  await renderEventSidebar(eventRoot);

  // default crumbs for event
  setCrumbs([
    { text: "Home", href: "#/" },
    { text: eventName, href: `#/event/${encodeURIComponent(eventName)}` }
  ]);

  // route to file/path if present
  if (parts[2] === "file") {
    const filePath = decodeURIComponent(parts.slice(3).join("/") || "");
    if (filePath) {
      await openFile(filePath);
      markActiveNode(filePath);
      return;
    }
  }

  if (parts[2] === "path") {
    const relPath = decodeURIComponent(parts.slice(3).join("/") || "");
    const fullPath = relPath ? `${CFG.content_dir}/${relPath}` : eventRoot;
    await openFolderInContent(fullPath);
    markActiveNode(fullPath);
    return;
  }

  // If just event, show a landing in content
  showEventLanding(eventName);
}

async function renderHome() {
  setView("home");
  setCrumbs([]);

  const meta = document.getElementById("homeMeta");
  meta.textContent = `Repo: ${CFG.user}/${CFG.repo} · branch: ${CFG.branch} · root: ${CFG.content_dir}`;

  const grid = document.getElementById("eventGrid");
  grid.innerHTML = "";

  const items = await fetchDir(CFG.content_dir);
  const dirs = sortItems(CFG.content_dir, items).filter(x => x.type === "dir");

  dirs.forEach(dir => {
    const tile = document.createElement("div");
    tile.className = "card tile";
    tile.innerHTML = `
      <div class="tile-pill">event</div>
      <div class="tile-title">${escapeHtml(dir.name)}</div>
      <div class="tile-sub">點擊進入分類與題目</div>
    `;
    tile.addEventListener("click", () => goEvent(dir.name));
    grid.appendChild(tile);
  });
}

function showEventLanding(eventName) {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="welcome">
      <div class="welcome-title">${escapeHtml(eventName)}</div>
      <div class="welcome-subtitle">請從左側選擇分類或檔案。支援文字檔、Markdown、PDF（可嵌入則嵌入）、ZIP（下載）。</div>
    </div>
  `;
  document.getElementById("tocBody").innerHTML = "";
  document.getElementById("tocMeta").textContent = "";
}

function githubContentsUrl(path) {
  return `https://api.github.com/repos/${CFG.user}/${CFG.repo}/contents/${path}?ref=${CFG.branch}`;
}

function rawUrl(path) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `https://raw.githubusercontent.com/${CFG.user}/${CFG.repo}/${CFG.branch}/${encoded}`;
}

async function fetchDir(path) {
  if (CACHE_DIR.has(path)) return CACHE_DIR.get(path);

  const res = await fetch(githubContentsUrl(path), { cache: "force-cache" });
  if (!res.ok) throw new Error(`Unable to read dir "${path}": HTTP ${res.status}`);

  const items = await res.json();
  CACHE_DIR.set(path, items);
  return items;
}

function sortItems(path, items) {
  const list = ORDER.order?.[path] || [];
  const map = new Map();
  list.forEach((name, i) => map.set(name, i));

  return items.slice().sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1;

    const ia = map.has(a.name) ? map.get(a.name) : 9999;
    const ib = map.has(b.name) ? map.get(b.name) : 9999;
    if (ia !== ib) return ia - ib;

    return a.name.localeCompare(b.name);
  });
}

function iconFor(name, type) {
  if (type === "dir") return "📁";
  const lower = name.toLowerCase();
  if (lower.endsWith(".md")) return "📝";
  if (lower.endsWith(".py")) return "🐍";
  if (lower.endsWith(".txt")) return "📄";
  if (lower.endsWith(".json")) return "🧩";
  if (lower.endsWith(".pdf")) return "📑";
  if (lower.endsWith(".zip")) return "📦";
  if (!lower.includes(".")) return "📄";
  return "📄";
}

function badgeFor(name, type) {
  if (type === "dir") return "dir";
  const lower = name.toLowerCase();
  if (!lower.includes(".")) return "text";
  return lower.split(".").pop();
}

function fileKindByName(name) {
  const lower = name.toLowerCase();
  const hasExt = lower.includes(".");
  const ext = hasExt ? lower.split(".").pop() : "";
  if (!hasExt) return { kind: "text", ext: "" };

  if (ext === "md") return { kind: "markdown", ext };
  if (["py","js","ts","c","cpp","h","hpp","java","go","rs","sh","bash","zsh","txt","log","ini","conf","yaml","yml","toml","sql"].includes(ext)) {
    return { kind: "text", ext };
  }
  if (ext === "json") return { kind: "json", ext };
  if (ext === "pdf") return { kind: "pdf", ext };
  if (ext === "zip") return { kind: "zip", ext };
  return { kind: "other", ext };
}

async function renderEventSidebar(eventRootPath) {
  // sidebar tree displays under this root
  const tree = document.getElementById("tree");
  tree.innerHTML = "";

  // reset search
  const searchBox = document.getElementById("searchBox");
  searchBox.value = "";
  state.search = "";

  // root node is the event root itself
  const rootNode = createNode({
    type: "dir",
    name: state.eventName,
    path: eventRootPath,
  }, { isRoot: true });

  tree.appendChild(rootNode.node);
  tree.appendChild(rootNode.children);

  // auto open root
  rootNode.children.style.display = "block";
  if (!rootNode.children.hasChildNodes()) {
    await expandDirInto(eventRootPath, rootNode.children);
  }
}

function createNode(item, opts = {}) {
  const node = document.createElement("div");
  node.className = "node";
  node.dataset.path = item.path;
  node.dataset.type = item.type;
  node.dataset.name = item.name.toLowerCase();

  const left = document.createElement("div");
  left.className = "name";
  left.textContent = `${iconFor(item.name, item.type)} ${item.name}`;

  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent = badgeFor(item.name, item.type);

  // Tooltip (hover message)
  // GitHub contents API gives size for files; dirs no size.
  const tip = item.type === "dir"
    ? `Folder\n${item.path}\nClick to expand`
    : `File\n${item.path}\nSize: ${formatBytes(item.size || 0)}\nClick to open`;
  node.title = tip;

  node.appendChild(left);
  node.appendChild(badge);

  const children = document.createElement("div");
  children.className = "children";
  children.dataset.path = item.path;

  if (item.type === "dir") {
    node.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      const open = children.style.display === "block";
      children.style.display = open ? "none" : "block";

      if (!open && !children.hasChildNodes()) {
        await expandDirInto(item.path, children);
      }

      markActiveNode(item.path);
    });
  } else {
    node.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      await openFile(item.path);
      markActiveNode(item.path);
      goFile(state.eventName, item.path);
    });
  }

  if (opts.isRoot) {
    node.classList.add("active");
  }

  return { node, children };
}

async function expandDirInto(path, container) {
  let items;
  try {
    items = await fetchDir(path);
  } catch (e) {
    container.innerHTML = `<div class="welcome-subtitle">❌ ${escapeHtml(String(e.message || e))}</div>`;
    return;
  }

  const sorted = sortItems(path, items);

  sorted.forEach(item => {
    const n = createNode(item);
    container.appendChild(n.node);
    container.appendChild(n.children);
  });

  filterTree(state.search);
}

function filterTree(q) {
  q = (q || "").trim().toLowerCase();
  const tree = document.getElementById("tree");
  if (!tree) return;

  const nodes = tree.querySelectorAll(".node");
  const children = tree.querySelectorAll(".children");

  if (!q) {
    nodes.forEach(n => n.style.display = "flex");
    // children keep current open/close status
    return;
  }

  // Hide all first
  nodes.forEach(n => n.style.display = "none");
  children.forEach(c => c.style.display = "none");

  // Show matches and their ancestors
  nodes.forEach(n => {
    const name = n.dataset.name || "";
    const path = (n.dataset.path || "").toLowerCase();
    if (name.includes(q) || path.includes(q)) {
      n.style.display = "flex";
      // reveal ancestors
      let p = n.parentElement;
      while (p && p.id !== "tree") {
        if (p.classList.contains("children")) {
          p.style.display = "block";
          // also show the parent node of this children block
          const parentNode = p.previousElementSibling;
          if (parentNode && parentNode.classList.contains("node")) parentNode.style.display = "flex";
        }
        p = p.parentElement;
      }
    }
  });
}

function markActiveNode(path) {
  document.querySelectorAll(".node").forEach(n => n.classList.remove("active"));
  const t = document.querySelector(`.node[data-path="${cssEscape(path)}"]`);
  if (t) t.classList.add("active");
}

async function openFolderInContent(path) {
  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="welcome">
      <div class="welcome-title">Folder</div>
      <div class="welcome-subtitle">${escapeHtml(path)}</div>
    </div>
  `;
  document.getElementById("tocBody").innerHTML = "";
  document.getElementById("tocMeta").textContent = "";
}

async function openFile(path) {
  state.currentFilePath = path;

  // crumbs
  const eventRoot = `${CFG.content_dir}/${state.eventName}`;
  const rel = path.startsWith(eventRoot + "/") ? path.slice(eventRoot.length + 1) : path;
  const segs = rel.split("/");

  setCrumbs([
    { text: "Home", href: "#/" },
    { text: state.eventName, href: `#/event/${encodeURIComponent(state.eventName)}` },
    ...segs.slice(0, -1).map((s, i) => {
      const sub = `${CFG.content_dir}/${state.eventName}/${segs.slice(0, i + 1).join("/")}`;
      // "path" route expects relPath under content_dir
      const relPath = sub.replace(`${CFG.content_dir}/`, "");
      return { text: s, href: `#/event/${encodeURIComponent(state.eventName)}/path/${encodeURIComponent(relPath)}` };
    }),
    { text: segs[segs.length - 1] }
  ]);

  const content = document.getElementById("content");
  content.innerHTML = `
    <div class="welcome">
      <div class="welcome-title">Loading…</div>
      <div class="welcome-subtitle">${escapeHtml(path)}</div>
    </div>
  `;

  // Fetch file item metadata from parent dir listing (for size/type)
  const item = await getItemFromParent(path);

  const name = item?.name || path.split("/").pop();
  const kind = fileKindByName(name);

  // Render file head
  const head = renderFileHead({
    name,
    path,
    type: kind.kind,
    ext: kind.ext,
    size: item?.size ?? 0,
    downloadUrl: item?.download_url || rawUrl(path),
  });

  if (kind.kind === "markdown") {
    await renderMarkdownFile(path, head);
    return;
  }

  if (kind.kind === "json") {
    await renderJsonFile(path, head);
    return;
  }

  if (kind.kind === "text") {
    await renderTextFile(path, head, kind.ext);
    return;
  }

  if (kind.kind === "pdf") {
    await renderPdfFile(path, head);
    return;
  }

  if (kind.kind === "zip") {
    renderDownloadOnly(head, {
      message: "此檔案類型無法在網頁中顯示，請下載。",
    });
    return;
  }

  // other
  renderDownloadOnly(head, {
    message: "此檔案類型無法預覽，請使用下載或 raw 連結。",
    raw: rawUrl(path),
  });
}

async function getItemFromParent(path) {
  if (CACHE_ITEM.has(path)) return CACHE_ITEM.get(path);

  const parts = path.split("/");
  const name = parts.pop();
  const parent = parts.join("/");
  try {
    const items = await fetchDir(parent);
    const found = items.find(x => x.name === name);
    if (found) CACHE_ITEM.set(path, found);
    return found || null;
  } catch {
    return null;
  }
}

function renderFileHead({ name, path, type, ext, size, downloadUrl }) {
  const wrap = document.createElement("div");
  wrap.className = "file-head";

  const left = document.createElement("div");
  left.innerHTML = `
    <div class="title">file ${escapeHtml(name)}</div>
    <div class="meta">
Type: ${escapeHtml(type)}${ext ? " (" + escapeHtml(ext) + ")" : ""}
Size: ${formatBytes(size)}
Path: ${escapeHtml(path)}
    </div>
  `;

  const actions = document.createElement("div");
  actions.className = "file-actions";

  const dl = document.createElement("a");
  dl.className = "btn";
  dl.href = downloadUrl;
  dl.target = "_blank";
  dl.rel = "noreferrer";
  dl.textContent = "Download";

  actions.appendChild(dl);
  wrap.appendChild(left);
  wrap.appendChild(actions);

  return wrap;
}

async function renderMarkdownFile(path, headEl) {
  const tocMeta = document.getElementById("tocMeta");
  tocMeta.textContent = path;

  let md;
  try {
    const res = await fetch(rawUrl(path), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    md = await res.text();
  } catch (e) {
    renderError(headEl, `無法載入 Markdown：${String(e.message || e)}`);
    return;
  }

  marked.setOptions({ gfm: true, breaks: false });
  const html = marked.parse(md);

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const body = document.createElement("div");
  body.className = "markdown-content";
  body.innerHTML = html;
  content.appendChild(body);

  buildTOC();
  addCopyButtonsToCodeBlocks(content);
  toast("Loaded");
}

async function renderTextFile(path, headEl, ext) {
  document.getElementById("tocBody").innerHTML = "";
  document.getElementById("tocMeta").textContent = "";

  let text;
  try {
    const res = await fetch(rawUrl(path), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    renderError(headEl, `無法載入文字檔：${String(e.message || e)}`);
    return;
  }

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = "text-view";
  // 文字檔：保留原樣
  code.textContent = text;
  pre.appendChild(code);
  content.appendChild(pre);

  // copy button for this pre
  addCopyButtonsToCodeBlocks(content);

  toast("Loaded");
}

async function renderJsonFile(path, headEl) {
  document.getElementById("tocBody").innerHTML = "";
  document.getElementById("tocMeta").textContent = "";

  let text;
  try {
    const res = await fetch(rawUrl(path), { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } catch (e) {
    renderError(headEl, `無法載入 JSON：${String(e.message || e)}`);
    return;
  }

  let pretty = text;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // keep raw
  }

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.className = "text-view";
  code.textContent = pretty;
  pre.appendChild(code);
  content.appendChild(pre);

  addCopyButtonsToCodeBlocks(content);
  toast("Loaded");
}

async function renderPdfFile(path, headEl) {
  document.getElementById("tocBody").innerHTML = "";
  document.getElementById("tocMeta").textContent = "";

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  // Try embed
  const frame = document.createElement("iframe");
  frame.style.width = "100%";
  frame.style.height = "70vh";
  frame.style.border = "1px solid var(--border)";
  frame.style.borderRadius = "16px";
  frame.style.background = "rgba(255,255,255,0.55)";
  frame.src = rawUrl(path);

  // If iframe fails (blocked), show fallback message and keep Download button in header.
  const fallback = document.createElement("div");
  fallback.className = "welcome-subtitle";
  fallback.style.marginTop = "12px";
  fallback.textContent = "若 PDF 無法嵌入顯示，請使用 Download 下載開啟。";

  content.appendChild(frame);
  content.appendChild(fallback);

  toast("Loaded");
}

function renderDownloadOnly(headEl, { message, raw }) {
  document.getElementById("tocBody").innerHTML = "";
  document.getElementById("tocMeta").textContent = "";

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const box = document.createElement("div");
  box.className = "welcome";
  box.innerHTML = `
    <div class="welcome-title">Download only</div>
    <div class="welcome-subtitle">${escapeHtml(message || "")}</div>
  `;
  if (raw) {
    const p = document.createElement("div");
    p.className = "welcome-subtitle";
    p.style.marginTop = "10px";
    p.innerHTML = `Raw: <a href="${raw}" target="_blank" rel="noreferrer">${escapeHtml(raw)}</a>`;
    box.appendChild(p);
  }
  content.appendChild(box);
  toast("Ready");
}

function renderError(headEl, msg) {
  document.getElementById("tocBody").innerHTML = "";
  document.getElementById("tocMeta").textContent = "";

  const content = document.getElementById("content");
  content.innerHTML = "";
  content.appendChild(headEl);

  const box = document.createElement("div");
  box.className = "welcome";
  box.innerHTML = `
    <div class="welcome-title">Error</div>
    <div class="welcome-subtitle">${escapeHtml(msg)}</div>
  `;
  content.appendChild(box);
  toast("Error");
}

function buildTOC() {
  if (!state.tocEnabled) {
    document.getElementById("tocBody").innerHTML = "";
    return;
  }

  const tocBody = document.getElementById("tocBody");
  tocBody.innerHTML = "";

  const headings = document.querySelectorAll("#content .markdown-content h2, #content .markdown-content h3");
  if (!headings.length) {
    tocBody.innerHTML = `<div class="welcome-subtitle">No headings</div>`;
    return;
  }

  const links = [];
  headings.forEach(h => {
    const id = makeHeadingId(h.innerText);
    h.id = id;

    const a = document.createElement("a");
    a.href = "#";
    a.textContent = h.innerText;
    if (h.tagName.toLowerCase() === "h3") a.style.paddingLeft = "18px";

    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      setActive(id);
    });

    tocBody.appendChild(a);
    links.push({ id, a });
  });

  // Intersection observer for active heading
  const obs = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a,b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActive(visible[0].target.id);
  }, { rootMargin: "-20% 0px -70% 0px", threshold: [0, 1] });

  headings.forEach(h => obs.observe(h));
  setActive(headings[0].id);

  function setActive(id) {
    links.forEach(x => x.a.classList.toggle("active", x.id === id));
  }
}

function addCopyButtonsToCodeBlocks(rootEl) {
  const pres = rootEl.querySelectorAll("pre");
  pres.forEach(pre => {
    // avoid duplicate
    if (pre.querySelector(".copy-btn")) return;

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.textContent = "Copy";

    btn.addEventListener("click", async () => {
      const code = pre.querySelector("code");
      const text = code ? code.textContent : pre.textContent;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied";
        toast("Copied");
        setTimeout(() => btn.textContent = "Copy", 900);
      } catch {
        toast("Copy failed");
      }
    });

    pre.appendChild(btn);
  });
}

function makeHeadingId(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .slice(0, 80) || "section";
}

function formatBytes(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return "0 B";
  const units = ["B","KB","MB","GB"];
  let i = 0;
  let v = num;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#39;");
}

function cssEscape(s) {
  if (window.CSS && CSS.escape) return CSS.escape(s);
  return String(s).replaceAll('"','\\"');
}