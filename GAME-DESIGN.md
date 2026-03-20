# CICLO — Game Design Document

## Concept

A real-time multiplayer game where the Grupalia team experiences what it's
like to be a group credit member. Played on phones during monthly meetings
or weeklys as a team-building exercise.
4–20 players. 10–25 minutes.

The UI mimics WhatsApp + the Grupalia app. Everyone on the team already
knows how the real product looks, so the game should feel like stepping
into the other side of the screen.

---

## Setting

**"Reunion de Consolidacion"**

A Grupalia AI promoter has gathered your group to start a credit cycle.
One player is randomly assigned as **Presidenta**. Everyone else picks a
business type. Together, you must survive the cycle by making your weekly
group payment. If you thrive, you win. If the group defaults... everyone suffers.

**Context:** This is the Grupalia team playing as their own customers.
Devs, ops, product, everyone. The goal is empathy: feel the pressure of
a missed payment, the frustration of covering for someone, the loneliness
of being presidenta when nobody is paying.

---

## Game Modes

| Mode             | Weeks | Duration   | Best for                  |
|------------------|-------|------------|---------------------------|
| Experiencia      | 4     | ~8 min     | Quick demo, short meetings|
| Medio ciclo      | 8     | ~14 min    | Standard play             |
| Ciclo completo   | 16    | ~25 min    | Full experience           |

After completing a cycle, the group can vote to start Cycle 2. The group
"graduates" and levels up:

| Graduation Status | Criteria                      | Cycle 2 Effect                    |
|-------------------|-------------------------------|-----------------------------------|
| Graduado          | 0 missed payments             | Full credit, bigger loans, +3 pts |
| No Graduado       | 1-3 late payments             | Reduced credit, same events       |
| Moroso            | 4+ late payments              | No cycle 2. Game over.            |

Cycle 2 also advances the group's **consolidation level**, mirroring the
real app:

| Level              | After Cycle | Unlock                              |
|--------------------|-------------|-------------------------------------|
| Nuevo              | 0           | Base game                           |
| Semi-consolidado   | 1           | Bigger loans, new event types       |
| Consolidado        | 2+          | Access to special achievements      |
| Super-consolidado  | 4+          | Legendary difficulty, hall of fame  |

---

## Players & Roles

### Members (everyone except Presidenta)

You run a small business. Each week you receive income (affected by random
events), and must decide how to spend it. Your goal: grow your business
AND keep the group alive.

**Business Types** (cosmetic + event grouping):

| Type          | Emoji | Flavor                          |
|---------------|-------|---------------------------------|
| Tiendita      | 🛒    | Corner shop, stable             |
| Salón         | 💇    | Beauty salon, seasonal          |
| Puesto        | 🌮    | Food stand, weather-dependent   |
| Catálogo      | 👗    | Catalog sales, boom/bust        |
| Costura       | 🧵    | Sewing/tailoring, slow & steady |
| Panadería     | 🍞    | Bakery, ingredient costs        |

All types have the same base income. The difference is WHICH events affect
them. If 10 players pick Salón, they all boom together and crash together.
Diverse groups are more resilient — a natural lesson.

### Presidenta (1 player, randomly assigned)

You don't run a business. You manage the group. You see who's paying, who's
struggling, and who's freeloading. You make allocation decisions and keep the
group on track. You play a completely different game.

---

## Round Structure — "La Semana"

Each week lasts **90 seconds** and has 3 phases:

```
┌─ LUNES–VIERNES (60 sec) ─── Action phase ──────────────┐
│  Income arrives. Events happen. Make your decisions.     │
│  Chat is open. Presidenta manages.                       │
│  Progress bar: 🟩🟩🟩🟩🟩⬜⬜  Viernes                  │
│                                                          │
├─ SABADO (15 sec) ─── Results ────────────────────────────┤
│  Payment check. Did the group hit the target?            │
│  If not: mora starts/grows. Debt accumulates.            │
│  AI Promoter sends weekly summary with mora status.      │
│  Achievements update silently.                           │
│                                                          │
├─ DOMINGO (15 sec) ─── Rest & preview ───────────────────┤
│  Next week's forecast. Breathe. Gossip.                  │
│  "Descansen, el lunes arranca otra vez."                 │
└──────────────────────────────────────────────────────────┘
```

---

## Member Decisions (2–4 per week)

Members choose from **predefined options**. No typing required for decisions.

### Decision 1: Payment (required every week)

```
¿Cuanto abonas esta semana?
Referencia OXXO: 7823-4501

  [💰 Pago completo — $750]
  [🫣 Pago parcial  — $400]
  [😰 No puedo pagar — $0 ]
```

If the group has accumulated mora, a fourth option appears:

```
  [💰💰 Pago doble — $1,500]   → Covers this week + catches up on mora
```

Overpayments cascade to future installments automatically, just like
the real app's `apply_payin_to_payments` logic.

### Decision 2: What to do with leftover money (if any)

```
¿Qué haces con lo que te sobra?

  [📈 Invertir en tu negocio]     → Grows business value
  [💾 Guardar para emergencia]    → Safety buffer for bad weeks
  [🤝 Ayudar a alguien]          → Pick a player → +solidarity
  [🎁 Mandar algo a Presidenta]  → Costs money, builds influence
```

### Decision 3: Social action (optional)

```
Choose a predefined message to send to the group chat:

  "¡Ya pagué! 💪"
  "¿Alguien necesita ayuda?"
  "Ando corta esta semana 😅"
  "Presidenta, ¿cómo vamos?"
  "¡Ánimo grupo, sí se puede!"
  [Otro: ___________]              → Free text option
```

### Decision 4: Private message to Presidenta (optional)

```
Mensaje privado a Presidenta:

  "¿Me puedes ayudar esta semana?"
  "Yo puedo cubrir a alguien si necesitas"
  "La próxima semana pago doble, te lo prometo"
  "¿Cómo va el grupo?"
  [Otro: ___________]
```

That's it. **2 required decisions, 2 optional.** Tap tap, done.

---

## Presidenta Decisions (2–4 per week)

The presidenta doesn't have a money pool to distribute. Like in the real
app, she has **information and social pressure**. She sees who paid and
who didn't. The group doesn't (unless she chooses to reveal it).

### Decision 1: React to non-payment (when someone doesn't pay)

```
Ana 🌮 no pago esta semana. El grupo debe $750 y solo hay $400.

  [📢 Pedir al grupo que cubra a Ana]    → Public message asking for help
  [📱 Hablar con Ana en privado]         → DM asking what happened
  [😶 No hacer nada]                     → Payment stays incomplete
  [👀 Revelar quien no pago al grupo]    → Direct social pressure
```

The presidenta manages people, not money. Her power is information
and the ability to choose when to share it.

### Decision 2: Payment transparency (unlocks at week 3)

```
¿Quieres que el grupo vea quien ha pagado y quien no?

  [👁️ Si, que todos vean]    → +group trust, -presidenta power
  [🔒 No, solo yo veo]       → +presidenta power, risk of distrust
```

This mirrors the real `show_payments_info` flag in the app. The
presidenta can toggle this once per cycle. It's a strategic choice:
transparency builds trust but removes her information advantage.

### Decision 3: Group message (predefined)

```
Mensaje al grupo:

  "¡Vamos bien, sigan asi! 👏"
  "Necesito que todos paguen esta semana 🙏"
  "¿Quien puede poner un extra esta semana?"
  "Alguien no ha pagado, ya saben quienes son 👀"
  "Estamos a punto de caer en mora..."
  [Otro: ___________]
```

### Decision 4: Credit recommendation (once per cycle, mid-cycle)

```
¿Quien merece mas credito el proximo ciclo?
  → Pick 1–3 players

¿Quien deberia recibir menos?
  → Pick 0–2 players
```

This affects end-of-game scoring and mirrors real presidenta power.

---

## Events

Events create the randomness. They arrive as WhatsApp messages from the
AI Promoter and as app notifications.

### Event types

**Weather/seasonal** — affect business types differently:

| Event                     | 🛒    | 💇    | 🌮    | 👗    | 🧵    | 🍞    |
|---------------------------|-------|-------|-------|-------|-------|-------|
| Temporada de lluvias      | -20%  | ok    | -40%  | +10%  | ok    | ok    |
| Día de las Madres         | ok    | +50%  | +20%  | +50%  | +30%  | ok    |
| Ola de calor              | +20%  | ok    | +30%  | ok    | -20%  | -30%  |
| Fiestas patrias           | +30%  | +20%  | +50%  | ok    | ok    | +40%  |
| Subió el precio del maíz  | ok    | ok    | -30%  | ok    | ok    | -40%  |
| Llegó competencia nueva   | -30%  | ok    | ok    | -30%  | ok    | ok    |
| Se fue la luz             | -20%  | -20%  | -20%  | ok    | -20%  | -20%  |

**Personal** — affect one player randomly:
- "¡Un cliente grande!" → +$500 bonus
- "Se te descompuso el refrigerador" → -$300
- "Tu hija se enfermó" → -$400 and you MUST pay (can't invest)
- "Te recomendaron en Facebook" → +$200 next 2 weeks
- "Te robaron mercancía" → lose half this week's income

**Group** — affect everyone:
- "Nueva carretera al pueblo" → all +10% for 3 weeks
- "Corte de agua" → all -10% this week
- "El pueblo salió en las noticias" → all +20% this week

Events are drawn randomly each week (1–2 per week). The AI promoter
announces them with flavor text in the group chat.

---

## Mora & Delinquency Escalation

When the group doesn't complete its weekly payment, **mora (late fees)
accumulates**. This mirrors the real app where `delinquent_daily_fees`
grow every day past due.

### How mora works in-game

```
Week N: Group misses payment
  → Mora starts: $45
  → AI Promoter: "Les recuerdo que tienen un atraso de $45..."

Week N+1: Still unpaid
  → Mora grows: $45 + $15/dia = $150
  → AI Promoter: "Ya van 2 semanas. La mora es de $150. ¿Que esta pasando?"

Week N+2: Still unpaid
  → Mora grows: $285
  → AI Promoter: "Necesito hacer una visita al grupo."
  → EVENT: "Visita de cobranza" triggers
    → All players get -10% income this week (stress/distraction)
    → Presidenta must answer: "¿Por que no ha pagado el grupo?"
```

### Escalation timeline (mirrors real collection visits)

| Weeks late | What happens                                          |
|------------|-------------------------------------------------------|
| 1          | Friendly reminder from AI Promoter, mora starts       |
| 2          | Firm message, mora grows, promoter asks presidenta    |
| 3          | "Visita de cobranza" event, -10% income for everyone  |
| 4+         | Group risks "Moroso" graduation status, no cycle 2    |

The mora amount adds to the group's total debt. Players can choose to
**overpay** in future weeks to catch up (excess payment cascades to
cover mora + future installments, just like the real app).

### Overpayment option (unlocks after mora)

When the group has accumulated mora, members see an extra payment option:

```
¿Cuanto abonas esta semana?

  [💰 Pago completo — $750]
  [💰💰 Pago doble — $1,500]        → Covers this week + mora
  [🫣 Pago parcial  — $400]
  [😰 No puedo pagar — $0 ]
```

---

## The AI Promoter

An LLM-powered NPC that acts as game master, narrator, and social catalyst.
Communicates through the WhatsApp-style group chat.

### What it does:

- **Announces events** with personality and flavor
- **Reacts to game state** -- calls out the group if payment is low
- **Escalates on delinquency** -- tone shifts from friendly to firm to serious
  across consecutive missed payments (see Mora section)
- **Pressures the presidenta** -- "Ya van 2 semanas con pagos tardios..."
- **Encourages struggling players** -- "Animo Ana, tu grupo te respalda"
- **Remembers context** -- "Dijiste que ibas a pagar doble, ¿que paso?"
- **Comments on group composition** -- "Puro salon, espero que no llueva"
- **Sends weekly summaries** on Saturdays with mora status
- **Adapts personality** per game (strict, friendly, gossipy, etc.)
- **Drops OXXO flavor** -- "Recuerden, su referencia de pago es 7823-4501.
  Pueden pagar en cualquier OXXO antes del viernes."

### What it sees (context for the LLM):

- All player decisions (who paid, who didn't, who helped whom)
- All chat messages (group and optionally flagged private messages)
- Current game state (group health, week number, events)
- Business distribution across the group

### What it does NOT do:

- Make game decisions for players
- Reveal private information (who DM'd the presidenta)
- Change game rules mid-game

---

## Scoring — How to Pick a Winner

Inspired by Catan: multiple paths to victory, mix of visible and hidden
points, balance of luck and skill.

### Visible Points (everyone can see throughout the game)

| Source                | Points | How                                    |
|-----------------------|--------|----------------------------------------|
| Business value        | 0-10   | Each investment grows your business    |
| Payment consistency   | 0-5    | Bonus for never missing a full payment |
| Savings               | 0-3    | Buffer you built up                    |
| Graduation bonus      | 0-3    | +3 Graduado, +1 No Graduado, 0 Moroso |

### Hidden Achievements (revealed at game end — like Catan's VP cards)

Players do NOT know which achievements exist until the end.
Multiple players can earn the same achievement.

| Achievement              | Points | Criteria                                    |
|--------------------------|--------|---------------------------------------------|
| 🤝 La Solidaria          | 3      | Helped the most players                     |
| 💰 La Empresaria         | 3      | Highest business value                      |
| 🛡️ La Constante          | 2      | Never missed a single payment               |
| 🌟 La Popular            | 2      | Received the most help requests (trusted)   |
| 🎯 Recomendada           | 2      | Presidenta recommended you for more credit  |
| 🤫 La Estratega          | 2      | Highest savings at game end                 |
| 🎁 La Generosa           | 1      | Gave the most gifts to presidenta           |
| 🏃 La Rápida             | 1      | First to pay every week (most weeks)        |
| 📉 La Sobreviviente      | 2      | Recovered from the worst event in the game  |

### Presidenta Scoring

The Presidenta competes on the SAME leaderboard with different sources:

| Source                       | Points | How                                      |
|------------------------------|--------|------------------------------------------|
| Group survival               | 0–8    | More points per week survived            |
| On-time payments             | 0–5    | Weeks where 100% paid before deadline    |
| Good recommendations         | 0–3    | Recommended players who grew most        |
| Member rating                | 0–5    | Anonymous 1-5 star rating at game end    |
| Hidden: 👑 La Líder          | 3      | Group had zero defaults                  |
| Hidden: 🎯 Buen Ojo          | 2      | All credit recommendations were accurate |

### The Catan Balance

```
LUCK (cards dealt):
  Events are random → sometimes you get lucky, sometimes you don't
  Business type grouping → being the only panadería can save or doom you
  Personal events → random windfalls or crises

SKILL (decisions made):
  When to invest vs save → timing matters
  When to help others vs grow your business → strategic
  Who to help → helping someone who helps you back = smart
  Presidenta management → reading the group, allocating wisely
  Social play → building alliances through chat

HIDDEN INFO (Catan's secret VP cards):
  You don't know which achievements exist
  You don't know if others have been helping more than you
  You don't know if presidenta recommended you
  The final reveal creates surprise winners
```

A player who got terrible events but helped others and saved wisely
can beat someone who got lucky but hoarded everything.
**The winner is not the richest — it's the most complete player.**

### Final Reveal

```
🏆 RESULTADOS — CICLO 1

Graduation status first:

  🎓 GRUPO GRADUADO — 0 pagos perdidos
  Todos reciben +3 puntos bonus
  ¡Desbloquean Ciclo 2 como Semi-consolidados!

  (or: 😬 NO GRADUADO — 2 pagos tardios, +1 punto bonus)
  (or: 💀 MOROSO — 5 pagos tardios, 0 bonus, no hay ciclo 2)

Then visible scores update...
Then achievements flip one by one:

  🤝 La Solidaria → Agus (+3 pts!)
  💰 La Empresaria → Diego (+3 pts!)
  🛡️ La Constante → Ramon, Jose (+2 pts each!)
  🎯 Recomendada → Ana (+2 pts!)
  ...

Final leaderboard:

  🥇 Agus — 18 pts (was in 3rd place before achievements!)
  🥈 Diego — 16 pts
  🥉 Ramon — 15 pts
  4. Jose — 14 pts
  ...

  👑 Presidenta Ana — 17 pts (almost won!)

¿Jugar Ciclo 2? [Si, vamos] [No, ya estuvo]
```

---

## UI Design

### Two main screens (swipeable tabs on mobile):

**Tab 1: WhatsApp clone ("Grupo Ciclo 1")**
- Group chat with all players + AI Promoter
- Predefined message buttons at bottom (replaces keyboard)
- Tap on Presidenta's avatar → private chat
- Events appear as promoter messages with emoji
- Typing/presence indicators to build urgency

**Tab 2: Grupalia app clone**
- Your business card (type, value, income this week)
- Decision buttons (pay, invest, save, help)
- Week progress bar (Lunes → Domingo)
- Group payment bar (current / target)
- Mini leaderboard (visible points only)

**Presidenta extra tab: Panel de Presidenta**
- Member status list (paid / pending / can't pay / late)
- Mora tracker (accumulated late fees for the group)
- Incoming private messages count
- Toggle: show/hide payment info to the group
- Action buttons (message member, reveal payments, recommend)

### Visual Style

The WhatsApp tab should feel like actual WhatsApp:
- Green header, gray bubbles, blue ticks
- Message timestamps
- "Escribiendo..." indicators
- Notification sounds

The Grupalia tab should feel like the actual Grupalia app:
- Use Grupalia's real brand colors and style
- Familiar layout for anyone who has used the app

---

## Global Leaderboard

Persists between sessions across team meetings. Tracks:

### Best Groups (per meeting)

| #  | Group Name          | Score | Meeting         | Graduated? |
|----|---------------------|-------|-----------------|------------|
| 1  | Las Invencibles     | 9,450 | Monthly Mar '26 | Graduado   |
| 2  | Si Se Puede         | 8,800 | Weekly Mar 12   | Graduado   |
| 3  | Las Guerreras       | 8,200 | Monthly Feb '26 | No Grad    |

Group score = sum of all member points + survival bonus + graduation bonus.

### Best Players (all time, across all team meetings)

| #  | Player      | Wins | Avg Score | Achievements    |
|----|-------------|------|-----------|-----------------|
| 1  | Ramon       | 5    | 17.2      | 🤝🤝💰🛡️🌟     |
| 2  | Diego       | 4    | 16.8      | 💰💰🎯🏃       |

### Best Presidentas

| #  | Player      | Avg Rating | Groups Graduated |
|----|-------------|------------|------------------|
| 1  | Agus        | 4.8        | 3                |
| 2  | Jose        | 4.6        | 2                |

---

## Technical Architecture

```
SpacetimeDB          →  Game state, real-time sync, tables
                         Players, businesses, events, payments,
                         chat messages, scores, achievements

Web client (PWA)     →  WhatsApp UI + Grupalia UI
                         Mobile-first, works on any phone

Claude API           →  AI Promoter
                         Receives game state, sends chat messages
                         Personality, reactions, summaries
```

### Why SpacetimeDB:

- All game state in tables (players, payments, chat = tables)
- Real-time sync to all clients (chat messages appear instantly)
- No backend server to deploy
- Handles 20 concurrent players easily
- Reducers for game logic (payment processing, event resolution)

### Key Tables:

- `game` — current game config, week, cycle, mode
- `player` — id, name, role, business_type, money, savings, business_value
- `payment` — player_id, week, amount, timestamp
- `event` — week, type, affected_types, description
- `message` — sender, recipient (null = group), content, timestamp
- `achievement` — player_id, achievement_type, week_earned
- `help` — helper_id, helped_id, amount, week
- `score` — player_id, component, points

---

## Open Questions

1. ~~**Anonymous payments?**~~ **RESOLVED.** In the real app, only the
   presidenta sees who paid by default (`show_payments_info` flag). The
   game now mirrors this: presidenta controls transparency as a strategic
   decision (see Presidenta Decision 2).

2. **Group naming?** -- Let groups pick a name at start? Fun for leaderboard
   and fits the team meeting vibe.

3. **Spectator mode?** -- Useful if someone joins the meeting late. Could
   watch the game live and see the chat without playing.

4. **Onboarding?** -- Quick tutorial round (1 week) before the real game?
   May not be needed since the team already knows how the product works.

5. **Sound design?** -- WhatsApp notification sounds would add a lot.
   Real OXXO receipt printer sound when someone pays?

6. **Presidenta rotation in multi-cycle?** -- If group plays cycle 2,
   does presidenta change? Could be a fun rule: the member with the
   lowest score becomes presidenta next cycle.

7. **Anti-griefing?** -- In a team meeting context, social pressure is
   probably enough. The AI promoter can call out sabotage with humor.
   "Alguien esta jugando a la mala... ustedes saben quien es."

8. **Meeting format integration?** -- Should the game replace part of
   the meeting agenda, or be a post-meeting activity? Experiencia mode
   (4 weeks, ~8 min) fits well as a meeting warmup.
