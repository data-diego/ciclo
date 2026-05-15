# CICLO — Vive el crédito grupal

A real-time multiplayer game where the Grupalia team experiences what it's like to be a group credit member. Played on phones during monthly meetings or weeklys as a team-building exercise. 4–20 players, 10–25 minutes.

The UI mimics **WhatsApp + the Grupalia app**. Everyone on the team already knows how the real product looks, so the game feels like stepping into the other side of the screen.

## How it works

A Grupalia AI advisor gathers your group to start a credit cycle. One player is randomly assigned as **Presidenta** — she manages the group. Everyone else picks a business type (tiendita, salón, puesto, catálogo, costura, panadería) and must survive the cycle by making weekly group payments.

Each week lasts **90 seconds** across three phases:

- **Lunes–Viernes (60s):** Income arrives, random events happen, make your decisions
- **Sábado (15s):** Payment check — did the group hit the target? Mora accumulates if not
- **Domingo (15s):** Rest, next week's forecast, breathe

Members make 2–4 decisions per week: how much to pay, what to do with leftover money, and optional social actions. The Presidenta plays a completely different game — managing people, controlling payment transparency, and applying social pressure.

## Game modes

| Mode | Weeks | Duration | Best for |
|------|-------|----------|----------|
| Experiencia | 4 | ~8 min | Quick demo, short meetings |
| Medio ciclo | 8 | ~14 min | Standard play |
| Ciclo completo | 16 | ~25 min | Full experience |

## Scoring

Inspired by Catan — multiple paths to victory with a mix of visible points (business value, payment consistency, savings) and **hidden achievements** revealed at game end (La Solidaria, La Empresaria, La Constante, etc.). The winner is not the richest — it's the most complete player.

## Tech stack

- **SpacetimeDB** — Game state & real-time sync
- **React + TypeScript + Vite** — Mobile-first PWA client
- **Claude API** — AI Advisor (game master, narrator, social catalyst)

See [GAME-DESIGN.md](./GAME-DESIGN.md) for the full design document.
