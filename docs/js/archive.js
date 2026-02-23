import { loadCTFEvent } from "./CTF.js";

const DEFAULT_SIDEBAR_PX = 280;
const DEFAULT_TOC_PX     = 300;

function qs(id)  { return document.getElementById(id); }

function setCSSVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function saveLayoutWidths(sidebarPx, tocPx) {
  localStorage.setItem("sec_archive_sidebar_px", String(sidebarPx));
  localStorage.setItem("sec_archive_toc_px",     String(tocPx));
}

function loadLayoutWidths() {
  const s = parseInt(localStorage.getItem("sec_archive_sidebar_px") || "", 10);
  const t = parseInt(localStorage.getItem("sec_archive_toc_px")     || "", 10);
  return {
    sidebar: Number.isFinite(s) ? s : DEFAULT_SIDEBAR_PX,
    toc:     Number.isFinite(t) ? t : DEFAULT_TOC_PX,
  };
}

/* ===== Theme ===== */
function enableThemeToggle() {
  const btn = qs("themeToggle");
  if (!btn) return;

  const saved = localStorage.getItem("sec_archive_theme");
  if (saved === "dark") document.body.classList.add("dark");

  btn.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem(
      "sec_archive_theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  });
}

/* ===== Home button ===== */
function enableHomeBtn() {
  const btn = qs("homeBtn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

/* ===== Resizers ===== */
function enableResizers() {
  const resLeft   = qs("resizerLeft");
  const resRight  = qs("resizerRight");
  const layoutRoot = qs("layoutRoot");

  let dragging = null;

  function onDown(which) {
    return (e) => {
      e.preventDefault();
      dragging = which;
      document.body.classList.add("dragging");
    };
  }

  function onMove(e) {
    if (!dragging) return;

    const rect  = layoutRoot.getBoundingClientRect();
    const x     = e.clientX - rect.left;
    const total = rect.width;

    if (dragging === "left") {
      const newSidebar = Math.max(180, Math.min(520, Math.round(x)));
      setCSSVar("--sidebar-w", `${newSidebar}px`);
      saveLayoutWidths(newSidebar, getTocWidth());
    } else if (dragging === "right") {
      const newToc = Math.max(200, Math.min(520, Math.round(total - x)));
      setCSSVar("--toc-w", `${newToc}px`);
      saveLayoutWidths(getSidebarWidth(), newToc);
    }
  }

  function onUp() {
    if (!dragging) return;
    dragging = null;
    document.body.classList.remove("dragging");
  }

  function getSidebarWidth() {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--sidebar-w").trim();
    return parseInt(v, 10) || DEFAULT_SIDEBAR_PX;
  }
  function getTocWidth() {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue("--toc-w").trim();
    return parseInt(v, 10) || DEFAULT_TOC_PX;
  }

  resLeft ?.addEventListener("mousedown", onDown("left"));
  resRight?.addEventListener("mousedown", onDown("right"));
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup",   onUp);
}

/* ===== TOC collapse ===== */
function enableTocCollapse() {
  const btn    = qs("tocToggleBtn");
  const layout = qs("layoutRoot");
  if (!btn || !layout) return;

  btn.addEventListener("click", () => {
    layout.classList.toggle("toc-collapsed");
    btn.textContent = layout.classList.contains("toc-collapsed") ? "⮞" : "⮜";
  });
}

/* ===== Sidebar builder ===== */
async function buildSidebarCTF() {
  const sidebar = qs("sidebar");
  if (!sidebar) return;
  sidebar.innerHTML = "";

  // Title row
  const titleRow = document.createElement("div");
  titleRow.className = "sidebar-title-row";

  const title = document.createElement("div");
  title.className = "sidebar-title";
  title.textContent = "CTF";

  const foldBtn = document.createElement("button");
  foldBtn.className = "mini-btn";
  foldBtn.id = "foldCTF";
  foldBtn.textContent = "▾";
  foldBtn.title = "Collapse / Expand";

  titleRow.appendChild(title);
  titleRow.appendChild(foldBtn);
  sidebar.appendChild(titleRow);

  // Children container
  const container = document.createElement("div");
  container.className = "children open";
  sidebar.appendChild(container);

  foldBtn.addEventListener("click", () => {
    const open = container.classList.toggle("open");
    foldBtn.textContent = open ? "▾" : "▸";
  });

  // Fetch order list
  try {
    const res  = await fetch("./data/order_CTF.json");
    if (!res.ok) throw new Error("Failed to load order_CTF.json");
    const data = await res.json();
    const list = Array.isArray(data.ctf_order) ? data.ctf_order : [];

    if (!list.length) {
      container.innerHTML = `<p class="muted">No CTF events.</p>`;
      return;
    }

    list.forEach((name) => {
      const node = document.createElement("div");
      node.className = "node";
      node.textContent = name;

      node.addEventListener("click", async () => {
        sidebar.querySelectorAll(".node.active").forEach((el) =>
          el.classList.remove("active")
        );
        node.classList.add("active");
        await loadCTFEvent(name);
      });

      container.appendChild(node);
    });

    // ★ Deep-link：從首頁帶 ?event=xxx 進來，自動選取
    const params = new URLSearchParams(location.search);
    const eventParam = params.get("event");
    if (eventParam) {
      const nodes = Array.from(container.querySelectorAll(".node"));
      const target = nodes.find((n) => n.textContent === eventParam);
      if (target) target.click();
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p class="muted">Failed to load CTF list.</p>`;
  }
}

/* ===== Init layout ===== */
function applyInitialLayout() {
  const { sidebar, toc } = loadLayoutWidths();
  setCSSVar("--sidebar-w", `${sidebar}px`);
  setCSSVar("--toc-w", `${toc}px`);
}

/* ===== DOMContentLoaded ===== */
document.addEventListener("DOMContentLoaded", async () => {
  applyInitialLayout();
  enableThemeToggle();
  enableHomeBtn();
  enableResizers();
  enableTocCollapse();
  await buildSidebarCTF();
});