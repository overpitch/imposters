# Imposters 🚀

An Among Us-style game for 1–4 players on one TV (split screen), with bots filling the
crew to 8. Made to play in Microsoft Edge on an Xbox with controllers. See [DESIGN.md](DESIGN.md).

**Play:** https://overpitch.github.io/imposters/

## Getting started on Xbox

1. Open the game address in Edge.
2. **Switch Edge to game controls:** hold **☰ (Menu)** until a menu pops up, pick
   **Use game controls**, then press **A**. (Edge starts pages in "browsing controls", where the
   stick moves a mouse pointer and the game can't see the controller.)
3. Each player presses **A** to join, picks a color with the stick, and presses **A** again when ready.

**Lobby settings** (anyone can change them; they're remembered on that device):
- **X: Controls**: Xbox or Computer (see below).
- **Y: Role**: Random, Crewmate or Imposter. With 3–4 players only 2 can be Imposters.

## Playing on a computer

Press **C** in the lobby (or pick *Computer* under Controls). One keyboard player, PC-style:

| Key | Does |
|---|---|
| WASD / arrows | Move (and menus) |
| E / Space / Enter | Use, join, ready, vote |
| Q | Kill (Imposters) · quick chat in meetings |
| R | Report a body |
| Tab / M | Map |
| F | Sabotage menu (Imposters) |
| Esc / Backspace | Close |

Controllers can still join alongside the keyboard player. Button hints switch to key caps for
the keyboard player.

## Controls

| Button | Does |
|---|---|
| Left stick | Move |
| **A** | Use: tasks, vents, emergency button, fixing sabotage |
| **X** | Kill (Imposters) |
| **Y** | Report a body |
| **LB** | Map |
| **RB** | Sabotage menu (Imposters) |
| **B** | Close a task or menu |

In meetings: stick picks a player (or Skip), **A** then **A** again to vote, **X** for quick chat.
The game never needs ☰ or View, because Edge on Xbox keeps those buttons for itself.

## Run locally

```bash
python3 serve.py 8090
```

Then go to http://localhost:8090. With computer controls off, the keyboard is split into two test
players: P1 = WASD + Space (A), Q (B), E (X), R (Y), G (LB), F (RB); P2 = arrows + Enter (A),
Backspace (B), / (X), . (Y), M (LB), , (RB).

**Xbox simulator:** http://localhost:8090/xbox.html runs the game on a pretend TV with four virtual
Xbox controllers that behave like Edge on Xbox (browsing vs. game controls, ☰ and View kept by
Edge). Controllers 1–2 have keyboard keys (shown on screen); all four are scriptable via
`window.xbox` (`press`, `hold`, `stick`, and `step`/`tap` for hand-stepped tests).

## Code

Plain JavaScript modules, no build step, no dependencies.

- `src/config.js`: game settings (cooldowns, vision, timers), colors
- `src/settings.js`: lobby settings (controls, role), remembered in the browser
- `src/map.js`: the ship (rooms, halls, furniture, consoles, vents, tasks, sabotages), collision, vision, path-finding
- `src/game.js`: rules: roles, kills, bodies, meetings, voting, ejection, sabotage, win conditions
- `src/bots.js`: bot crewmates and Imposters (perception, tasks, hunting, witnessing, meetings, voting)
- `src/tasks.js`: task mini-games
- `src/render.js`: the ship from one player's view, vision darkness, HUD
- `src/ui.js`: lobby, role reveal, meeting, ejection, game over, map and sabotage menus
- `src/draw.js`: text, buttons and the crew characters
- `src/input.js`: Xbox controllers + keyboard
- `src/audio.js`: synthesized sound effects
- `src/main.js`: game loop, split screen, controls
