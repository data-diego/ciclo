# CICLO - Incremental Sprint Plan

## Context

Build the CICLO game (see `~/code/ciclo-game-design.md`) as a React web app.
Played on phones during Grupalia team meetings. Each sprint delivers a
playable version - no sprint depends on future work to be fun.

**Auth model:** No login. Room creator gets a link, shares it, toggles start.

**Stack:** React + SpacetimeDB + OpenRouter + LangGraph. Laptop-first with
responsive design (played on laptops during meetings, but should work on phones too).

---

## Sprint 1: "The Skeleton" - Lobby + Core Payment Loop

**Goal:** 4-20 people open their phones, join a room, and play a stripped-down
version where the only decision is "pay or don't pay." Playable in ~5 min.

What to build:
- **Room system:** Create room -> get shareable link -> players join with name
- **Lobby screen:** See who's joined, room creator has "Start" button
- **Role assignment:** Random presidenta on game start, others pick business type
  (doc: Players & Roles section - cosmetic only in this sprint)
- **Round timer:** 90-second weeks with 3 phases (doc: Round Structure)
  - Lunes-Viernes (60s): payment decision appears
  - Sabado (15s): results - did group hit target?
  - Domingo (15s): next week preview
- **Payment decision only:** The 3 options from doc: Member Decision 1
  (pago completo / parcial / no puedo)
- **Presidenta view:** Sees who paid and who didn't (doc: Presidenta panel)
- **Group payment bar:** Shows current vs target (doc: Tab 2 UI)
- **End condition:** After N weeks (Experiencia=4), show if group survived

What it DOESN'T have yet: chat, events, AI promoter, scoring, mora, investments.

**Why it works day 1:** The core tension is already there - will everyone pay?
The presidenta sees the truth. The group doesn't. Social pressure happens
IRL in the meeting room.

---

## Sprint 2: Chat + Presidenta Power

**Goal:** Add the WhatsApp-style chat and presidenta decisions. Now players
can communicate in-game instead of just talking IRL.

What to build:
- **Group chat** (doc: Tab 1 UI - WhatsApp clone)
  - Predefined message buttons (doc: Member Decision 3)
  - Free text option
  - Green header, gray bubbles, timestamps
- **Private DM to presidenta** (doc: Member Decision 4)
  - Predefined options + free text
  - Presidenta sees incoming message count on her panel
- **Presidenta reactions** (doc: Presidenta Decision 1 - react to non-payment)
  - Ask group to cover someone
  - DM the non-payer
  - Reveal who didn't pay to the group
  - Do nothing
- **Payment transparency toggle** (doc: Presidenta Decision 2)
  - Unlocks week 3, one-time toggle per cycle
  - Shows/hides payment status to all members

---

## Sprint 3: Events + Mora

**Goal:** Add randomness and consequences. Games are no longer predictable.

What to build:
- **Event system** (doc: Events section)
  - 1-2 events per week, drawn randomly
  - Weather/seasonal events affect business types differently (doc: event table)
  - Personal events hit one random player
  - Group events affect everyone
- **Business type differentiation** - income now varies by type + events
- **Member Decision 2** (doc): what to do with leftover money
  - Invest / Save / Help someone
  - (Remove "gift to presidenta" - not in scope without referrals)
- **Mora system** (doc: Mora & Delinquency Escalation)
  - Late fees accumulate when group misses payment
  - Mora tracker on presidenta panel
  - Overpayment option (pago doble) when mora exists
- **Delinquency escalation** (doc: escalation timeline)
  - Week 1 late: reminder text
  - Week 2 late: firm text
  - Week 3 late: "visita de cobranza" event (-10% income all)
  - These are hardcoded messages, not AI yet

---

## Sprint 4: AI Promoter

**Goal:** Replace hardcoded event/escalation text with an LLM that has
personality and memory. The game gets a narrator.

What to build:
- **OpenRouter + LangGraph integration** (doc: The AI Promoter section)
  - LangGraph deep agents for promoter personality, memory, and escalation logic
  - OpenRouter for model routing (can use Claude, GPT, etc.)
  - Receives: all decisions, chat messages, game state, business distribution
  - Sends: chat messages in the group chat as "Promoter" NPC
- **Event announcements with flavor** - same events, but narrated by AI
- **Reactive commentary** - AI reacts to game state
  - Calls out low payment weeks
  - Pressures presidenta on consecutive misses
  - Encourages struggling players
  - Remembers promises ("dijiste que ibas a pagar doble")
  - Comments on business composition ("puro salon...")
- **Weekly summaries** on Sabado phase
- **OXXO flavor** (doc: "su referencia de pago es 7823-4501")
- **Personality selection** at room creation (strict / friendly / gossipy)

---

## Sprint 5: Scoring + Graduation

**Goal:** Add the competitive layer. Now there's a winner.

What to build:
- **Visible points** (doc: Scoring - Visible Points table)
  - Business value, payment consistency, savings, graduation bonus
- **Mini leaderboard** on Tab 2 (visible points only)
- **Presidenta scoring** (doc: Presidenta Scoring table)
  - Group survival, on-time payments, member rating
- **Credit recommendation** (doc: Presidenta Decision 4) - mid-cycle
- **Hidden achievements** (doc: Hidden Achievements table)
  - Solidaria, Empresaria, Constante, Popular, Recomendada, etc.
- **Final reveal ceremony** (doc: Final Reveal section)
  - Graduation status first (Graduado/No Graduado/Moroso)
  - Then achievements flip one by one
  - Final leaderboard
- **Cycle 2 vote** - group can vote to continue
  - Consolidation level progression (doc: Game Modes table)

---

## Sprint 6: Leaderboard + Polish

**Goal:** Persistence and polish for repeated play across meetings.

What to build:
- **Global leaderboard** (doc: Global Leaderboard section)
  - Best groups per meeting
  - Best players all-time
  - Best presidentas
  - Persists via SpacetimeDB
- **Group naming** at lobby (doc: Open Question 2)
- **Sound design** - WhatsApp notification sounds, payment confirmations
- **Spectator mode** (doc: Open Question 3) - late joiners can watch
- **Experiencia mode polish** - tuned for ~8 min meeting warmup
- **PWA install prompt** - add to home screen for quick access

---

## Project Structure

```
~/code/ciclo/
  package.json
  vite.config.ts
  src/
    main.tsx
    App.tsx
    components/          # Shared UI components
    screens/
      Lobby/             # Room creation, joining, waiting
      Game/              # Main game with tab navigation
        ChatTab/         # WhatsApp clone
        AppTab/          # Grupalia clone (decisions, status)
        PresidentaTab/   # Presidenta panel (conditional)
      Results/           # Final reveal + leaderboard
    game/
      state.ts           # Game state types
      reducers.ts        # SpacetimeDB reducers (game logic)
      events.ts          # Event definitions + tables from doc
      scoring.ts         # Points + achievements calculation
    ai/
      promoter.ts        # OpenRouter client for AI Promoter
      graph.ts           # LangGraph agent graph (personality, memory, escalation)
    spacetime/
      module/            # SpacetimeDB server module
```

## Tech Choices

- **Vite + React + TypeScript** - fast dev, laptop-first with responsive design
- **SpacetimeDB** - real-time multiplayer state, no backend to deploy
- **Tailwind CSS** - quick styling, WhatsApp/Grupalia visual clones
- **OpenRouter** - model routing for AI Promoter (Sprint 4+)
- **LangGraph** - deep agent graph for promoter personality, memory, escalation
- **No auth library** - room code in URL is the "auth"
