# Imposters — Design Doc

An Among Us-style social deduction game: 8 players on a spaceship, 2 of them secret Imposters.
Played on one TV in Microsoft Edge on an Xbox, with 1–4 local players in split screen and bots
filling the rest of the crew.

*Decisions from the request and Q&A, 2026-10-23; feedback round 2026-10-26.*

---

## Decided

| Area | Decision |
|---|---|
| Platform | Web page (plain JavaScript, no build) in Edge on Xbox; GitHub Pages: https://overpitch.github.io/imposters/ |
| Players | 8 total: 1–4 humans (split screen) + bots |
| Imposters | Always 2 |
| Roles, 1–2 humans | Everyone on the couch shares a role (25% chance you're the Imposters together; with 1 human, a bot is your partner) |
| Roles, 3–4 humans | 2 of the humans are the Imposters, the rest are crewmates; all bots are crew |
| Name | **Imposters** |
| Kills | Like the original: cartoon, the victim's bottom half is left behind with a bone; a short kill cut-in on the victim's screen |
| Meetings | Quick-chat phrases with the controller; bots accuse, defend and vote based on what they saw |
| Faithfulness | Gameplay as close to Among Us as possible; original name, map and character art |
| Role setting | Lobby: Random / Crewmate / Imposter for the humans (3–4 humans: at most 2 Imposters) |
| Computer controls | Lobby setting: one keyboard player with PC keys (WASD, E use, Q kill, R report, Tab map, F sabotage, Esc); hints show key caps |
| Meeting types | Bots know a body report from an emergency meeting: reporters say where the body was; at emergencies they ask the caller why and nobody asks "where?" |

## Gameplay (same rules as the original)

- **Crewmates** do tasks (1 common, 1 long, 2 short each, Among Us defaults), and win when the shared
  task bar fills or both Imposters are ejected. Dead crewmates become ghosts and can still do tasks.
- **Imposters** kill (30s cooldown, 12s at the start and after meetings), use vents, and sabotage.
  They win when they equal the living crew, or when Reactor/O2 isn't fixed in time.
- **Vision** is a circle blocked by walls. Imposters see farther. Lights sabotage shrinks crew vision.
- **Bodies** can be reported (Y); the **emergency button** in Cafeteria calls a meeting (1 per player).
- **Meetings:** intro → discussion (12s) → voting (40s) → results → ejection
  ("Red was not An Imposter." / "1 Imposter remains."). Most votes ejects; ties and skips eject nobody.
- **Sabotages:** Lights (Electrical switches), Comms (tune the dial; hides tasks), Reactor (two people
  hold both hand scanners at once, 40s), O2 (enter the code at O2 and Admin, 40s).

## The ship

14 rooms: Cafeteria, Weapons, O2, Navigation, Shields, Communications, Storage, Admin, Electrical,
Lower Engine, Upper Engine, Security, Reactor, MedBay, connected by hallways. Vents connect
Engines/Reactor, MedBay/Security/Electrical, Cafeteria/Admin/hallway, Weapons/Navigation/Shields.

## Tasks (controller mini-games)

Swipe Card, Fuel Engines (4 steps), Download + Upload Data, Submit Scan (visible to others — proves
you're crew), Divert + Accept Power, Fix Wiring (3 rooms), Clear Asteroids, Clean O2 Filter,
Prime Shields, Empty Garbage, Calibrate Distributor, Align Engine Output, Chart Course, Stabilize
Steering, Unlock Manifolds.

## Bots

- See only what their vision allows (same rules as players).
- Crew: do tasks; remember who was where; report bodies; treat anyone they *saw* kill or vent as
  the Imposter; call a meeting after seeing a vent; rush to fix sabotages (two for Reactor).
- Imposters: fake tasks; kill only when they think nobody's watching (and sometimes misjudge);
  escape through vents; sabotage; occasionally self-report.
- Meetings: report where the body was; witnesses accuse; accused bots defend themselves (and know
  when an accusation against them is a lie); Imposters give alibis and sometimes frame someone;
  crew bots only vote someone out with real evidence, otherwise they skip.
- Bot-only balance test (40 games): crew 19 / Imposters 21, zero innocents ejected.

## Controls

Stick move · A use · X kill · Y report · LB map · RB sabotage · B close. ☰ and View are never
needed (Edge on Xbox keeps them).

## Not in v1 (ideas)

Doors sabotage, security cameras, admin map table, customization (hats/pets), settings menu,
more maps, voice/sound polish.
