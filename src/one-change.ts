import "./style.css";

const canvas=document.querySelector<HTMLCanvasElement>("#change-canvas")!;
const ctx=canvas.getContext("2d")!;
const status=document.querySelector<HTMLParagraphElement>("#change-status")!;
const run=document.querySelector<HTMLButtonElement>("#run-change")!;
const resetBtn=document.querySelector<HTMLButtonElement>("#reset-change")!;
const actionBtns=[...document.querySelectorAll<HTMLButtonElement>("[data-action]")];

let chosen:string|null=null;
let plankX=430, plankAngle=-0.18;
let ball={x:100,y:110,vx:110,vy:0};
let running=false,last=0;
const gravity=380;

function reset(){
  chosen=null; plankX=430; plankAngle=-0.18; running=false; last=0;
  ball={x:100,y:110,vx:110,vy:0};
  actionBtns.forEach(b=>b.classList.remove("selected"));
  status.textContent="Pick exactly one change, then run the machine.";
  draw();
}
function choose(action:string,btn:HTMLButtonElement){
  if(running) return;
  chosen=action;
  actionBtns.forEach(b=>b.classList.remove("selected")); btn.classList.add("selected");
  plankX=430; plankAngle=-0.18;
  if(action==="left") plankX=375;
  if(action==="right") plankX=485;
  if(action==="rotate") plankAngle=0.08;
  status.textContent="One change locked in.";
  draw();
}
actionBtns.forEach(btn=>btn.addEventListener("click",()=>choose(btn.dataset.action!,btn)));

function draw(){
  ctx.clearRect(0,0,900,520);
  ctx.fillStyle="#151823"; ctx.fillRect(0,0,900,520);
  ctx.fillStyle="#2b3040"; ctx.fillRect(0,470,900,50);
  ctx.fillStyle="#4caf72"; ctx.fillRect(790,350,80,120);
  ctx.save();
  ctx.translate(plankX,300); ctx.rotate(plankAngle);
  ctx.fillStyle="#d7b26d"; ctx.fillRect(-130,-12,260,24); ctx.restore();
  ctx.fillStyle="#f2f3f5"; ctx.beginPath(); ctx.arc(ball.x,ball.y,20,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="#9aa2b1"; ctx.fillRect(190,180,80,18); ctx.fillRect(620,390,100,18);
}
function frame(ts:number){
  if(!running) return;
  if(!last) last=ts;
  const dt=Math.min(0.033,(ts-last)/1000); last=ts;
  ball.vy+=gravity*dt; ball.x+=ball.vx*dt; ball.y+=ball.vy*dt;

  if(ball.x>plankX-145 && ball.x<plankX+145 && ball.y>265 && ball.y<335 && ball.vy>0){
    const rel=(ball.x-plankX)/145;
    ball.y=270 + rel*Math.tan(plankAngle)*120;
    ball.vy=-120;
    ball.vx=140 + plankAngle*250;
  }
  if(ball.x>620 && ball.x<720 && ball.y>360 && ball.y<405 && ball.vy>0){
    ball.y=355; ball.vy=-100; ball.vx=120;
  }
  if(ball.x>790 && ball.x<870 && ball.y>340 && ball.y<470){
    running=false; status.textContent="Success. One tiny change fixed the whole chain."; draw(); return;
  }
  if(ball.y>560 || ball.x>930){
    running=false; status.textContent="Failed. Reset and change one thing differently."; draw(); return;
  }
  draw(); requestAnimationFrame(frame);
}
run.addEventListener("click",()=>{
  if(!chosen){status.textContent="You only get one change. Pick it first."; return;}
  ball={x:100,y:110,vx:110,vy:0}; running=true; last=0; status.textContent="Running..."; requestAnimationFrame(frame);
});
resetBtn.addEventListener("click",reset);
reset();
