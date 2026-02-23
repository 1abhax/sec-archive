const urlParams = new URLSearchParams(window.location.search);
const targetPath = urlParams.get("path");

async function init() {
  const res = await fetch("data/tree.json");
  const data = await res.json();

  const sidebar = document.getElementById("sidebar");

  data.sections.forEach(section => {
    const root = createNode(section.tag, true);
    sidebar.appendChild(root.node);
    const container = root.children;

    section.items.forEach(item => {
      const parts = item.path.split("/");
      buildTree(parts, container, item.path);
    });
  });

  if (targetPath) {
    loadFile(targetPath);
  }
}

function buildTree(parts, container, fullPath) {
  if (parts.length === 0) return;

  const name = parts[0];
  let existing = [...container.children].find(n => n.dataset?.name === name);

  if (!existing) {
    const node = createNode(name, parts.length > 1);
    node.node.dataset.name = name;
    container.appendChild(node.node);
    container.appendChild(node.children);
    existing = node.node;
  }

  if (parts.length === 1) {
    existing.onclick = () => loadFile(fullPath);
  } else {
    buildTree(parts.slice(1), existing.nextSibling, fullPath);
  }
}

function createNode(name, isFolder) {
  const node = document.createElement("div");
  node.className = "node " + (isFolder ? "folder" : "file");
  node.textContent = name;

  const children = document.createElement("div");
  children.className = "children";

  if (isFolder) {
    node.onclick = () => {
  node.classList.toggle("open");
  children.classList.toggle("open");
};
  }

  return { node, children };
}

async function loadFile(path) {
  const content = document.getElementById("content");
  const res = await fetch(path);
  const text = await res.text();
  content.innerHTML = marked.parse(text);
}

init();