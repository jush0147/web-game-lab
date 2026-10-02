import "./style.css";

type RuleKey = "redJump" | "wallTurn" | "speedBoost" | "bounce" | "slowTurn";

const canvas = document.querySelector<HTMLCanvasElement>("#rule-canvas")!;
const ctx = canvas.getContext("2d")!;
const status = document.querySelector<HTMLParagraphElement>("#rule-status")!;
const runBtn = document.querySelector<HTMLButtonElement>("#run-rules")!;
const resetBtn = document.querySelector<HTMLButtonElement>("#reset-rules")!;
const selects = [1, 2, 3].map((i) => document.querySelector<HTMLSelectElement>("#rule" + i)!);

const options: Array<[RuleKey, string]> = [
  ["redJump", "Near RED -> jump"],
  ["speedBoost", "After 2 sec -> speed up"],
  ["wallTurn", "Hit wall -> turn around"],
  ["bounce", "Hit floor -> bounce"],
  ["slowTurn", "Every 1.5 sec -> turn around"],
];

for (const select of selects) {
  for (const [value, label] of options) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  }
}

selects[0].value = "redJump";
selects[1].value = "speedBoost";
selects[2].value = "wallTurn";

let running = false;
let x = 90;
let y = 446;
let vx = 90;
let vy = 0;
let t = 0;
let last = 0;

const gravity = 500;
const red = { x: 390, y: 385, w: 75, h: 61 };
const goal = { x: 790, y: 350, w: 85, h: 120 };

function has(rule: RuleKey) {
  return selects.some((select) => select.value === rule);
}

function overlapsRed() {
  return x + 24 > red.x && x - 24 < red.x + red.w && y + 24 > red.y && y - 24 < red.y + red.h;
}

function reset(message = "Goal: reach GREEN. RED kills you. The loaded rules are one valid solution.") {
  running = false;
  x = 90;
  y = 446;
  vx = 90;
  vy = 0;
  t = 0;
  last = 0;
  status.textContent = message;
  draw();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#151823";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#2b3040";
  ctx.fillRect(0, 470, 900, 50);

  ctx.fillStyle = "#b94b4b";
  ctx.fillRect(red.x, red.y, red.w, red.h);
  ctx.fillStyle = "#f3c4c4";
  ctx.font = "700 18px system-ui";
  ctx.fillText("RED = BAD", red.x - 4, red.y - 14);

  ctx.fillStyle = "#4caf72";
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  ctx.fillStyle = "#c8f5d7";
  ctx.fillText("GOAL", goal.x + 12, goal.y - 14);

  ctx.fillStyle = "#f3f4f6";
  ctx.beginPath();
  ctx.arc(x, y, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0e1017";
  ctx.fillRect(x - 10, y - 5, 5, 5);
  ctx.fillRect(x + 5, y - 5, 5, 5);
}

function frame(ts: number) {
  if (!running) return;
  if (!last) last = ts;

  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;
  t += dt;

  vy += gravity * dt;
  x += vx * dt;
  y += vy * dt;

  if (y > 446) {
    y = 446;
    if (has("bounce")) vy = -220;
    else vy = 0;
  }

  if ((x < 24 || x > 876) && has("wallTurn")) {
    vx *= -1;
    x = Math.max(24, Math.min(876, x));
  }

  if (has("redJump") && x > red.x - 70 && x < red.x - 20 && y > 400) {
    vy = -360;
  }

  if (has("speedBoost") && t > 2) {
    vx = Math.sign(vx || 1) * 165;
  }

  if (has("slowTurn") && Math.floor((t - dt) / 1.5) !== Math.floor(t / 1.5)) {
    vx *= -1;
  }

  if (overlapsRed()) {
    running = false;
    status.textContent = "FAIL: the creature hit RED. Change its rules and run again.";
    draw();
    return;
  }

  if (x > goal.x && x < goal.x + goal.w && y > goal.y - 20) {
    running = false;
    status.textContent = "SUCCESS: your rules got the creature to GREEN.";
    draw();
    return;
  }

  if (t > 12) {
    running = false;
    status.textContent = "FAIL: timed out. Your rule set trapped the creature.";
    draw();
    return;
  }

  draw();
  requestAnimationFrame(frame);
}

runBtn.addEventListener("click", () => {
  reset("Running your three rules...");
  running = true;
  last = 0;
  requestAnimationFrame(frame);
});

resetBtn.addEventListener("click", () => reset());
reset();
