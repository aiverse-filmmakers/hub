/* Dependency-free smoke tests for AXIS LAB. Run: node axis-lab/tests/smoke.cjs */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
class Node {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.events = {};
    this.style = {};
    this.attrs = {};
    this.value = "";
    this.textContent = "";
    this.scrollLeft = 0;
    this.scrollWidth = 600;
    this.files = null;
  }
  addEventListener(type, cb) { (this.events[type] ||= []).push(cb); }
  async trigger(type, details = {}) {
    const event = { target: this, preventDefault() {}, ...details };
    return Promise.all((this.events[type] || []).map(callback => callback(event)));
  }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  appendChild(node) { this.children.push(node); return node; }
  replaceChildren(...nodes) { this.children = nodes; }
  setPointerCapture() {}
  click() { return this.trigger("click"); }
  remove() {}
}
const nodes = {};
const downloads = [];
const saved = {};
const browserWindow = new Node("window");
browserWindow.confirm = () => true;
const document = {
  getElementById(id) { return nodes[id] ||= new Node(id); },
  createElement(tag) {
    const node = new Node(tag);
    if (tag === "a") node.click = function () { downloads.push(this.download); };
    return node;
  },
  createElementNS(uri, tag) { return new Node(tag); },
  body: new Node("body")
};
const floor = document.getElementById("floor");
floor.getScreenCTM = () => ({ inverse: () => ({}) });
floor.createSVGPoint = () => ({ x: 0, y: 0, matrixTransform() { return { x: this.x, y: this.y }; } });
const storage = {
  getItem(key) { return saved[key] ?? null; },
  setItem(key, value) { saved[key] = value; }
};
const context = {
  document,
  localStorage: storage,
  window: browserWindow,
  navigator: { clipboard: { writeText: async text => { saved.clipboard = text; } } },
  URL: { createObjectURL: () => "blob:local-test", revokeObjectURL: () => {} },
  Blob: class { constructor(data) { this.data = data; } },
  setTimeout: () => 1,
  clearTimeout: () => {}
};
async function main() {
  assert(html.includes('src="./app.js"') && html.includes('href="./styles.css"'));
  assert(css.includes("@media (max-width: 560px)"));
  assert(!app.includes("fetch(") && !app.includes("XMLHttpRequest") && !app.includes("WebSocket"));
  assert(!html.includes("—") && !css.includes("—") && !app.includes("—"));
  vm.runInNewContext(app, context, { filename: "axis-lab/app.js" });
  assert.equal(nodes.shotCount.textContent, "(0 shots)");
  assert.equal(nodes.cameraSide.textContent, "Side 1");
  assert(html.includes('id="placeCam"') && html.includes('class="touch-zone"'));
  assert.equal(nodes.placeCam.attrs["aria-pressed"], "true");

  // Simulate an iPhone finger touching the camera and dragging across the axis.
  await floor.trigger("pointerdown", { pointerId: 1, pointerType: "touch", target: nodes.handleCam, clientX: 480, clientY: 505 });
  await browserWindow.trigger("pointermove", { pointerId: 1, pointerType: "touch", clientX: 480, clientY: 140 });
  await browserWindow.trigger("pointerup", { pointerId: 1, type: "pointerup", clientX: 480, clientY: 140 });
  assert.equal(nodes.cameraSide.textContent, "Side 2", "Touch drag must move the camera");

  // Tap a blank location on the floor to place the selected camera without dragging.
  await floor.trigger("pointerdown", { pointerId: 2, pointerType: "touch", target: floor, clientX: 480, clientY: 505 });
  await browserWindow.trigger("pointerup", { pointerId: 2, type: "pointerup", clientX: 480, clientY: 505 });
  assert.equal(nodes.cameraSide.textContent, "Side 1", "Touch tap-to-place must reposition the camera");

  await nodes.placeB.click();
  assert.equal(nodes.placeB.attrs["aria-pressed"], "true");
  assert.equal(nodes.placeCam.attrs["aria-pressed"], "false");
  await floor.trigger("pointerdown", { pointerId: 3, pointerType: "touch", target: floor, clientX: 680, clientY: 300 });
  await browserWindow.trigger("pointerup", { pointerId: 3, type: "pointerup", clientX: 680, clientY: 300 });
  assert.equal(JSON.parse(saved["aiverse-axis-lab-v1"]).b.x, 680, "Selecting B then tapping must move performer B");
  await floor.trigger("pointerdown", { pointerId: 4, pointerType: "touch", target: floor, clientX: 660, clientY: 300 });
  await browserWindow.trigger("pointerup", { pointerId: 4, type: "pointerup", clientX: 660, clientY: 300 });

  await nodes.capture.click();
  assert.equal(nodes.shotCount.textContent, "(1 shot)");
  assert.equal(JSON.parse(saved["aiverse-axis-lab-v1"]).shots.length, 1);

  for (let i = 0; i < 22; i++) await nodes.handleCam.trigger("keydown", { key: "ArrowUp" });
  assert.equal(nodes.cameraSide.textContent, "Side 2");
  await nodes.capture.click();
  const report = nodes.continuityResults.children[0].children[1].children.map(item => item.textContent).join(" ");
  assert(report.includes("180°"), "A cross-axis cut must be flagged");
  assert.equal(nodes.shotList.children.length, 2);
  assert.notEqual(JSON.parse(saved["aiverse-axis-lab-v1"]).shots[0].cam.y, JSON.parse(saved["aiverse-axis-lab-v1"]).shots[1].cam.y);

  const project = JSON.parse(saved["aiverse-axis-lab-v1"]);
  await nodes.shotList.children[0].children[0].click();
  assert.equal(nodes.cameraSide.textContent, "Side 1");
  await nodes.shotList.children[1].children[1].click();
  assert.equal(nodes.shotCount.textContent, "(1 shot)");

  await nodes.downloadBrief.click();
  await nodes.saveProject.click();
  assert(downloads.some(name => name.endsWith("-brief.md")));
  assert(downloads.some(name => name.endsWith(".json")));

  await nodes.reset.click();
  assert.equal(JSON.parse(saved["aiverse-axis-lab-v1"]).shots.length, 0);

  nodes.importFile.files = [{
    size: 1000,
    text: async () => JSON.stringify({ ...project, format: "axis-lab-project" })
  }];
  await nodes.importFile.trigger("change");
  assert.equal(nodes.shotCount.textContent, "(2 shots)", "JSON round trip must restore the saved shots");

  nodes.importFile.files = [{ size: 100, text: async () => "{broken" }];
  await nodes.importFile.trigger("change");
  assert.equal(nodes.shotCount.textContent, "(2 shots)", "Bad import must not overwrite an existing scene");

  console.log("PASS: mobile touch drag, tap-to-place, selector controls, responsive HTML, capture, keyboard, 180° cut check, filmstrip, exports, reset, JSON import and invalid-import protection.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
