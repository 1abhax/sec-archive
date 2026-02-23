:root{
  --bg: #0b1220;
  --bg2: #0b1220;
  --surface: rgba(255,255,255,0.86);
  --surface2: rgba(255,255,255,0.72);
  --text: #0f172a;
  --muted: #475569;
  --border: rgba(15,23,42,0.12);
  --accent: #2563eb;

  --shadow: 0 18px 50px rgba(0,0,0,0.18);
  --shadow2: 0 10px 26px rgba(0,0,0,0.12);
  --radius: 22px;
  --radius-sm: 14px;

  --topbar-h: 64px;
  --sidebar-w: 320px;
  --toc-w: 280px;

  --code-bg: #0b1220;
  --code-text: #e2e8f0;
}

body.dark{
  --surface: rgba(15,23,42,0.84);
  --surface2: rgba(15,23,42,0.70);
  --text: #e2e8f0;
  --muted: #94a3b8;
  --border: rgba(148,163,184,0.16);
  --accent: #60a5fa;

  --shadow: 0 18px 55px rgba(0,0,0,0.45);
  --shadow2: 0 10px 28px rgba(0,0,0,0.35);

  --code-bg: #020617;
  --code-text: #e2e8f0;
}

*{ box-sizing: border-box; }
html{ scroll-behavior: smooth; }
body{
  margin:0;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  color: var(--text);
  min-height: 100vh;
  overflow-x: hidden;
}

#bg{
  position: fixed;
  inset: 0;
  background: radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.22), transparent 60%),
              radial-gradient(900px 500px at 70% 20%, rgba(255,255,255,0.18), transparent 55%),
              linear-gradient(180deg, var(--bg), var(--bg2));
  background-size: cover;
  background-position: center;
  filter: saturate(1.08) contrast(1.06);
  transform: scale(1.03);
  z-index: -3;
}

#bgOverlay{
  position: fixed;
  inset: 0;
  background: rgba(2,6,23,0.22);
  backdrop-filter: blur(10px);
  z-index: -2;
}
body.dark #bgOverlay{ background: rgba(2,6,23,0.45); }

/* Topbar */
#topbar{
  position: sticky;
  top:0;
  height: var(--topbar-h);
  display:flex;
  align-items:center;
  padding: 0 18px;
  z-index: 30;
}

.brand{
  display:flex;
  align-items: baseline;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}
.logo{
  font-weight: 900;
  letter-spacing: 0.2px;
  font-size: 18px;
  color: white;
}
.subtitle{
  color: rgba(255,255,255,0.80);
  font-size: 13px;
}

.topbar-actions{
  margin-left: auto;
  display:flex;
  align-items:center;
  gap:10px;
}

.crumbs{
  display:flex;
  gap: 8px;
  align-items:center;
  flex-wrap: wrap;
  max-width: 55vw;
  justify-content: flex-end;
  color: rgba(255,255,255,0.85);
  font-size: 13px;
}
.crumbs .sep{ opacity: 0.55; }
.crumbs a{
  color: rgba(255,255,255,0.92);
  text-decoration: none;
  border-bottom: 1px solid rgba(255,255,255,0.18);
}
.crumbs a:hover{
  border-bottom-color: rgba(255,255,255,0.45);
}

.icon-btn{
  height: 38px;
  min-width: 42px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.22);
  background: rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.92);
  cursor: pointer;
  backdrop-filter: blur(10px);
}
.icon-btn:hover{
  background: rgba(255,255,255,0.16);
  border-color: rgba(255,255,255,0.30);
}
.link-btn{ text-decoration:none; display:inline-flex; justify-content:center; align-items:center; }

/* Shell */
#shell{
  padding: 26px 18px 48px;
}

/* Cards */
.card{
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow2);
  backdrop-filter: blur(16px);
}

/* Home view */
.view{ max-width: 1200px; margin: 0 auto; }
.hidden{ display:none; }

.hero{
  padding: 22px 22px;
  margin-bottom: 16px;
}
.hero-title{
  font-size: 28px;
  font-weight: 900;
  letter-spacing: -0.4px;
}
.hero-subtitle{
  margin-top: 10px;
  color: var(--muted);
  line-height: 1.7;
}
.hero-meta{
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
}

.grid{
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}
@media (max-width: 980px){ .grid{ grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 620px){ .grid{ grid-template-columns: 1fr; } }

.tile{
  padding: 18px 18px;
  cursor:pointer;
  transition: transform 0.16s ease, box-shadow 0.16s ease;
  position: relative;
  overflow: hidden;
}
.tile:hover{
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}
.tile-title{
  font-weight: 900;
  font-size: 18px;
}
.tile-sub{
  margin-top: 10px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.65;
}
.tile-pill{
  position:absolute;
  top: 14px;
  right: 14px;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--muted);
}

/* Event layout */
#layout{
  display:flex;
  gap: 14px;
  align-items: flex-start;
}

#sidebar{
  width: var(--sidebar-w);
  position: sticky;
  top: calc(var(--topbar-h) + 14px);
  max-height: calc(100vh - var(--topbar-h) - 28px);
  overflow: auto;
  padding: 14px;
  border-radius: var(--radius);
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow2);
  backdrop-filter: blur(16px);
}

.sidebar-head{
  display:flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}
.sidebar-title{
  font-weight: 900;
  font-size: 14px;
}

.search-wrap{
  display:flex;
  align-items:center;
  gap: 8px;
  padding: 10px 10px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface2);
}
#searchBox{
  width: 100%;
  border:none;
  outline:none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
}
.mini-btn{
  border:none;
  cursor:pointer;
  height: 26px;
  width: 26px;
  border-radius: 8px;
  background: rgba(37,99,235,0.10);
  color: var(--accent);
}
.mini-btn:hover{ background: rgba(37,99,235,0.16); }

.tree{ padding: 4px 2px 6px; }

.node{
  display:flex;
  align-items:center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 14px;
  cursor: pointer;
  border: 1px solid transparent;
  user-select:none;
  transition: 0.14s ease;
}
.node:hover{
  background: rgba(37,99,235,0.08);
  border-color: rgba(37,99,235,0.18);
}
.node.active{
  background: rgba(37,99,235,0.14);
  border-color: rgba(37,99,235,0.28);
}
.node .name{
  overflow:hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
.badge{
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--border);
  color: var(--muted);
  background: var(--surface2);
}

.children{
  margin-left: 12px;
  padding-left: 10px;
  border-left: 1px dashed rgba(148,163,184,0.32);
  display:none;
}

#contentWrap{
  flex: 1;
  min-width: 0;
}
.content-card{
  padding: 22px 22px;
  min-height: calc(100vh - var(--topbar-h) - 74px);
}

.welcome-title{
  font-weight: 900;
  font-size: 20px;
}
.welcome-subtitle{
  margin-top: 10px;
  color: var(--muted);
  line-height: 1.75;
  font-size: 13px;
}

.file-head{
  display:flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border);
}
.file-head .title{
  font-weight: 900;
  font-size: 16px;
}
.file-head .meta{
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.file-actions{
  display:flex;
  gap: 10px;
  align-items:center;
}
.btn{
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--text);
  border-radius: 999px;
  padding: 10px 12px;
  font-size: 13px;
  cursor:pointer;
  text-decoration:none;
}
.btn:hover{ border-color: rgba(37,99,235,0.25); background: rgba(37,99,235,0.08); }

/* TOC */
#toc{
  width: var(--toc-w);
  position: sticky;
  top: calc(var(--topbar-h) + 14px);
}
#toc.hidden{ display:none; }

.toc-card{
  padding: 14px 14px;
  max-height: calc(100vh - var(--topbar-h) - 28px);
  overflow:auto;
}
.toc-title{
  font-weight: 900;
  font-size: 12px;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  color: var(--muted);
}
.toc-meta{
  margin-top: 8px;
  font-size: 12px;
  color: var(--muted);
}
.toc-body{
  margin-top: 10px;
}
.toc-body a{
  display:block;
  padding: 8px 10px;
  border-radius: 12px;
  color: var(--muted);
  text-decoration:none;
  border: 1px solid transparent;
  font-size: 13px;
  line-height: 1.35;
}
.toc-body a:hover{
  color: var(--text);
  background: rgba(37,99,235,0.08);
  border-color: rgba(37,99,235,0.18);
}
.toc-body a.active{
  color: var(--text);
  background: rgba(37,99,235,0.14);
  border-color: rgba(37,99,235,0.28);
}

/* Markdown / Text rendering */
.markdown-content{ max-width: 980px; }
.markdown-content h1{ font-size: 30px; margin: 0 0 16px; letter-spacing: -0.4px; }
.markdown-content h2{ font-size: 21px; margin-top: 34px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
.markdown-content h3{ font-size: 17px; margin-top: 22px; }
.markdown-content p{ line-height: 1.85; margin: 14px 0; }
.markdown-content a{ color: var(--accent); text-decoration:none; border-bottom: 1px solid rgba(37,99,235,0.25); }
.markdown-content a:hover{ border-bottom-color: rgba(37,99,235,0.55); }
.markdown-content blockquote{
  margin: 18px 0;
  padding: 12px 14px;
  border-left: 4px solid rgba(37,99,235,0.35);
  background: rgba(37,99,235,0.06);
  border-radius: 14px;
}

pre{
  position: relative;
  background: var(--code-bg);
  color: var(--code-text);
  padding: 16px;
  border-radius: 16px;
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.65;
  border: 1px solid rgba(148,163,184,0.18);
  margin: 14px 0;
}
code{
  background: rgba(37,99,235,0.10);
  color: var(--accent);
  padding: 2px 6px;
  border-radius: 10px;
}
pre code{
  background: transparent;
  color: inherit;
  padding: 0;
  border-radius: 0;
}

/* Copy button */
.copy-btn{
  position:absolute;
  top: 10px;
  right: 10px;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.10);
  color: rgba(255,255,255,0.92);
  cursor:pointer;
  font-size: 12px;
  backdrop-filter: blur(10px);
}
.copy-btn:hover{
  background: rgba(255,255,255,0.16);
  border-color: rgba(255,255,255,0.28);
}

/* Text viewer */
.text-view{
  white-space: pre;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 13px;
}

/* Toast */
.toast{
  position: fixed;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15,23,42,0.86);
  color: rgba(255,255,255,0.94);
  border: 1px solid rgba(255,255,255,0.18);
  padding: 10px 14px;
  border-radius: 999px;
  box-shadow: 0 14px 40px rgba(0,0,0,0.28);
  opacity: 0;
  pointer-events: none;
  transition: 0.16s ease;
  z-index: 1000;
}
.toast.show{ opacity: 1; }

@media (max-width: 1100px){
  #toc{ display:none; }
}
@media (max-width: 860px){
  #layout{ flex-direction: column; }
  #sidebar{ width: 100%; position: relative; top: 0; max-height: none; }
}