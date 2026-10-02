import "./style.css";

type Action = "left" | "right" | "rotate";

const canvas = document.querySelector<HTMLCanvasElement>("#change-canvas")!;
const ctx = canvas.getContext("2d")!;
const status = document.querySelector<HTMLParagraphElement>("#change-status")!;
const runBtn = document.querySelector<HTMLButtonElement>("#run-change")!;
const resetBtn = document.querySelector<HTMLButtonElement>("#reset-change")!;
const actionBtns = [...document.querySelectorAll<HTMLButtonElement>("[data-action]")];

let chosen: Action | null = null;
let running = false;
let last = 0;
let ball = { x: 110, y: 170, vx: 190, vy: 0 };
let plankX = 455;
let plankAngle = -0.18;
const gravity = 330;

const goal = { x: 785, y: 345, w: 90, h: 125 };

function applyChoice(action: Action | null) {
  plankX = 455;
  plankAngle = -0.18;
  if (action === "left") plankX = 365;
  if (action === "right") plankX = 535;
  if (action === "rotate") plankAngle = 0.16;
}

function reset(message = "Goal: get the WHITE ball into GREEN. Change the GOLD plank exactly once.") {
  running = false;
  last = 0;
  chosen = null;
  ball = { x: 110, y: 170, vx: 190, vy: 0 };
  applyChoice(null);
  actionBtns.forEach((button) => button.classList.remove("selected"));
  status.textContent = message;
  draw();
}

function choose(action: Action, button: HTMLButtonElement) {
  if (running) return;
  chosen = action;
  applyChoice(action);
  actionBtns.forEach((b) => b.classList.remove("selected"));
  button.classList.add("selected");
  status.textContent = "Change locked. Press RUN to see if it fixes the machine.";
  draw();
}

actionBtns.forEach((button) => {
  button.addEventListener("click", () => choose(button.dataset.action as Action, button));
});

function plankSurfaceY(x: number) {
  return 305 + Math.tan(plankAngle) * (x - plankX);
}

function draw() {
  ctx.clearRect(0, 0, 900, 520);
  ctx.fillStyle = "#151823";
  ctx.fillRect(0, 0, 900, 520);

  ctx.fillStyle = "#2b3040";
  ctx.fillRect(0, 470, 900, 50);

  ctx.fillStyle = "#4caf72";
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  ctx.fillStyle = "#c8f5d7";
  ctx.font = "700 18px system-ui";
  ctx.fillText("GOAL", goal.x + 15, goal.y - 14);

  ctx.fillStyle = "#596174";
  ctx.fillRect(70, 230, 170, 18);
  ctx.fillRect(610, 390, 145, 18);

  ctx.save();
  ctx.translate(plankX, 305);
  ctx.rotate(plankAngle);
  ctx.fillStyle = "#d7b26d";
  ctx.fillRect(-145, -13, 290, 26);
  ctx.restore();

  ctx.fillStyle = "#f2f3f5";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, 20, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#e5d1a2";
  ctx.font = "700 16px system-ui";
  ctx.fillText("CHANGE THIS ONCE", plankX - 75, 255);
}

function frame(ts: number) {
  if (!running) return;
  if (!last) last = ts;

  const dt = Math.min(0.033, (ts - last) / 1000);
  last = ts;

  ball.vy += gravity * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  const half = 145;
  const surface = plankSurfaceY(ball.x);

  if (
    ball.x > plankX - half &&
    ball.x < plankX + half &&
    ball.vy > 0 &&
    ball.y + 20 >= surface &&
    ball.y + 20 <= surface + 28
  ) {
    ball.y = surface - 20;

    if (chosen === "rotate") {
      ball.vx = 235;
      ball.vy = -115;
    } else if (chosen === "left") {
      ball.vx = 115;
      ball.vy = -40;
    } else {
      ball.vx = 150;
      ball.vy = 35;
    }
  }

  if (
    ball.x > 610 &&
    ball.x < 755 &&
    ball.vy > 0 &&
    ball.y + 20 >= 390 &&
    ball.y + 20 <= 415
  ) {
    ball.y = 370;
    ball.vx = 180;
    ball.vy = -65;
  }

  if (
    ball.x > goal.x &&
    ball.x < goal.x + goal.w &&
    ball.y > goal.y - 10 &&
    ball.y < goal.y + goal.h
  ) {
    running = false;
    status.textContent = "SUCCESS: rotating the plank changed the whole chain.";
    draw();
    return;
  }

  if (ball.y > 540 || ball.x > 930) {
    running = false;
    status.textContent = "FAIL: that one change did not fix the machine. Try another.";
    draw();
    return;
  }

  draw();
  requestAnimationFrame(frame);
}

runBtn.addEventListener("click", () => {
  if (!chosen) {
    status.textContent = "First choose ONE change for the gold plank.";
    return;
  }

  ball = { x: 110, y: 170, vx: 190, vy: 0 };
  applyChoice(chosen);
  running = true;
  last = 0;
  status.textContent = "Running...";
  requestAnimationFrame(frame);
});

resetBtn.addEventListener("click", () => reset());
reset();
