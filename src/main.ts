import "./style.css";
import Matter from "matter-js";

const { Engine, Render, Runner, Bodies, Body, Composite, Constraint, Events, Query, Vector } = Matter;

type Level = {
  name: string;
  spawn: { x: number; y: number };
  goal: { x: number; y: number; w: number; h: number };
  platforms: Array<{ x: number; y: number; w: number; h: number; angle?: number }>;
};

const levels: Level[] = [
  {
    name: "Push",
    spawn: { x: 170, y: 330 },
    goal: { x: 820, y: 360, w: 110, h: 120 },
    platforms: [{ x: 500, y: 470, w: 1000, h: 60 }],
  },
  {
    name: "Climb",
    spawn: { x: 170, y: 350 },
    goal: { x: 810, y: 220, w: 110, h: 110 },
    platforms: [
      { x: 490, y: 500, w: 1000, h: 50 },
      { x: 650, y: 390, w: 240, h: 28 },
      { x: 820, y: 300, w: 180, h: 28 },
    ],
  },
  {
    name: "Gap",
    spawn: { x: 170, y: 330 },
    goal: { x: 845, y: 360, w: 110, h: 120 },
    platforms: [
      { x: 185, y: 480, w: 370, h: 55 },
      { x: 820, y: 480, w: 380, h: 55 },
    ],
  },
  {
    name: "Slope",
    spawn: { x: 170, y: 290 },
    goal: { x: 820, y: 360, w: 110, h: 120 },
    platforms: [
      { x: 450, y: 470, w: 880, h: 45, angle: -0.12 },
      { x: 900, y: 480, w: 260, h: 45 },
    ],
  },
  {
    name: "Needle",
    spawn: { x: 155, y: 350 },
    goal: { x: 860, y: 200, w: 95, h: 95 },
    platforms: [
      { x: 490, y: 500, w: 1000, h: 50 },
      { x: 790, y: 360, w: 130, h: 20 },
      { x: 880, y: 285, w: 130, h: 20 },
    ],
  },
  {
    name: "Leave almost nothing",
    spawn: { x: 150, y: 360 },
    goal: { x: 890, y: 250, w: 95, h: 95 },
    platforms: [
      { x: 470, y: 505, w: 960, h: 45 },
      { x: 555, y: 410, w: 170, h: 20, angle: -0.18 },
      { x: 735, y: 335, w: 160, h: 20, angle: -0.14 },
      { x: 885, y: 270, w: 125, h: 20 },
    ],
  },
];

const stage = document.querySelector<HTMLDivElement>("#stage")!;
const restartBtn = document.querySelector<HTMLButtonElement>("#restart")!;
const retryBtn = document.querySelector<HTMLButtonElement>("#retry")!;
const nextBtn = document.querySelector<HTMLButtonElement>("#next")!;
const result = document.querySelector<HTMLDivElement>("#result")!;
const resultKicker = document.querySelector<HTMLParagraphElement>("#result-kicker")!;
const resultTitle = document.querySelector<HTMLHeadingElement>("#result-title")!;
const resultCopy = document.querySelector<HTMLParagraphElement>("#result-copy")!;
const levelLabel = document.querySelector<HTMLSpanElement>("#level-label")!;
const piecesLabel = document.querySelector<HTMLSpanElement>("#pieces-label")!;
const toast = document.querySelector<HTMLDivElement>("#toast")!;

let engine = Engine.create();
engine.gravity.y = 1;
let runner = Runner.create();
let render: Matter.Render | null = null;
let levelIndex = 0;
let core: Matter.Body;
let pieces: Matter.Body[] = [];
let links: Matter.Constraint[] = [];
let goal: Matter.Body;
let finished = false;
let startedAt = 0;

function dims() {
  const rect = stage.getBoundingClientRect();
  return {
    width: Math.max(320, rect.width),
    height: Math.max(380, rect.height),
  };
}

function sx(x: number, width: number) { return (x / 1000) * width; }
function sy(y: number, height: number) { return (y / 560) * height; }

function makePlayer(x: number, y: number, width: number, height: number) {
  const px = sx(x, width);
  const py = sy(y, height);
  const unit = Math.max(22, Math.min(width, height) * 0.055);

  core = Bodies.circle(px, py, unit * 0.68, {
    restitution: 0.15,
    friction: 0.8,
    density: 0.003,
    render: { fillStyle: "#f2f3f5" },
    label: "core",
  });

  const offsets = [
    [-1.25, 0],
    [1.25, 0],
    [0, -1.25],
    [0, 1.25],
    [-0.9, -0.9],
    [0.9, -0.9],
  ];

  pieces = offsets.map(([ox, oy], i) =>
    Bodies.circle(px + ox * unit, py + oy * unit, unit * 0.46, {
      restitution: 0.2,
      friction: 0.7,
      density: 0.002,
      render: { fillStyle: i % 2 ? "#9fc4ff" : "#ffb48a" },
      label: "piece",
      plugin: { attached: true },
    })
  );

  links = pieces.map((piece) =>
    Constraint.create({
      bodyA: core,
      bodyB: piece,
      stiffness: 0.88,
      damping: 0.08,
      length: unit * 1.05,
      render: { strokeStyle: "rgba(255,255,255,0.2)", lineWidth: 2 },
    })
  );

  Composite.add(engine.world, [core, ...pieces, ...links]);
  updatePieceLabel();
}

function makeLevel(index: number) {
  const { width, height } = dims();
  const level = levels[index];

  const platforms = level.platforms.map((p) =>
    Bodies.rectangle(sx(p.x, width), sy(p.y, height), sx(p.w, width), Math.max(14, sy(p.h, height)), {
      isStatic: true,
      angle: p.angle ?? 0,
      friction: 0.9,
      render: { fillStyle: "#2b3040" },
      label: "platform",
    })
  );

  goal = Bodies.rectangle(
    sx(level.goal.x, width),
    sy(level.goal.y, height),
    sx(level.goal.w, width),
    sy(level.goal.h, height),
    {
      isStatic: true,
      isSensor: true,
      render: {
        fillStyle: "rgba(155, 255, 185, 0.14)",
        strokeStyle: "#87f3a8",
        lineWidth: 3,
      },
      label: "goal",
    }
  );

  const walls = [
    Bodies.rectangle(width / 2, -20, width, 40, { isStatic: true, render: { visible: false } }),
    Bodies.rectangle(-20, height / 2, 40, height, { isStatic: true, render: { visible: false } }),
    Bodies.rectangle(width + 20, height / 2, 40, height, { isStatic: true, render: { visible: false } }),
  ];

  Composite.add(engine.world, [...platforms, goal, ...walls]);
  makePlayer(level.spawn.x, level.spawn.y, width, height);
}

function rebuild() {
  finished = false;
  result.classList.add("hidden");
  if (render) {
    Render.stop(render);
    render.canvas.remove();
    render.textures = {};
  }

  Runner.stop(runner);
  Engine.clear(engine);
  engine = Engine.create();
  engine.gravity.y = 1;
  runner = Runner.create();

  const { width, height } = dims();
  render = Render.create({
    element: stage,
    engine,
    options: {
      width,
      height,
      wireframes: false,
      background: "transparent",
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    },
  });

  makeLevel(levelIndex);
  levelLabel.textContent = `${levelIndex + 1} / ${levels.length} · ${levels[levelIndex].name}`;
  startedAt = performance.now();

  Render.run(render);
  Runner.run(runner, engine);
}

function attachedPieces() {
  return pieces.filter((p) => p.plugin.attached);
}

function updatePieceLabel() {
  piecesLabel.textContent = `Pieces: ${attachedPieces().length}`;
}

function eject(piece: Matter.Body) {
  if (finished || !piece.plugin.attached) return;

  const constraint = links.find((link) => link.bodyB === piece);
  if (constraint) Composite.remove(engine.world, constraint);

  piece.plugin.attached = false;

  const outward = Vector.normalise(Vector.sub(piece.position, core.position));
  const impulse = 0.055 * core.mass;

  Body.applyForce(piece, piece.position, Vector.mult(outward, impulse * 0.7));
  Body.applyForce(core, core.position, Vector.mult(outward, -impulse));

  updatePieceLabel();
  flash("You moved by becoming less.");

  if (attachedPieces().length === 0) {
    flash("Nothing left to shed. Good luck.");
  }
}

function flash(message: string) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 900);
}

function win() {
  if (finished) return;
  finished = true;
  const ms = performance.now() - startedAt;
  const remaining = attachedPieces().length;
  resultKicker.textContent = "MADE IT";
  resultTitle.textContent = remaining <= 1 ? "Barely." : "Still mostly you.";
  resultCopy.textContent = `Finished in ${(ms / 1000).toFixed(1)}s with ${remaining} attached piece${remaining === 1 ? "" : "s"} left.`;
  nextBtn.textContent = levelIndex === levels.length - 1 ? "Again from level 1" : "Next";
  result.classList.remove("hidden");
}

function lose() {
  if (finished) return;
  finished = true;
  resultKicker.textContent = "NOT QUITE";
  resultTitle.textContent = "You shed too much.";
  resultCopy.textContent = "The useful part of you is somewhere else now.";
  nextBtn.textContent = "Retry";
  result.classList.remove("hidden");
}

function pointFromEvent(event: PointerEvent) {
  if (!render) return { x: 0, y: 0 };
  const rect = render.canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * render.options.width!,
    y: ((event.clientY - rect.top) / rect.height) * render.options.height!,
  };
}

stage.addEventListener("pointerdown", (event) => {
  if (finished) return;
  const point = pointFromEvent(event);
  const hit = Query.point(attachedPieces(), point)[0];
  if (hit) eject(hit);
});

Events.on(engine, "collisionStart", (event) => {
  for (const pair of event.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;
    if ((a === core && b === goal) || (b === core && a === goal)) {
      win();
      break;
    }
  }
});

Events.on(engine, "afterUpdate", () => {
  if (finished || !core) return;
  const { height } = dims();
  if (core.position.y > height + 120) lose();
});

restartBtn.addEventListener("click", rebuild);
retryBtn.addEventListener("click", rebuild);
nextBtn.addEventListener("click", () => {
  if (!finished) return;
  if (resultKicker.textContent === "NOT QUITE") {
    rebuild();
    return;
  }
  levelIndex = (levelIndex + 1) % levels.length;
  rebuild();
});

let resizeTimer = 0;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(rebuild, 180);
});

rebuild();
