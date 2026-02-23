// archive.js

import { loadCTFEvent } from "./CTF.js";

async function init() {
  const sidebar = document.getElementById("sidebar");

  const res = await fetch("./data/order_CTF.json");
  const data = await res.json();

  // 建立主分類
  const mainNode = document.createElement("div");
  mainNode.className = "node folder";
  mainNode.textContent = "#CTF";
  sidebar.appendChild(mainNode);

  const container = document.createElement("div");
  container.className = "children open";
  sidebar.appendChild(container);

  // 按照順序建立 CTF play
  data.ctf_order.forEach(name => {
    const node = document.createElement("div");
    node.className = "node";
    node.textContent = name;

    node.onclick = () => {
      loadCTFEvent(name);
    };

    container.appendChild(node);
  });
}

init();