/* AXIS LAB v3 smoke test. Run: node axis-lab/tests/smoke.cjs */
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const registered = {};
const downloaded = [];
const local = {};
function ctx2d() {
  return new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      return function() {};
    },
    set(target,key,value) { target[key]=value; return true; }
  });
}
class Node {
  constructor(tag) {
    this.tag = tag; this.id = ""; this.children = []; this.parentNode = null;
    this.events = {}; this.style = {setProperty(k,v){this[k]=v;}};
    this.attrs = {}; this.value = ""; this.textContent = "";
    this.scrollLeft = 0; this.scrollWidth = 800; this.files = null;
  }
  addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
  async trigger(type, details = {}) {
    const event = {target: this, type, pointerId: 1, preventDefault(){}, cancelable:true, ...details};
    return Promise.all((this.events[type] || []).map(fn=>fn(event)));
  }
  setAttribute(k,v) {
    this.attrs[k] = String(v);
    if(k === "id") {this.id=String(v);registered[this.id]=this;}
  }
  getAttribute(k) {return this.attrs[k] || null;}
  appendChild(node) {this.children.push(node);node.parentNode=this;return node;}
  replaceChildren(...children) {
    this.children.forEach(n=>{n.parentNode=null;});
    this.children=children;
    this.children.forEach(n=>{n.parentNode=this;});
  }
  removeChild(child) {this.children=this.children.filter(n=>n!==child);child.parentNode=null;}
  setPointerCapture(){}
  click(){return this.trigger("click");}
  remove(){}
}
const document = {
  getElementById(id) {return registered[id] ||= new Node(id);},
  createTextNode(text) {const n=new Node("text");n.textContent=String(text);return n;},
  createElement(tag) {
    const n=new Node(tag);
    if(tag==="a")n.click=()=>{downloaded.push({name:n.download,url:n.href});};
    if(tag==="canvas"){
      n.getContext=()=>ctx2d();
      n.toBlob=fn=>fn({size:1200,type:"image/png"});
    }
    return n;
  },
  createElementNS(uri,tag) {return new Node(tag);},
  body: new Node("body")
};
const floor = document.getElementById("floor");
floor.getScreenCTM = () => ({inverse:()=>({})});
floor.createSVGPoint = () => ({x:0,y:0,matrixTransform(){return{x:this.x,y:this.y};}});
const browserWindow = new Node("window");
browserWindow.confirm=()=>true;
const env = {
  document, window: browserWindow,
  localStorage:{getItem:k=>local[k]??null,setItem:(k,v)=>{local[k]=v;}},
  navigator:{clipboard:{writeText:async t=>{local.copied=t;}}},
  URL:{createObjectURL:()=>"blob:test",revokeObjectURL:()=>{}},
  Blob:class{constructor(data){this.data=data;}},
  setTimeout:()=>1,clearTimeout:()=>{},
  console,
};
const storage=()=>JSON.parse(local["aiverse-axis-lab-v1"]);
const pressFloor=async(x,y,id=1,target=floor)=>{
  await floor.trigger("pointerdown",{pointerType:"touch",pointerId:id,clientX:x,clientY:y,target});
  await browserWindow.trigger("pointerup",{pointerId:id,clientX:x,clientY:y,type:"pointerup"});
};
async function main(){
  assert(html.includes('id="subjectControls"'));
  assert(html.includes('id="saveDiagram"') && html.includes('id="newPosition"') && html.includes('id="gridMetres"'));
  assert(css.includes("@media(max-width:560px)"));
  assert(!app.includes("fetch(") && !app.includes("XMLHttpRequest"));
  assert(!app.includes("—") && !html.includes("—") && !css.includes("—"));
  vm.runInNewContext(app,env,{filename:"axis-lab/app.js"});
  assert.equal(registered.subjectCount.textContent,"(2/8)");
  assert.equal(registered.cameraSide.textContent,"Side 1");
  assert.equal(registered.subjectControls.children.length,2);
  assert.equal(registered.subjectPlaceButtons.children.length,2);
  assert(registered.distanceReadouts.children[0].children[1].textContent.includes("m"));
  assert(registered.distanceReadouts.children[2].children[1].textContent.includes("2.3"));

  const hA=registered.handleA;
  await pressFloor(390,220,2,hA);
  assert.equal(storage().subjects[0].y,220,"Touch on dynamic subject SVG group must move A");
  await pressFloor(390,300,3,hA);
  await registered.placeCam.click();
  await pressFloor(480,140,4);
  assert.equal(registered.cameraSide.textContent,"Side 2","Camera must cross to opposite side");
  await pressFloor(480,520,5);

  // With B farther away from camera, B must render smaller than A.
  await registered.subjectPlaceButtons.children[1].click();
  await pressFloor(570,180,6);
  const people=registered.previewSubjects.children;
  const a=people.find(n=>n.children[2]?.textContent==="A");
  const b=people.find(n=>n.children[2]?.textContent==="B");
  assert(a && b,"Both actors must appear in preview");
  assert(Number.parseFloat(a.style.height)>Number.parseFloat(b.style.height),"Nearer subject must project larger");
  await pressFloor(570,300,7);

  await registered.gridMetres.trigger("change",{target:{value:"2"}});
  assert.equal(storage().gridMetres,2);
  assert(registered.distanceReadouts.children[2].children[1].textContent.includes("4.5"),"Metre calibration must change the distance");
  await registered.gridMetres.trigger("change",{target:{value:"1"}});

  await registered.addSubject.click();
  assert.equal(registered.subjectCount.textContent,"(3/8)");
  assert.equal(storage().subjects[2].id,"c");
  assert.equal(registered.subjectPlaceButtons.children.length,3);
  await pressFloor(480,120,8);
  assert.equal(storage().subjects[2].y,120);
  assert.equal(registered.previewSubjects.children.length,3);
  await registered.subjectControls.children[2].children[2].click();
  assert.equal(storage().subjects.length,2,"Remove new cast member");
  assert.equal(registered.subjectCount.textContent,"(2/8)");

  await registered.newPosition.click();
  assert.equal(registered.shotCount.textContent,"(1 shot)");
  assert.equal(registered.shotTabs.children.length,1);
  assert.equal(registered.shotTabs.children[0].textContent,"1");
  await registered.placeCam.click();
  await pressFloor(480,140,9);
  assert.equal(storage().shots[0].cam.y,140,"Current position updates automatically");
  await registered.newPosition.click();
  assert.equal(storage().shots.length,2);
  await pressFloor(480,520,10);
  await registered.shotTabs.children[0].click();
  assert.equal(registered.cameraSide.textContent,"Side 2");
  await registered.shotTabs.children[1].click();
  assert.equal(registered.cameraSide.textContent,"Side 1");

  await registered.saveDiagram.click();
  assert(downloaded.some(x=>x.name.endsWith(".png")),"PNG diagram must export");
  await registered.downloadBrief.click();
  assert(downloaded.some(x=>x.name.endsWith("-brief.md")));
  await registered.saveProject.click();
  assert(downloaded.some(x=>x.name.endsWith(".json")));

  const snapshot=storage();
  await registered.reset.click();
  assert.equal(storage().shots.length,0);
  registered.importFile.files=[{size:300,text:async()=>JSON.stringify({...snapshot,format:"axis-lab-project"})}];
  await registered.importFile.trigger("change");
  assert.equal(storage().shots.length,2,"JSON round-trip must retain positions");

  registered.importFile.files=[{size:200,text:async()=>"{broken"}];
  await registered.importFile.trigger("change");
  assert.equal(storage().shots.length,2,"Invalid import must preserve project");

  const oldProject={version:1,scene:"Legacy",aName:"A",bName:"B",a:{x:300,y:300},b:{x:660,y:300},cam:{x:480,y:505},size:"medium",move:"Dolly",intent:"",shots:[{a:{x:300,y:300},b:{x:660,y:300},cam:{x:480,y:505},size:"medium",move:"Dolly",intent:""}]};
  registered.importFile.files=[{size:200,text:async()=>JSON.stringify(oldProject)}];
  await registered.importFile.trigger("change");
  assert.equal(storage().version,2,"v1 projects should migrate");
  assert.equal(storage().subjects.length,2);
  assert.equal(storage().shots.length,1);
  console.log("PASS: 34+ spatial tests, touch controls, depth scaling, metre calibration, cast editing, positions, PNG, exports, v1 migration and corrupted backup recovery.");
}
main().catch(error=>{console.error(error);process.exitCode=1;});
