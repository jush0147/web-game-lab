import "./style.css";

type RuleKey = "bounce" | "redJump" | "slowTurn" | "wallTurn" | "speedBoost";

const canvas = document.querySelector<HTMLCanvasElement>("#rule-canvas")!;
const ctx = canvas.getContext("2d")!;
const status = document.querySelector<HTMLParagraphElement>("#rule-status")!;
const runBtn = document.querySelector<HTMLButtonElement>("#run-rules")!;
const resetBtn = document.querySelector<HTMLButtonElement>("#reset-rules")!;
const selects = [1,2,3].map(i => document.querySelector<HTMLSelectElement>("#rule"+i)!);

const options: Array<[RuleKey,string]> = [
  ["wallTurn","On wall hit -> turn around"],
  ["redJump","Near red block -> jump"],
  ["speedBoost","After 2s -> speed up"],
  ["bounce","On floor hit -> bounce"],
  ["slowTurn","Every 1.5s -> turn around"],
];

for (const s of selects) {
  for (const [value,label] of options) {
    const o=document.createElement("option"); o.value=value; o.textContent=label; s.appendChild(o);
  }
}
selects[0].value="wallTurn"; selects[1].value="redJump"; selects[2].value="speedBoost";

let running=false;
let x=90,y=420,vx=90,vy=0,t=0,last=0;
const gravity=500;
const red={x:390,y:380,w:70,h:60};
const goal={x:790,y:350,w:80,h:110};

function reset(){
  running=false; x=90;y=420;vx=90;vy=0;t=0;last=0; status.textContent="Reach the green zone."; draw();
}
function has(k:RuleKey){return selects.some(s=>s.value===k)}
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#151823"; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#2b3040"; ctx.fillRect(0,470,900,50);
  ctx.fillStyle="#b94b4b"; ctx.fillRect(red.x,red.y,red.w,red.h);
  ctx.fillStyle="#4caf72"; ctx.fillRect(goal.x,goal.y,goal.w,goal.h);
  ctx.fillStyle="#f3f4f6"; ctx.beginPath(); ctx.arc(x,y,24,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#0e1017"; ctx.fillRect(x-10,y-5,5,5); ctx.fillRect(x+5,y-5,5,5);
}
function frame(ts:number){
  if(!running) return;
  if(!last) last=ts;
  const dt=Math.min(0.033,(ts-last)/1000); last=ts; t+=dt;
  vy+=gravity*dt;
  x+=vx*dt; y+=vy*dt;

  if (y>446) {
    y=446;
    if(has("bounce")) vy=-220; else vy=0;
  }
  if ((x<24 || x>876) && has("wallTurn")) {
    vx*=-1; x=Math.max(24,Math.min(876,x));
  }
  if (has("redJump") && x>red.x-55 && x<red.x+red.w+15 && y>390) vy=-330;
  if (has("speedBoost") && t>2) vx=Math.sign(vx||1)*160;
  if (has("slowTurn") && Math.floor((t-dt)/1.5)!==Math.floor(t/1.5)) vx*=-1;

  if (x>goal.x && x<goal.x+goal.w && y>goal.y) {
    running=false; status.textContent="Success. The creature accidentally obeyed you."; draw(); return;
  }
  if (t>12) { running=false; status.textContent="Timed out. Your rules made a very committed idiot."; draw(); return; }
  draw(); requestAnimationFrame(frame);
}
runBtn.addEventListener("click",()=>{reset(); running=true; last=0; requestAnimationFrame(frame);});
resetBtn.addEventListener("click",reset);
reset();
