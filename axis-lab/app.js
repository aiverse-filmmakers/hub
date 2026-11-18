/* AXIS LAB. No dependencies, uploads, network calls or model inference. */
(function () {
  "use strict";

  var STORAGE_KEY = "aiverse-axis-lab-v1";
  var MAX_SHOTS = 60;
  var floor = document.getElementById("floor");
  if (!floor) return;

  function between(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function finite(value, fallback) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }
  function point(raw, fallback) {
    raw = raw && typeof raw === "object" ? raw : {};
    return { x: between(finite(raw.x, fallback.x), 55, 905), y: between(finite(raw.y, fallback.y), 65, 535) };
  }
  function trimmed(input, max, fallback) {
    return typeof input === "string" ? input.slice(0, max).trim() : fallback;
  }
  function initialState() {
    return {
      version: 1, scene: "", aName: "Performer A", bName: "Performer B",
      a: { x: 300, y: 300 }, b: { x: 660, y: 300 }, cam: { x: 480, y: 505 },
      size: "medium", move: "Locked-off", intent: "", shots: [], active: -1
    };
  }
  var allowedSizes = ["wide", "medium", "close"];
  var allowedMoves = ["Locked-off", "Handheld", "Dolly", "Gimbal", "FPV / drone", "Orbit"];
  function safeShot(raw) {
    if (!raw || typeof raw !== "object") return null;
    var base = initialState();
    return {
      a: point(raw.a, base.a), b: point(raw.b, base.b), cam: point(raw.cam, base.cam),
      size: allowedSizes.indexOf(raw.size) >= 0 ? raw.size : "medium",
      move: allowedMoves.indexOf(raw.move) >= 0 ? raw.move : "Locked-off",
      intent: trimmed(raw.intent, 400, "")
    };
  }
  function sanitize(raw) {
    if (!raw || typeof raw !== "object" || (raw.version !== 1 && raw.format !== "axis-lab-project")) throw new Error("This is not an AXIS LAB project.");
    var base = initialState();
    var cleaned = {
      version: 1,
      scene: trimmed(raw.scene, 100, ""), aName: trimmed(raw.aName, 50, base.aName) || base.aName,
      bName: trimmed(raw.bName, 50, base.bName) || base.bName,
      a: point(raw.a, base.a), b: point(raw.b, base.b), cam: point(raw.cam, base.cam),
      size: allowedSizes.indexOf(raw.size) >= 0 ? raw.size : "medium",
      move: allowedMoves.indexOf(raw.move) >= 0 ? raw.move : "Locked-off",
      intent: trimmed(raw.intent, 400, ""),
      shots: Array.isArray(raw.shots) ? raw.shots.slice(0, MAX_SHOTS).map(safeShot).filter(Boolean) : [],
      active: -1
    };
    return cleaned;
  }
  var state = initialState();
  try {
    var previous = localStorage.getItem(STORAGE_KEY);
    if (previous) state = sanitize(JSON.parse(previous));
  } catch (error) { state = initialState(); }

  function el(id) { return document.getElementById(id); }
  var inputIds = ["sceneName", "actorA", "actorB", "shotSize", "cameraMove", "shotIntent"];
  function syncInputs() {
    el("sceneName").value = state.scene;
    el("actorA").value = state.aName;
    el("actorB").value = state.bName;
    el("shotSize").value = state.size;
    el("cameraMove").value = state.move;
    el("shotIntent").value = state.intent;
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { notify("Browser storage is unavailable. Save a project JSON to keep your work.", true); }
  }
  var toastHandle = 0;
  function notify(message, isError) {
    var toast = el("toast");
    toast.textContent = message;
    toast.style.color = isError ? "#e2a68e" : "#a2d5bd";
    if (toastHandle) clearTimeout(toastHandle);
    toastHandle = setTimeout(function () { toast.textContent = ""; }, 6500);
  }

  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function axisInfo(shot) {
    var ax = shot.b.x - shot.a.x, ay = shot.b.y - shot.a.y;
    var length = Math.hypot(ax, ay);
    if (length < 75) return { side: 0, label: "Unclear axis", offset: 0 };
    var cross = ax * (shot.cam.y - shot.a.y) - ay * (shot.cam.x - shot.a.x);
    var offset = cross / length;
    return { side: Math.abs(offset) < 28 ? 0 : (offset > 0 ? 1 : -1), label: Math.abs(offset) < 28 ? "On action axis" : (offset > 0 ? "Side 1" : "Side 2"), offset: offset };
  }
  function screenProjection(shot) {
    var target = { x: (shot.a.x + shot.b.x) / 2, y: (shot.a.y + shot.b.y) / 2 };
    var dx = target.x - shot.cam.x, dy = target.y - shot.cam.y;
    var len = Math.hypot(dx, dy) || 1;
    var rx = -dy / len, ry = dx / len;
    var extent = shot.size === "wide" ? 880 : shot.size === "close" ? 440 : 600;
    function subjectX(p) { return between(50 + ((p.x - target.x) * rx + (p.y - target.y) * ry) / extent * 100, 9, 91); }
    return { a: subjectX(shot.a), b: subjectX(shot.b) };
  }
  function currentShot() {
    return {
      a: { x: state.a.x, y: state.a.y }, b: { x: state.b.x, y: state.b.y },
      cam: { x: state.cam.x, y: state.cam.y },
      size: state.size, move: state.move, intent: state.intent
    };
  }
  function prettySize(value) { return value === "wide" ? "Wide" : value === "close" ? "Close" : "Medium"; }
  function shortName(value) { return (value || "").slice(0, 18).toUpperCase(); }
  function screenOrder(shot) {
    var projection = screenProjection(shot);
    if (Math.abs(projection.a - projection.b) < 4) return "Overlapping sightlines";
    return projection.a < projection.b ? "A left / B right" : "B left / A right";
  }

  function redrawFloor() {
    var a = state.a, b = state.b, cam = state.cam;
    el("handleA").setAttribute("transform", "translate(" + a.x + " " + a.y + ")");
    el("handleB").setAttribute("transform", "translate(" + b.x + " " + b.y + ")");
    el("handleCam").setAttribute("transform", "translate(" + cam.x + " " + cam.y + ")");
    el("labelA").textContent = shortName(state.aName);
    el("labelB").textContent = shortName(state.bName);
    el("axisSolid").setAttribute("x1", a.x); el("axisSolid").setAttribute("y1", a.y);
    el("axisSolid").setAttribute("x2", b.x); el("axisSolid").setAttribute("y2", b.y);
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
    var ux = dx / len, uy = dy / len;
    var x1 = a.x - ux * 1000, y1 = a.y - uy * 1000, x2 = b.x + ux * 1000, y2 = b.y + uy * 1000;
    el("axisExtended").setAttribute("x1", x1); el("axisExtended").setAttribute("y1", y1);
    el("axisExtended").setAttribute("x2", x2); el("axisExtended").setAttribute("y2", y2);
    el("axisLabel").setAttribute("x", (a.x + b.x) / 2);
    el("axisLabel").setAttribute("y", (a.y + b.y) / 2 - 20);
    var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    var cross = Math.hypot(mid.x - cam.x, mid.y - cam.y) || 1;
    var perpX = (mid.y - cam.y) / cross, perpY = -(mid.x - cam.x) / cross;
    var radius = Math.min(125, cross * .5);
    el("cameraCone").setAttribute("d", "M " + cam.x + " " + cam.y + " L " + (mid.x + perpX * radius) + " " + (mid.y + perpY * radius) + " L " + (mid.x - perpX * radius) + " " + (mid.y - perpY * radius) + " Z");
    var old = el("priorCameras");
    old.replaceChildren();
    state.shots.forEach(function (shot, index) {
      var node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      node.setAttribute("cx", shot.cam.x);
      node.setAttribute("cy", shot.cam.y);
      node.setAttribute("r", 9);
      node.setAttribute("fill", index === state.active ? "#e2c38d" : "#879e96");
      node.setAttribute("fill-opacity", index === state.active ? ".8" : ".38");
      node.setAttribute("stroke", "#f2eee5");
      node.setAttribute("stroke-opacity", ".45");
      var t = document.createElementNS("http://www.w3.org/2000/svg", "title");
      t.textContent = "Shot " + (index + 1) + " camera position";
      node.appendChild(t);
      old.appendChild(node);
    });
  }
  function redrawMonitor() {
    var shot = currentShot(), projection = screenProjection(shot), info = axisInfo(shot);
    var size = state.size;
    var h = size === "wide" ? 54 : size === "close" ? 137 : 88;
    var bottom = size === "wide" ? -10 : size === "close" ? -45 : -22;
    [["A", projection.a], ["B", projection.b]].forEach(function (item) {
      var node = el("subject" + item[0]);
      node.style.left = item[1] + "%";
      node.style.height = h + "%";
      node.style.bottom = bottom + "%";
    });
    el("screenOrder").textContent = screenOrder(shot).toUpperCase();
    el("axisStatus").textContent = info.label.toUpperCase();
    el("cameraSide").textContent = info.label;
    el("coverageLabel").textContent = prettySize(size);
    el("frameBottom").textContent = prettySize(size).toUpperCase() + " · " + state.move.toUpperCase();
    var guidance = state.shots.length ? "Compare against saved setups" : "Capture an opening shot";
    var tip = "Keep cameras on one side of the action axis for predictable screen direction. Cross intentionally with a motivated move or neutral bridge.";
    if (distance(shot.a, shot.b) < 75) { guidance = "Separate your performers"; tip = "Move the performers apart to establish a usable action axis."; }
    else if (info.side === 0) { guidance = "Axis position is ambiguous"; tip = "You are near the action axis. This can be a deliberate neutral bridge, but don't assume the screen direction is stable."; }
    else if (state.shots.length) {
      var last = state.shots[state.shots.length - 1];
      var lastSide = axisInfo(last).side;
      if (lastSide && lastSide !== info.side) {
        guidance = "Potential axis crossing";
        tip = "This camera sits across the line from your last captured setup. Consider an intentional neutral insert or a visible camera move.";
      }
    }
    el("guidanceLabel").textContent = guidance;
    el("directionTip").textContent = tip;
  }
  function element(tag, className, textValue) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue != null) node.textContent = textValue;
    return node;
  }
  function renderShots() {
    var list = el("shotList");
    list.replaceChildren();
    el("shotCount").textContent = "(" + state.shots.length + " shot" + (state.shots.length === 1 ? "" : "s") + ")";
    if (!state.shots.length) {
      list.appendChild(element("div", "empty-coverage", "No setups captured yet. Position the camera and capture your first shot."));
      return;
    }
    state.shots.forEach(function (shot, index) {
      var wrap = element("div", "shot-wrap");
      var button = element("button", "shot-card" + (index === state.active ? " is-active" : ""));
      button.type = "button";
      button.setAttribute("aria-label", "Restore setup from shot " + (index + 1));
      var mini = element("div", "mini-scene");
      var positions = screenProjection(shot);
      [["a", positions.a], ["b", positions.b]].forEach(function (data) {
        var talent = element("div", "mini-talent " + data[0]);
        talent.style.left = data[1] + "%";
        if (shot.size === "wide") { talent.style.height = "33px"; }
        if (shot.size === "close") { talent.style.height = "75px"; }
        mini.appendChild(talent);
      });
      var meta = element("div", "shot-meta");
      meta.appendChild(element("strong", "", "SHOT " + String(index + 1).padStart(2, "0")));
      meta.appendChild(element("span", "", prettySize(shot.size)));
      var info = element("div", "shot-info");
      info.appendChild(element("span", "", shot.move.toUpperCase()));
      info.appendChild(element("span", "", axisInfo(shot).label.toUpperCase()));
      button.appendChild(mini); button.appendChild(meta); button.appendChild(info);
      button.addEventListener("click", function () {
        state.a = point(shot.a, state.a); state.b = point(shot.b, state.b); state.cam = point(shot.cam, state.cam);
        state.size = shot.size; state.move = shot.move; state.intent = shot.intent;
        state.active = index; syncInputs(); render(); save();
        notify("Restored shot " + (index + 1) + ". Capturing again creates a new setup.");
      });
      var remove = element("button", "shot-remove", "×");
      remove.type = "button"; remove.title = "Remove shot " + (index + 1);
      remove.setAttribute("aria-label", "Remove shot " + (index + 1));
      remove.addEventListener("click", function () {
        state.shots.splice(index, 1);
        state.active = -1; render(); save();
        notify("Shot removed.");
      });
      wrap.appendChild(button); wrap.appendChild(remove); list.appendChild(wrap);
    });
  }
  function cutChecks() {
    var results = [];
    for (var i = 1; i < state.shots.length; i++) {
      var before = state.shots[i - 1], after = state.shots[i];
      var prev = axisInfo(before), next = axisInfo(after);
      var changes = Math.max(distance(before.a, after.a), distance(before.b, after.b));
      var flags = [];
      if (changes > 35) flags.push("Performer blocking changed between snapshots. Verify the movement is motivated and physically continuous.");
      if (prev.side === 0 || next.side === 0) flags.push("A camera is on or near the action axis. Confirm eyelines and screen direction in the actual shots.");
      else if (prev.side !== next.side) flags.push("Possible 180° line crossing. Screen order may reverse. Move the camera, add an intentional neutral shot, or show the crossing.");
      var from = screenOrder(before), to = screenOrder(after);
      if (from !== to && prev.side !== 0 && next.side !== 0 && changes <= 35 && !flags.some(function (flag) { return flag.indexOf("line crossing") >= 0; })) {
        flags.push("Left/right screen order changes. Check whether the audience can still follow the geography.");
      }
      if (!flags.length && before.size === after.size && distance(before.cam, after.cam) < 85) {
        flags.push("Similar camera placement and framing. Consider more distinct coverage if this cut needs to feel different.");
      }
      results.push({ from: i, to: i + 1, flags: flags });
    }
    return results;
  }
  function renderChecks() {
    var reports = cutChecks(), result = el("continuityResults");
    result.replaceChildren();
    if (!reports.length) {
      el("issueCount").textContent = "0 CUTS TO REVIEW";
      result.appendChild(element("p", "", "Capture at least two shots to review the cut between them."));
      return;
    }
    var total = reports.reduce(function (sum, report) { return sum + report.flags.length; }, 0);
    el("issueCount").textContent = total + " POSSIBLE ISSUE" + (total === 1 ? "" : "S") + " · " + reports.length + " CUT" + (reports.length === 1 ? "" : "S");
    reports.forEach(function (report) {
      var card = element("div", "check-card " + (report.flags.length ? "warning" : "ok"));
      card.appendChild(element("span", "check-mark", report.flags.length ? "!" : "✓"));
      var copy = element("div", "");
      copy.appendChild(element("strong", "", "SHOT " + String(report.from).padStart(2, "0") + " → SHOT " + String(report.to).padStart(2, "0")));
      (report.flags.length ? report.flags : ["No axis or blocking issue detected by this geometry check. Still review the performance, action, light, colour and sound bridge."]).forEach(function (message) {
        copy.appendChild(element("p", "", message));
      });
      card.appendChild(copy); result.appendChild(card);
    });
  }
  function render() {
    redrawFloor(); redrawMonitor(); renderShots(); renderChecks();
    el("capture").disabled = state.shots.length >= MAX_SHOTS;
  }
  function pointerPosition(event) {
    var ctm = floor.getScreenCTM();
    if (!ctm) return null;
    var p = floor.createSVGPoint(); p.x = event.clientX; p.y = event.clientY;
    var transformed = p.matrixTransform(ctm.inverse());
    return point(transformed, state.cam);
  }
  function attachDrag(id, field) {
    var handle = el(id), dragging = false;
    handle.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 && event.pointerType === "mouse") return;
      event.preventDefault(); dragging = true;
      handle.setPointerCapture(event.pointerId);
      var p = pointerPosition(event);
      if (p) { state[field] = p; state.active = -1; render(); }
    });
    handle.addEventListener("pointermove", function (event) {
      if (!dragging) return;
      event.preventDefault();
      var p = pointerPosition(event);
      if (p) { state[field] = p; state.active = -1; redrawFloor(); redrawMonitor(); }
    });
    function stop() { if (!dragging) return; dragging = false; render(); save(); }
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
    handle.addEventListener("lostpointercapture", stop);
    handle.addEventListener("keydown", function (event) {
      var directions = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
      if (!directions[event.key]) return;
      event.preventDefault();
      var delta = directions[event.key];
      state[field] = point({ x: state[field].x + delta[0], y: state[field].y + delta[1] }, state[field]);
      state.active = -1; render(); save();
    });
  }
  function updateField(id, field, max) {
    el(id).addEventListener("input", function (event) {
      state[field] = max ? event.target.value.slice(0, max) : event.target.value;
      state.active = -1;
      if (field === "aName" || field === "bName" || field === "size" || field === "move") render();
      save();
    });
  }
  updateField("sceneName", "scene", 100);
  updateField("actorA", "aName", 50);
  updateField("actorB", "bName", 50);
  updateField("shotSize", "size");
  updateField("cameraMove", "move");
  updateField("shotIntent", "intent", 400);
  attachDrag("handleA", "a"); attachDrag("handleB", "b"); attachDrag("handleCam", "cam");

  el("capture").addEventListener("click", function () {
    if (state.shots.length >= MAX_SHOTS) { notify("This project has reached the 60-shot limit. Export it before starting a new one.", true); return; }
    if (distance(state.a, state.b) < 75) { notify("Move performers A and B farther apart to establish an action axis.", true); return; }
    state.shots.push(currentShot());
    state.active = state.shots.length - 1;
    render(); save(); notify("Shot " + state.shots.length + " captured.");
    var list = el("shotList"); list.scrollLeft = list.scrollWidth;
  });

  function safeLine(value) { return String(value || "").replace(/[\r\n]+/g, " ").trim(); }
  function brief() {
    var lines = [
      "# AXIS LAB | Production shot brief", "",
      "**Scene:** " + (safeLine(state.scene) || "Untitled scene"),
      "**Performers:** " + safeLine(state.aName) + " / " + safeLine(state.bName),
      "**Planned shots:** " + state.shots.length,
      "",
      "## Staging notes", "",
      "Coordinates are relative values on a 960 × 600 schematic, not measured metres or an accurate 3D reconstruction.",
      "Keep fixed references for performer identity, wardrobe, props, light and environment across shots.",
      "Camera orientation aims approximately toward the midpoint between performers.",
      ""
    ];
    state.shots.forEach(function (shot, index) {
      var side = axisInfo(shot), proj = screenOrder(shot);
      lines.push("## Shot " + String(index + 1).padStart(2, "0") + " · " + prettySize(shot.size), "");
      lines.push("- **Story beat:** " + (safeLine(shot.intent) || "Not specified"));
      lines.push("- **Camera language:** " + shot.move);
      lines.push("- **Camera side:** " + side.label + " of the action axis");
      lines.push("- **Approximate screen order:** " + proj);
      lines.push("- **Blocking positions:** " + safeLine(state.aName) + " (" + Math.round(shot.a.x) + "," + Math.round(shot.a.y) + "), " + safeLine(state.bName) + " (" + Math.round(shot.b.x) + "," + Math.round(shot.b.y) + ")");
      lines.push("- **Camera plan:** (" + Math.round(shot.cam.x) + "," + Math.round(shot.cam.y) + "), oriented toward the performers' midpoint");
      lines.push("- **Generation direction:** " + prettySize(shot.size).toLowerCase() + " framing; " + shot.move.toLowerCase() + " camera; maintain established performer identity, scene geography, light direction and action state.");
      lines.push("");
    });
    lines.push("## Cut preflight", "");
    var cuts = cutChecks();
    if (!cuts.length) lines.push("Capture two or more shots to review cuts.");
    cuts.forEach(function (cut) {
      lines.push("**Shot " + cut.from + " → " + cut.to + "**");
      if (!cut.flags.length) lines.push("- No geometric continuity flags detected. Check actual eyelines, movement, lighting, colour and sound.");
      cut.flags.forEach(function (flag) { lines.push("- " + flag); });
      lines.push("");
    });
    lines.push("## Final human review", "");
    lines.push("- [ ] Character, wardrobe, prop and environment consistency");
    lines.push("- [ ] Eyeline, geography, action and motion continuity");
    lines.push("- [ ] Lens / shot-size intention and edit rhythm");
    lines.push("- [ ] Light direction, exposure, colour balance and texture");
    lines.push("- [ ] Dialogue, ambience, room tone, effects and sound bridges");
    lines.push("- [ ] Brand accuracy, source permissions and delivery requirements");
    lines.push("");
    lines.push("AXIS LAB is a creative planning tool, not AI analysis. A possible issue is a discussion prompt, not a verified defect.");
    lines.push("Generated locally in the browser. No video or production content was uploaded.");
    return lines.join("\n");
  }
  function download(name, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1200);
  }
  function slug(value) { return (value || "scene").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "scene"; }
  el("downloadBrief").addEventListener("click", function () {
    download("axis-lab-" + slug(state.scene) + "-brief.md", brief(), "text/markdown;charset=utf-8");
    notify("Production brief downloaded.");
  });
  el("copyBrief").addEventListener("click", async function () {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(brief());
      notify("Production brief copied to clipboard.");
    } catch (error) { notify("Clipboard access unavailable here. Download the Markdown brief instead.", true); }
  });
  el("saveProject").addEventListener("click", function () {
    var payload = Object.assign({ format: "axis-lab-project" }, state);
    download("axis-lab-" + slug(state.scene) + ".json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
    notify("Editable project JSON downloaded. It contains your scene notes.");
  });
  el("loadProject").addEventListener("click", function () { el("importFile").click(); });
  el("importFile").addEventListener("change", async function (event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 500000) throw new Error("Project file is too large (500 KB limit).");
      var loaded = sanitize(JSON.parse(await file.text()));
      state = loaded; syncInputs(); render(); save();
      notify("Project loaded. All shots are ready to edit.");
    } catch (error) { notify(error.message || "Could not open this project.", true); }
    event.target.value = "";
  });
  el("reset").addEventListener("click", function () {
    if ((state.shots.length || state.scene) && !window.confirm("Start a new scene? Export a JSON backup first if you want to keep this work.")) return;
    state = initialState(); syncInputs(); render(); save(); notify("New scene ready.");
  });
  syncInputs(); render();
})();
