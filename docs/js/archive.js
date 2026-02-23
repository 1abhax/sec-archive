// archive.js

import { loadCTF } from "./CTF.js";

const MAJORS = [
  {
    name: "CTF",
    handler: loadCTF
  }
];

function init() {
  const sidebar = document.getElementById("sidebar");

  MAJORS.forEach(major => {
    const node = document.createElement("div");
    node.className = "node folder";
    node.textContent = "#" + major.name;

    node.onclick = () => {
      major.handler();
    };

    sidebar.appendChild(node);
  });
}

init();