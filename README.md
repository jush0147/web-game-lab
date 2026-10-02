# Web Game Lab

Small browser-game experiments. The goal is not to build a giant game first; it is to find a mechanic that strangers voluntarily retry.

## Prototype 01 - Shed

**Pitch:** Move by throwing pieces of yourself away.

Your body is a cluster of detachable pieces. Tapping a piece ejects it outward and pushes the remaining body in the opposite direction. Every movement permanently changes your mass, balance, and available future moves.

The prototype currently has six short physics levels. The test question is simple:

> After a failed attempt, does the player immediately want to try again?

## Run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

## Scope rules for the prototype

- Browser-first
- Mouse and touch
- No accounts
- No leaderboard
- No store
- No backend
- No content treadmill until the core loop earns it

## Next validation steps

1. Test whether first-time players understand that body pieces are clickable without instructions.
2. Watch retry behavior rather than asking whether the game is "fun".
3. Tune recoil, weight, and level geometry.
4. Only add juice, analytics, more levels, or platform SDKs after the mechanic survives basic playtesting.
