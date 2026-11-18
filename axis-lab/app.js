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

  var GRID_PIXELS = 80;
  var MAX_SUBJECTS = 8;
  var SWATCHES = ["#a2d5bd", "#d8a18d", "#adc0ef", "#e7cf88", "#c2aae4", "#ecb7bd", "#9fc8ca", "#d6c4a5"];
  function defaultSubjects() {
    return [{ id: "a", name: "Performer A", x: 390, y: 300 },
            { id: "b", name: "Performer B", x: 570, y: 300 }];
  }
  function initialState() {
    return {
      version: 2, scene: "", aName: "Performer A", bName: "Performer B",
      a: { x: 390, y: 300 }, b: { x: 570, y: 300 }, cam: { x: 480, y: 520 },
      subjects: defaultSubjects(), nextSubjectIndex: 2, gridMetres: 1,
      size: "medium", move: "Locked-off", intent: "", shots: [], active: -1
    };
  }
  var allowedSizes = ["wide", "medium", "close"];
  var allowedMoves = ["Locked-off", "Handheld", "Dolly", "Gimbal", "FPV / drone", "Orbit"];
  var gridOptions = [0.5, 1, 2];
  function subjectLabel(id) { return String(id || "?").toUpperCase(); }
  function normalizeSubjects(raw, fallback) {
    var source = Array.isArray(raw) && raw.length ? raw : fallback;
    var used = {};
    var subjects = [];
    source.slice(0, MAX_SUBJECTS).forEach(function (entry, index) {
      if (!entry || typeof entry !== "object") return;
      var id = trimmed(entry.id, 6, "") || String.fromCharCode(97 + index);
      if (!/^[a-z][a-z0-9]*$/.test(id) || used[id]) return;
      used[id] = true;
      var location = point(entry, { x: 390 + index * 30, y: 300 });
      subjects.push({ id: id, name: trimmed(entry.name, 50, "") || "Performer " + subjectLabel(id), x: location.x, y: location.y });
    });
    return subjects.length ? subjects : defaultSubjects();
  }
  function legacySubjects(raw) {
    var base = initialState();
    return [{ id: "a", name: trimmed(raw.aName, 50, base.aName) || base.aName, x: point(raw.a, base.a).x, y: point(raw.a, base.a).y },
            { id: "b", name: trimmed(raw.bName, 50, base.bName) || base.bName, x: point(raw.b, base.b).x, y: point(raw.b, base.b).y }];
  }
  function safeShot(raw) {
    if (!raw || typeof raw !== "object") return null;
    var base = initialState();
    var cast = normalizeSubjects(raw.subjects, legacySubjects(raw));
    return {
      subjects: cast, a: { x: cast[0].x, y: cast[0].y },
      b: cast.length > 1 ? { x: cast[1].x, y: cast[1].y } : { x: cast[0].x, y: cast[0].y },
      cam: point(raw.cam, base.cam),
      gridMetres: gridOptions.includes(Number(raw.gridMetres)) ? Number(raw.gridMetres) : 1,
      size: allowedSizes.includes(raw.size) ? raw.size : "medium",
      move: allowedMoves.includes(raw.move) ? raw.move : "Locked-off",
      intent: trimmed(raw.intent, 400, "")
    };
  }
  function sanitize(raw) {
    if (!raw || typeof raw !== "object" || (![1, 2].includes(raw.version) && raw.format !== "axis-lab-project")) throw new Error("This is not an AXIS LAB project.");
    var base = initialState();
    var cast = normalizeSubjects(raw.subjects, legacySubjects(raw));
    var cleaned = {
      version: 2, scene: trimmed(raw.scene, 100, ""),
      aName: cast[0].name, bName: cast[1] ? cast[1].name : "",
      subjects: cast, nextSubjectIndex: Math.max(2, Math.min(26, Math.max(...cast.map(function (x) { return x.id.charCodeAt(0) - 96; })))),
      a: { x: cast[0].x, y: cast[0].y },
      b: cast[1] ? { x: cast[1].x, y: cast[1].y } : { x: cast[0].x, y: cast[0].y },
      cam: point(raw.cam, base.cam),
      gridMetres: gridOptions.includes(Number(raw.gridMetres)) ? Number(raw.gridMetres) : 1,
      size: allowedSizes.includes(raw.size) ? raw.size : "medium",
      move: allowedMoves.includes(raw.move) ? raw.move : "Locked-off",
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
  function syncLegacy() {
    var first = state.subjects[0], second = state.subjects[1] || first;
    state.a = { x: first.x, y: first.y };
    state.b = { x: second.x, y: second.y };
    state.aName = first.name;
    state.bName = state.subjects[1] ? second.name : "";
  }
  function syncInputs() {
    el("sceneName").value = state.scene;
    el("shotSize").value = state.size;
    el("cameraMove").value = state.move;
    el("shotIntent").value = state.intent;
    el("gridMetres").value = String(state.gridMetres);
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
  function metres(a, b, shot) { return distance(a, b) / GRID_PIXELS * (shot.gridMetres || 1); }
  function measure(m) { return (Math.round(m * 10) / 10).toFixed(1) + " m"; }
  function midPoint(subjects) {
    var n = subjects.length || 1;
    return { x: subjects.reduce(function (sum, p) { return sum + p.x; }, 0) / n,
             y: subjects.reduce(function (sum, p) { return sum + p.y; }, 0) / n };
  }
  function axisInfo(shot) {
    var subjects = shot.subjects || legacySubjects(shot);
    if (subjects.length < 2) return { side: 0, label: "Add second subject", offset: 0 };
    var a = subjects[0], b = subjects[1];
    var ax = b.x - a.x, ay = b.y - a.y;
    var length = Math.hypot(ax, ay);
    if (length < 75) return { side: 0, label: "Unclear axis", offset: 0 };
    var cross = ax * (shot.cam.y - a.y) - ay * (shot.cam.x - a.x);
    var offset = cross / length;
    return { side: Math.abs(offset) < 28 ? 0 : (offset > 0 ? 1 : -1),
      label: Math.abs(offset) < 28 ? "On action axis" : (offset > 0 ? "Side 1" : "Side 2"), offset: offset };
  }
  function projection(shot) {
    var subjects = shot.subjects || legacySubjects(shot);
    var target = midPoint(subjects);
    var cam = shot.cam;
    var dx = target.x - cam.x, dy = target.y - cam.y;
    var len = Math.hypot(dx, dy);
    if (len < 15) { dx = 0; dy = -1; len = 1; }
    var f = { x: dx / len, y: dy / len }, right = { x: -f.y, y: f.x };
    var fov = (shot.size === "wide" ? 90 : shot.size === "close" ? 43 : 68) * Math.PI / 180;
    var tanH = Math.tan(fov / 2), tanV = tanH * 9 / 16;
    var meter = (shot.gridMetres || 1) / GRID_PIXELS;
    var targetDepth = Math.max(0.3, len * meter);
    var tilt = (1.6 - 0.85) / targetDepth;
    return subjects.map(function (subject, index) {
      var relx = subject.x - cam.x, rely = subject.y - cam.y;
      var depth = relx * f.x + rely * f.y, lateral = relx * right.x + rely * right.y;
      var dm = depth * meter;
      var visible = dm > 0.10;
      var safeDepth = Math.max(dm, 0.25);
      var x = 50 + (lateral * meter / (2 * safeDepth * tanH)) * 100;
      var h = 1.7 / (2 * safeDepth * tanV) * 100;
      var footY = 50 + ((1.6 - tilt * safeDepth) / (2 * safeDepth * tanV)) * 100;
      var width = 0.58 / (2 * safeDepth * tanH) * 100;
      return { id: subject.id, name: subject.name, x: x, height: Math.min(h, 280),
        width: Math.min(width, 65), bottom: 100 - footY,
        distance: metres(subject, cam, shot), depth: dm, visible: visible,
        inFrame: visible && x + width / 2 > 0 && x - width / 2 < 100 && footY - h < 100 && footY > 0,
        color: SWATCHES[index % SWATCHES.length] };
    });
  }
  function screenProjection(shot) {
    var result = {};
    projection(shot).forEach(function (s) { result[s.id] = s.x; });
    return result;
  }
  function currentShot() {
    syncLegacy();
    return {
      subjects: state.subjects.map(function (p) { return { id: p.id, name: p.name, x: p.x, y: p.y }; }),
      a: { x: state.a.x, y: state.a.y }, b: { x: state.b.x, y: state.b.y },
      cam: { x: state.cam.x, y: state.cam.y }, gridMetres: state.gridMetres,
      size: state.size, move: state.move, intent: state.intent
    };
  }
  function persistActive() {
    if (state.active >= 0 && state.active < state.shots.length) state.shots[state.active] = currentShot();
  }
  function prettySize(value) { return value === "wide" ? "Wide" : value === "close" ? "Close" : "Medium"; }
  function shortName(value) { return (value || "").slice(0, 16).toUpperCase(); }
  function screenOrder(shot) {
    var onscreen = projection(shot).filter(function (p) { return p.inFrame; }).sort(function (a,b) { return a.x-b.x; });
    if (!onscreen.length) return "No subjects in frame";
    if (onscreen.length === 1) return subjectLabel(onscreen[0].id) + " in frame";
    return onscreen.map(function (p) { return subjectLabel(p.id); }).join(" left → right ");
  }


  var svgNS = "http://www.w3.org/2000/svg";
  var subjectNodes = {};
  function svgNode(tag, attrs, content) {
    var node = document.createElementNS(svgNS, tag);
    Object.keys(attrs || {}).forEach(function (name) { node.setAttribute(name, attrs[name]); });
    if (content != null) node.textContent = String(content);
    return node;
  }
  function makeFloorSubject(subject, index) {
    var group = svgNode("g", {
      "id": "handle" + subjectLabel(subject.id), "data-subject-id": subject.id,
      "class": "floor-handle " + (index === 0 ? "performer-a" : index === 1 ? "performer-b" : "performer-extra"),
      "tabindex": "0", "role": "button",
      "aria-label": "Move " + subject.name + " using finger, mouse or arrow keys"
    });
    var zone = svgNode("circle", { r: 63, "class": "touch-zone", fill: "transparent", "pointer-events": "all" });
    var ring = svgNode("circle", { r: 31, "class": "handle-ring" });
    var core = svgNode("circle", { r: 19, "class": "handle-core" });
    var letter = svgNode("text", { "class": "handle-letter", "text-anchor": "middle", y: 6 }, subjectLabel(subject.id));
    var caption = svgNode("text", { "class": "handle-caption", "text-anchor": "middle", y: 58 }, shortName(subject.name));
    group.appendChild(zone); group.appendChild(ring); group.appendChild(core); group.appendChild(letter); group.appendChild(caption);
    group._caption = caption;
    group._letter = letter;
    group.addEventListener("keydown", function (event) {
      var directions = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
      if (!directions[event.key]) return;
      event.preventDefault();
      setTool(subject.id);
      var p = state.subjects.find(function (x) { return x.id === subject.id; });
      if (!p) return;
      var delta = directions[event.key], loc = point({ x: p.x + delta[0], y: p.y + delta[1] }, p);
      p.x = loc.x; p.y = loc.y;
      persistActive(); render(); save();
    });
    return group;
  }
  function redrawFloor() {
    var cast = state.subjects, cam = state.cam, a = cast[0], b = cast[1];
    el("handleCam").setAttribute("transform", "translate(" + cam.x + " " + cam.y + ")");
    el("handleCam").setAttribute("data-selected", String(activeTool === "cam"));
    var layer = el("subjectsLayer");
    Object.keys(subjectNodes).forEach(function (id) {
      if (!cast.some(function (p) { return p.id === id; })) {
        if (subjectNodes[id].parentNode) subjectNodes[id].parentNode.removeChild(subjectNodes[id]);
        delete subjectNodes[id];
      }
    });
    cast.forEach(function (subject, index) {
      var node = subjectNodes[subject.id];
      if (!node) {
        node = makeFloorSubject(subject, index);
        subjectNodes[subject.id] = node;
        layer.appendChild(node);
      }
      node.setAttribute("transform", "translate(" + subject.x + " " + subject.y + ")");
      node.setAttribute("data-selected", String(activeTool === subject.id));
      node.setAttribute("style", "color:" + SWATCHES[index % SWATCHES.length]);
      node.setAttribute("aria-label", "Move " + subject.name + " using finger, mouse or arrow keys");
      node._caption.textContent = shortName(subject.name);
      node._letter.textContent = subjectLabel(subject.id);
    });
    var axisVisible = !!b;
    ["axisExtended","axisSolid","axisLabel"].forEach(function (id) { el(id).style.opacity = axisVisible ? "1" : "0"; });
    if (b) {
      el("axisSolid").setAttribute("x1", a.x); el("axisSolid").setAttribute("y1", a.y);
      el("axisSolid").setAttribute("x2", b.x); el("axisSolid").setAttribute("y2", b.y);
      var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      var ux = dx / len, uy = dy / len;
      el("axisExtended").setAttribute("x1", a.x - ux * 1000);
      el("axisExtended").setAttribute("y1", a.y - uy * 1000);
      el("axisExtended").setAttribute("x2", b.x + ux * 1000);
      el("axisExtended").setAttribute("y2", b.y + uy * 1000);
      el("axisLabel").setAttribute("x", (a.x + b.x) / 2);
      el("axisLabel").setAttribute("y", (a.y + b.y) / 2 - 22);
      el("axisLabel").textContent = "ACTION AXIS " + subjectLabel(a.id) + " / " + subjectLabel(b.id);
    }
    var mid = midPoint(cast), lenCam = distance(mid, cam) || 1;
    var perpX = (mid.y - cam.y) / lenCam, perpY = -(mid.x - cam.x) / lenCam;
    var radius = Math.min(155, lenCam * .65);
    el("cameraCone").setAttribute("d", "M " + cam.x + " " + cam.y +
      " L " + (mid.x + perpX * radius) + " " + (mid.y + perpY * radius) +
      " L " + (mid.x - perpX * radius) + " " + (mid.y - perpY * radius) + " Z");
    var past = el("priorCameras");
    past.replaceChildren();
    state.shots.forEach(function (shot, index) {
      var circle = svgNode("circle", {cx:shot.cam.x,cy:shot.cam.y,r:9,
        fill:index === state.active ? "#e2c38d" : "#879e96",
        "fill-opacity":index === state.active ? ".78" : ".32",
        stroke:"#f2eee5","stroke-opacity":".40"});
      circle.appendChild(svgNode("title",{},"Position " + (index + 1)));
      past.appendChild(circle);
    });
    var labels = el("rulerLabels").children;
    for (var i = 0; i < labels.length; i++) {
      labels[i].textContent = (i === 0 ? "0" : String(i * state.gridMetres)) + (i === 3 ? " m" : "");
    }
  }
  function redrawMonitor() {
    var shot = currentShot(), people = projection(shot), info = axisInfo(shot);
    var layer = el("previewSubjects");
    layer.replaceChildren();
    people.slice().sort(function (a,b) { return b.depth - a.depth; }).forEach(function (p, index) {
      if (!p.visible) return;
      var node = element("div", "subject " + (p.id === "a" ? "subject-a" : p.id === "b" ? "subject-b" : "subject-extra"));
      node.style.left = p.x + "%";
      node.style.height = p.height + "%";
      node.style.width = p.width + "%";
      node.style.bottom = p.bottom + "%";
      node.style.zIndex = String(1000 - index);
      node.style.setProperty("--subject-color", p.color);
      node.appendChild(element("div","subject-head"));
      node.appendChild(element("div","subject-body"));
      node.appendChild(element("b","",subjectLabel(p.id)));
      layer.appendChild(node);
    });
    el("screenOrder").textContent = screenOrder(shot).toUpperCase();
    el("axisStatus").textContent = info.label.toUpperCase();
    el("cameraSide").textContent = info.label;
    el("coverageLabel").textContent = prettySize(state.size);
    el("frameBottom").textContent = prettySize(state.size).toUpperCase() + " · " + state.move.toUpperCase() + " · DEPTH PREVIEW";
    var guidance = state.shots.length ? "Review your saved positions" : "Add position 1 to start";
    var tip = "Farther performers appear smaller. The first two subjects define the action axis. Moving the camera across it may reverse screen direction.";
    if (shot.subjects.length < 2) {
      guidance = "Add a second subject for axis checks";
      tip = "A solo setup has no performer-to-performer action axis. You can still plan framing and distances.";
    } else if (distance(shot.subjects[0], shot.subjects[1]) < 75) {
      guidance = "Separate first two subjects";
      tip = "Move the first two subjects apart to establish a useful action axis.";
    } else if (info.side === 0) {
      guidance = "Camera near action axis";
      tip = "A neutral view can be intentional. Verify eyelines and screen direction in generated frames.";
    } else if (state.shots.length && state.active < 0) {
      var lastSide = axisInfo(state.shots[state.shots.length - 1]).side;
      if (lastSide && lastSide !== info.side) {
        guidance = "Possible axis crossing";
        tip = "This position crosses the action axis from your last saved shot. Check whether the move is motivated.";
      }
    }
    var outOfFrame = people.filter(function (p) { return !p.inFrame; });
    if (outOfFrame.length) guidance = outOfFrame.length + " subject" + (outOfFrame.length > 1 ? "s" : "") + " outside frame";
    el("guidanceLabel").textContent = guidance;
    el("directionTip").textContent = tip;
    redrawDistances(shot, people);
  }
  function redrawDistances(shot, people) {
    var container = el("distanceReadouts");
    container.replaceChildren();
    people.forEach(function (person) {
      var row = element("div", "distance-line");
      row.appendChild(element("span", "", "CAM → " + subjectLabel(person.id) + " · " + person.name));
      var value = element("strong", "", measure(person.distance));
      if (!person.inFrame) value.title = "Outside the camera preview";
      row.appendChild(value);
      container.appendChild(row);
    });
    if (shot.subjects.length >= 2) {
      var betweenLine = element("div","distance-line between-line");
      betweenLine.appendChild(element("span","","" + subjectLabel(shot.subjects[0].id) + " ↔ " + subjectLabel(shot.subjects[1].id) + " · first two subjects"));
      betweenLine.appendChild(element("strong","",measure(metres(shot.subjects[0],shot.subjects[1],shot))));
      container.appendChild(betweenLine);
    }
    el("scaleExplain").textContent = "1 grid square = " + state.gridMetres + " m. These are planned ground distances, not measurements of a real location.";
  }
  function element(tag, className, textValue) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (textValue != null) node.textContent = textValue;
    return node;
  }

  function renderSubjectControls() {
    var holder = el("subjectControls");
    holder.replaceChildren();
    el("subjectCount").textContent = "(" + state.subjects.length + "/" + MAX_SUBJECTS + ")";
    el("addSubject").disabled = state.subjects.length >= MAX_SUBJECTS || state.nextSubjectIndex >= 26;
    state.subjects.forEach(function (subject, index) {
      var row = element("div", "subject-edit-row");
      var label = element("label","",subjectLabel(subject.id));
      label.style.color = SWATCHES[index % SWATCHES.length];
      var input = element("input","");
      input.type = "text"; input.maxLength = 50; input.value = subject.name;
      input.setAttribute("aria-label", "Name for performer " + subjectLabel(subject.id));
      input.addEventListener("input", function () {
        subject.name = input.value.slice(0,50);
        syncLegacy(); persistActive(); redrawFloor(); redrawMonitor(); save();
      });
      row.appendChild(label); row.appendChild(input);
      var remove = element("button", "remove-subject", "×");
      remove.type = "button"; remove.title = "Remove " + subject.name;
      remove.setAttribute("aria-label", "Remove " + subject.name);
      remove.disabled = state.subjects.length <= 1;
      remove.addEventListener("click", function () {
        if (state.subjects.length <= 1) return;
        state.subjects = state.subjects.filter(function (p) { return p.id !== subject.id; });
        if (activeTool === subject.id) activeTool = "cam";
        syncLegacy(); persistActive(); render(); save();
        notify(subject.name + " removed from this position.");
      });
      row.appendChild(remove); holder.appendChild(row);
    });
    var place = el("subjectPlaceButtons");
    place.replaceChildren();
    state.subjects.forEach(function (p, index) {
      var button = element("button", "");
      button.type = "button"; button.id = "place" + subjectLabel(p.id);
      button.setAttribute("aria-pressed", String(activeTool === p.id));
      var dot = element("span", "selector-dot");
      dot.style.backgroundColor = SWATCHES[index % SWATCHES.length];
      button.appendChild(dot);
      button.appendChild(document.createTextNode(" " + subjectLabel(p.id)));
      button.title = "Place " + p.name;
      button.setAttribute("aria-label", "Place " + p.name);
      button.addEventListener("click", function () { setTool(p.id); });
      place.appendChild(button);
    });
    setTool(activeTool);
  }
  function restoreShot(index) {
    var shot = state.shots[index];
    if (!shot) return;
    state.subjects = normalizeSubjects(shot.subjects, legacySubjects(shot));
    state.cam = point(shot.cam, state.cam);
    state.gridMetres = shot.gridMetres || 1;
    state.size = shot.size;
    state.move = shot.move;
    state.intent = shot.intent;
    state.active = index;
    if (activeTool !== "cam" && !state.subjects.some(function(p) { return p.id === activeTool; })) activeTool = "cam";
    syncLegacy(); syncInputs(); render(); save();
    notify("Position " + (index + 1) + " restored. Edit its markers to update this position.");
  }
  function renderTabs() {
    var tabs = el("shotTabs");
    tabs.replaceChildren();
    if (!state.shots.length) tabs.appendChild(element("span","position-empty","LIVE"));
    state.shots.forEach(function (shot, index) {
      var tab = element("button", "position-tab" + (index === state.active ? " selected" : ""), String(index + 1));
      tab.type = "button"; tab.title = "Open shot position " + (index + 1);
      tab.setAttribute("aria-label", "Open saved position " + (index + 1));
      tab.setAttribute("aria-pressed", String(index === state.active));
      tab.addEventListener("click", function() { restoreShot(index); });
      tabs.appendChild(tab);
    });
    el("newPosition").disabled = state.shots.length >= MAX_SHOTS;
  }
  function renderShots() {
    var list = el("shotList");
    list.replaceChildren();
    el("shotCount").textContent = "(" + state.shots.length + " shot" + (state.shots.length === 1 ? "" : "s") + ")";
    if (!state.shots.length) {
      list.appendChild(element("div", "empty-coverage", "No positions captured yet. Stage the scene, then press + Position above the preview."));
      return;
    }
    state.shots.forEach(function (shot, index) {
      var wrap = element("div", "shot-wrap");
      var button = element("button", "shot-card" + (index === state.active ? " is-active" : ""));
      button.type = "button";
      button.setAttribute("aria-label", "Restore setup from shot " + (index + 1));
      var mini = element("div", "mini-scene");
      projection(shot).slice().sort(function(a,b){return b.depth - a.depth;}).forEach(function (p) {
        if (!p.visible) return;
        var talent = element("div", "mini-talent");
        talent.style.left = p.x + "%";
        talent.style.height = Math.max(14, p.height / 100 * 78) + "px";
        talent.style.bottom = p.bottom / 100 * 78 + "px";
        talent.style.backgroundColor = p.color;
        mini.appendChild(talent);
      });
      var meta = element("div", "shot-meta");
      meta.appendChild(element("strong", "", "SHOT " + String(index + 1).padStart(2, "0")));
      meta.appendChild(element("span", "", prettySize(shot.size)));
      var info = element("div", "shot-info");
      info.appendChild(element("span", "", shot.move.toUpperCase()));
      info.appendChild(element("span", "", axisInfo(shot).label.toUpperCase()));
      button.appendChild(mini); button.appendChild(meta); button.appendChild(info);
      button.addEventListener("click", function () { restoreShot(index); });
      var remove = element("button", "shot-remove", "×");
      remove.type = "button"; remove.title = "Remove shot " + (index + 1);
      remove.setAttribute("aria-label", "Remove shot " + (index + 1));
      remove.addEventListener("click", function () {
        state.shots.splice(index, 1);
        if (state.active === index) state.active = -1;
        else if (state.active > index) state.active -= 1;
        render(); save(); notify("Shot position removed.");
      });
      wrap.appendChild(button); wrap.appendChild(remove); list.appendChild(wrap);
    });
  }
  function cutChecks() {
    var results = [];
    for (var i = 1; i < state.shots.length; i++) {
      var before = state.shots[i-1], after = state.shots[i];
      var prev = axisInfo(before), next = axisInfo(after);
      var left = before.subjects || legacySubjects(before), right = after.subjects || legacySubjects(after);
      var flags = [];
      var moved = false, unmatched = false;
      left.forEach(function (p) {
        var counterpart = right.find(function(q){return q.id === p.id;});
        if (!counterpart) unmatched = true;
        else if (distance(p,counterpart)>35) moved = true;
      });
      right.forEach(function(p){if (!left.some(function(q){return q.id === p.id;})) unmatched = true;});
      if (unmatched) flags.push("The subjects present change between shots. Check entrances, exits and action continuity.");
      if (moved) flags.push("Performer blocking changed between snapshots. Check that a motivated move explains the change.");
      var sameAxis = left.length >= 2 && right.length >= 2 && left[0].id === right[0].id && left[1].id === right[1].id;
      if (sameAxis && (prev.side === 0 || next.side === 0)) flags.push("A camera is on or near the action axis. Confirm eyelines and screen direction in actual shots.");
      else if (sameAxis && prev.side !== next.side) flags.push("Possible 180° line crossing. Screen order may reverse. Motivate the move or add a neutral shot.");
      if (!flags.length && before.size === after.size && distance(before.cam,after.cam)<85)
        flags.push("Similar camera position and framing. Consider a more distinct cut if it would serve the scene.");
      results.push({from:i,to:i+1,flags:flags});
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
      (report.flags.length ? report.flags : ["No simple blocking or action-axis issue detected. Check lighting, movement, colour and sound in the finished shots."]).forEach(function (message) {
        copy.appendChild(element("p", "", message));
      });
      card.appendChild(copy); result.appendChild(card);
    });
  }
  function render() {
    renderSubjectControls(); redrawFloor(); redrawMonitor(); renderShots(); renderTabs(); renderChecks();
    el("capture").disabled = state.shots.length >= MAX_SHOTS;
  }
  function pointerPosition(event) {
    var matrix = floor.getScreenCTM();
    if (!matrix) return null;
    var screenPoint = floor.createSVGPoint();
    screenPoint.x = event.clientX;
    screenPoint.y = event.clientY;
    var coordinates = screenPoint.matrixTransform(matrix.inverse());
    return point(coordinates, state.cam);
  }

  // Selecting a tool lets phone users tap anywhere on the floor rather than
  // trying to grab a small SVG marker. This also works with a mouse.
  var activeTool = "cam";

  function setTool(field) {
    if (field !== "cam" && !state.subjects.some(function(p){return p.id === field;})) return;
    activeTool = field;
    el("placeCam").setAttribute("aria-pressed", String(field === "cam"));
    el("handleCam").setAttribute("data-selected", String(field === "cam"));
    var buttons = el("subjectPlaceButtons").children;
    for (var i=0;i<buttons.length;i++) {
      var id = buttons[i].id.replace(/^place/,"").toLowerCase();
      buttons[i].setAttribute("aria-pressed", String(id === field));
    }
    Object.keys(subjectNodes).forEach(function (id) {
      subjectNodes[id].setAttribute("data-selected", String(field === id));
    });
    var subject = state.subjects.find(function(p){return p.id === field;});
    var name = field === "cam" ? "Camera" : subject.name;
    el("floorHelp").textContent = name + " selected. Tap on the floor to place it, or drag the marker.";
  }
  el("placeCam").addEventListener("click",function(){setTool("cam");});
  function handleField(target) {
    while (target && target !== floor) {
      if (target.id === "handleCam") return "cam";
      if (target.getAttribute) {
        var id = target.getAttribute("data-subject-id");
        if (id && state.subjects.some(function(p){return p.id === id;})) return id;
      }
      target = target.parentNode;
    }
    return null;
  }
  function setPosition(field, event, finish) {
    var p = pointerPosition(event);
    if (!p) return;
    if (field === "cam") state.cam = p;
    else {
      var subject = state.subjects.find(function(s){return s.id === field;});
      if (!subject) return;
      subject.x = p.x; subject.y = p.y;
    }
    syncLegacy();
    if (finish) { persistActive(); render(); save(); }
    else { redrawFloor(); redrawMonitor(); }
  }
  var draggingPointer = null;
  floor.addEventListener("pointerdown", function (event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (draggingPointer !== null) return;
    var field = handleField(event.target) || activeTool;
    event.preventDefault();
    setTool(field);
    draggingPointer = { id: event.pointerId, field: field };
    setPosition(field, event, false);
    try { if (floor.setPointerCapture) floor.setPointerCapture(event.pointerId); } catch (error) { /* window fallback */ }
  });
  function movePointer(event) {
    if (!draggingPointer || event.pointerId !== draggingPointer.id) return;
    if (event.cancelable) event.preventDefault();
    setPosition(draggingPointer.field, event, false);
  }
  function stopPointer(event) {
    if (!draggingPointer || event.pointerId !== draggingPointer.id) return;
    var field = draggingPointer.field;
    draggingPointer = null;
    if (event.type !== "pointercancel") setPosition(field, event, true);
    else { persistActive(); render(); save(); }
    try { if (floor.hasPointerCapture && floor.hasPointerCapture(event.pointerId)) floor.releasePointerCapture(event.pointerId); } catch (error) {}
  }
  window.addEventListener("pointermove", movePointer);
  window.addEventListener("pointerup", stopPointer);
  window.addEventListener("pointercancel", stopPointer);
  el("handleCam").addEventListener("keydown", function (event) {
    var directions = { ArrowLeft: [-12,0], ArrowRight: [12,0], ArrowUp: [0,-12], ArrowDown: [0,12] };
    if (!directions[event.key]) return;
    event.preventDefault(); setTool("cam");
    var d = directions[event.key];
    state.cam = point({ x:state.cam.x+d[0],y:state.cam.y+d[1] }, state.cam);
    persistActive(); render(); save();
  });

  function updateField(id, field, max) {
    el(id).addEventListener("input", function (event) {
      state[field] = max ? event.target.value.slice(0,max) : event.target.value;
      if (field !== "scene") persistActive();
      if (field === "size" || field === "move") render();
      save();
    });
  }
  updateField("sceneName", "scene", 100);
  updateField("shotSize", "size");
  updateField("cameraMove", "move");
  updateField("shotIntent", "intent", 400);
  el("gridMetres").addEventListener("change", function(event) {
    var value = Number(event.target.value);
    if (!gridOptions.includes(value)) return;
    state.gridMetres = value; persistActive(); render(); save();
  });
  el("addSubject").addEventListener("click", function() {
    if (state.subjects.length >= MAX_SUBJECTS || state.nextSubjectIndex >= 26) return;
    var id = String.fromCharCode(97 + state.nextSubjectIndex++);
    var n = state.subjects.length;
    var loc = point({x:480+(n%3-1)*75, y:210+(n%2)*75},state.cam);
    state.subjects.push({id:id,name:"Performer " + subjectLabel(id),x:loc.x,y:loc.y});
    syncLegacy(); persistActive(); render(); save(); setTool(id);
    notify("Added performer " + subjectLabel(id) + ". Tap the floor to place them.");
  });
  function capturePosition() {
    if (state.shots.length >= MAX_SHOTS) { notify("Maximum 60 saved shot positions. Export your project before starting another.", true); return; }
    state.shots.push(currentShot());
    state.active = state.shots.length - 1;
    render(); save();
    notify("Position " + state.shots.length + " saved. Changes to this tab update its shot.");
    var list = el("shotList"); list.scrollLeft = list.scrollWidth;
  }
  el("capture").addEventListener("click", capturePosition);
  el("newPosition").addEventListener("click", capturePosition);

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
  syncInputs(); setTool("cam"); render();
})();
