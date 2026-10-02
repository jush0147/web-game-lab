import "./style.css";
import Matter from "matter-js";

const { Engine, Render, Runner, Bodies, Body, Composite, Constraint, Events, Query, Vector } = Matter;

type Level = {
  name: string;
  hint: string;
  spawn: { x: number; y: number };
  goal: { x: number; y: number; w: number; h: number };
  platforms: Array<{ x: number; y: number; w: number; h: number; angle?: number }>;
};

const levels: Level[] = [
  {
    name: "Push",
    hint: "Goal: white core into GREEN. Tap the LEFT piece to push the core RIGHT.",
    spawn: { x: 220, y: 360 },
    goal: { x: 650, y: 365, w: 130, h: 130 },
    platforms: [{ x: 500, y: 490, w: 1000, h: 60 }],
  },
  {
    name: "Hop",
    hint: "Tap the BOTTOM piece to push the core UP. Then use a side piece to steer.",
    spawn: { x: 220, y: 370 },
    goal: { x: 720, y: 285, w: 125, h: 130 },
    platforms: [
      { x: 500, y: 500, w: 1000, h: 50 },
      { x: 720, y: 385, w: 230, h: 24 },
    ],
  },
  {
    name: "Gap",
    hint: "Need up + right at once? Throw the LOWER-LEFT piece away.",
    spawn: { x: 185, y: 365 },
    goal: { x: 820, y: 355, w: 120, h: 135 },
    platforms: [
      { x: 180, y: 490, w: 360, h: 55 },
      { x: 810, y: 490, w: 380, h: 55 },
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
const guide = document.querySelector<HTMLDivElement>("#guide")!;

let engine = Engine.create();
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
    height: Math.max(360, rect.height),
  };
}

function sx(x: number, width: number) { return (x / 1000) * width; }
function sy(y: number, height: number) { return (y / 560) * height; }

function makePlayer(x: number, y: number, width: number, height: number) {
  const px = sx(x, width);
  const py = sy(y, height);
  const unit = Math.max(20, Math.min(width, height) * 0.052);

  core = Bodies.circle(px, py, unit * 0.68, {
    restitution: 0.12,
    friction: 0.045,
    frictionAir: 0.018,
    density: 0.003,
    render: { fillStyle: "#f2f3f5" },
    label: "core",
  });

  const offsets = [
    [-1.25, 0],
    [1.25, 0],
    [0, -1.25],
    [0, 1.25],
    [-0.9, 0.9],
    [0.9, 0.9],
  ];

  pieces = offsets.map(([ox, oy], i) =>
    Bodies.circle(px + ox * unit, py + oy * unit, unit * 0.46, {
      restitution: 0.18,
      friction: 0.08,
      frictionAir: 0.01,
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
      stiffness: 0.9,
      damping: 0.1,
      length: unit * 1.05,
      render: { strokeStyle: "rgba(255,255,255,0.22)", lineWidth: 2 },
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
      friction: 0.55,
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
        fillStyle: "rgba(135, 243, 168, 0.16)",
        strokeStyle: "#87f3a8",
        lineWidth: 4,
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

function attachEngineEvents() {
  Events.on(engine, "collisionStart", (event) => {
    for (const pair of event.pairs) {
      const a = pair.bodyA;
      const b = pair.bodyB;
      if ((a === core && b === goal) || (b === core && a === goal)) {
        win();
        return;
      }
    }
  });

  Events.on(engine, "afterUpdate", () => {
    if (finished || !core) return;
    const { height } = dims();
    if (core.position.y > height + 100) lose();
  });
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
  attachEngineEvents();

  const level = levels[levelIndex];
  levelLabel.textContent = `${levelIndex + 1} / ${levels.length} · ${level.name}`;
  guide.textContent = level.hint;
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
  const coreKick = 6.2;
  const pieceKick = 8.5;

  Body.setVelocity(core, {
    x: core.velocity.x - outward.x * coreKick,
    y: core.velocity.y - outward.y * coreKick,
  });
  Body.setVelocity(piece, {
    x: piece.velocity.x + outward.x * pieceKick,
    y: piece.velocity.y + outward.y * pieceKick,
  });

  updatePieceLabel();
  flash("Piece out. Core moved the opposite way.");

  if (attachedPieces().length === 0) {
    flash("No pieces left. This is your final trajectory.");
  }
}

function flash(message: string) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 1000);
}

function win() {
  if (finished) return;
  finished = true;
  const seconds = (performance.now() - startedAt) / 1000;
  const remaining = attachedPieces().length;
  resultKicker.textContent = "GOAL REACHED";
  resultTitle.textContent = "That was the idea.";
  resultCopy.textContent = `You reached green in ${seconds.toFixed(1)}s with ${remaining} piece${remaining === 1 ? "" : "s"} left.`;
  nextBtn.textContent = levelIndex === levels.length - 1 ? "Back to level 1" : "Next";
  result.classList.remove("hidden");
}

function lose() {
  if (finished) return;
  finished = true;
  resultKicker.textContent = "FELL OUT";
  resultTitle.textContent = "Try a different piece.";
  resultCopy.textContent = "Remember: ejecting a piece pushes the white core in the opposite direction.";
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

restartBtn.addEventListener("click", rebuild);
retryBtn.addEventListener("click", rebuild);
nextBtn.addEventListener("click", () => {
  if (!finished) return;
  if (resultKicker.textContent === "FELL OUT") {
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
