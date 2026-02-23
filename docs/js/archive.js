import { loadCTFEvent } from "./CTF.js";

async function init() {
  const sidebar = document.getElementById("sidebar");

  const res = await fetch("./data/order_CTF.json");
  const data = await res.json();

  const mainNode = document.createElement("div");
  mainNode.className = "node folder";
  mainNode.textContent = "#CTF";
  sidebar.appendChild(mainNode);

  const container = document.createElement("div");
  container.className = "children open";
  sidebar.appendChild(container);

  mainNode.onclick = () => {
    container.classList.toggle("open");
  };

  data.ctf_order.forEach(name => {
    const node = document.createElement("div");
    node.className = "node";
    node.textContent = name;

    node.onclick = () => {
      loadCTFEvent(name);
    };

    container.appendChild(node);
  });

  enableResize();
  enableThemeToggle();
}

function enableResize() {
  const left = document.getElementById("sidebar");
  const middle = document.getElementById("content");

  const resizer = document.createElement("div");
  resizer.style.width = "5px";
  resizer.style.cursor = "col-resize";
  resizer.style.background = "#ddd";

  left.after(resizer);

  resizer.addEventListener("mousedown", () => {
    document.onmousemove = e => {
      left.style.width = e.clientX + "px";
    };
    document.onmouseup = () => {
      document.onmousemove = null;
    };
  });
}

function enableThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;

  btn.onclick = () => {
    document.body.classList.toggle("dark");
  };
}

document.addEventListener("DOMContentLoaded", init);