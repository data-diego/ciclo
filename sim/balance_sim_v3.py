#!/usr/bin/env python3
"""
CICLO Game Balance Simulator V3
Fixes from V2:
- Solidario pts reduced (75 → 50), but add "received solidario" as tiebreaker
- Difficulty matters: harder = stronger events AND less starting money
- Group failure has escalating consequences (mora splits to all players as actual money loss)
- New mechanic: "compartir evento" — sharing your event in chat gives +15 pts (social play)
- Investment events have lasting compound benefit (not just +1 week)
- Event frequency increased: sometimes 2 events per week on dificil
- Income reduced overall to create more tension
- Objectives rebalanced: popular removed, replaced with "lider" (most group weeks passed)
"""

import random
import statistics
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ProcessPoolExecutor
from collections import defaultdict

# ─── Constants ───────────────────────────────────────────────────────

class LoanSize(Enum):
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"

class Difficulty(Enum):
    FACIL = "facil"
    NORMAL = "normal"
    DIFICIL = "dificil"

LOAN_CREDIT = {LoanSize.SMALL: 2000, LoanSize.MEDIUM: 3500, LoanSize.LARGE: 5000}

# Income tighter — large barely covers payment
LOAN_INCOME = {LoanSize.SMALL: 850, LoanSize.MEDIUM: 1050, LoanSize.LARGE: 1250}

# Starting money depends on difficulty
STARTING_MONEY_MULT = {Difficulty.FACIL: 1.2, Difficulty.NORMAL: 1.0, Difficulty.DIFICIL: 0.8}

TASA = {Difficulty.FACIL: 65, Difficulty.NORMAL: 75, Difficulty.DIFICIL: 85}

# ─── Scoring V3 ─────────────────────────────────────────────────────

SCORE_FULL_PAY = 100
SCORE_PARTIAL_PAY = 20
SCORE_NO_PAY = -40            # heavier penalty
SCORE_SOLIDARIO_SENT = 50     # reduced from 100
SCORE_SHARE_EVENT = 15        # new: sharing event publicly
SCORE_GROUP_PASSED = 60       # group success
SCORE_GROUP_FAILED = -20      # group failure
SCORE_INVESTMENT_MADE = 25    # invested in business
SCORE_FAMILY_HELPED = 20      # paid family expense

# Loan mult only on group bonus
LOAN_GROUP_MULT = {LoanSize.SMALL: 1.0, LoanSize.MEDIUM: 1.15, LoanSize.LARGE: 1.3}

SOLIDARIO_AMOUNT = 200
MORA_BASE = 60
MORA_GROWTH = 30

# Mora SPLITS across all players as actual money loss
MORA_SPLIT = True

# ─── Events V3 ──────────────────────────────────────────────────────

@dataclass
class EventDef:
    key: str
    is_choice: bool
    money_pct: float
    cost: float
    benefit_pct: float      # income modifier next week
    benefit_duration: int   # how many weeks the benefit lasts (1=next week only, 2=two weeks, etc)
    penalty_pct: float
    penalty_duration: int
    weight: int
    category: str  # business, personal, investment, universal

PASSIVE_EVENTS = [
    EventDef("dia_normal", False, 0.0, 0, 0, 0, 0, 0, 7, "business"),
    EventDef("cliente_habitual", False, 0.08, 0, 0, 0, 0, 0, 5, "business"),
    EventDef("dia_lento", False, -0.08, 0, 0, 0, 0, 0, 5, "business"),
    EventDef("buena_venta", False, 0.25, 0, 0, 0, 0, 0, 3, "business"),
    EventDef("pedido_grande", False, 0.30, 0, 0, 0, 0, 0, 2, "business"),
    EventDef("dia_festivo", False, 0.35, 0, 0, 0, 0, 0, 1, "universal"),
    EventDef("perdida", False, -0.20, 0, 0, 0, 0, 0, 3, "business"),
    EventDef("pocos_clientes", False, -0.15, 0, 0, 0, 0, 0, 4, "universal"),
    EventDef("robo", False, -0.30, 0, 0, 0, 0, 0, 2, "universal"),
    EventDef("crisis", False, -0.45, 0, 0, 0, 0, 0, 1, "universal"),
]

CHOICE_EVENTS = [
    # Repair: pay 25% or lose 20% income for 2 weeks
    EventDef("reparacion", True, 0, 0.25, 0.0, 0, -0.20, 2, 3, "business"),
    # Small investment: pay 30%, gain 15% for 2 weeks
    EventDef("inversion", True, 0, 0.30, 0.15, 2, 0.0, 0, 3, "investment"),
    # Family: pay 15% (pure cost, earns family pts)
    EventDef("gasto_familiar", True, 0, 0.15, 0.0, 0, 0.0, 0, 3, "personal"),
    # Big expansion: pay 50%, gain 25% for 3 weeks
    EventDef("expansion", True, 0, 0.50, 0.25, 3, 0.0, 0, 1, "investment"),
    # Emergency: pay 35% or lose 25% for 2 weeks
    EventDef("emergencia", True, 0, 0.35, 0.0, 0, -0.25, 2, 2, "business"),
    # Opportunity: pay 20%, gain 10% for rest of game (permanent!)
    EventDef("oportunidad", True, 0, 0.20, 0.10, 99, 0.0, 0, 1, "investment"),
]

ALL_EVENTS = PASSIVE_EVENTS + CHOICE_EVENTS

DIFFICULTY_NEG_MULT = {Difficulty.FACIL: 0.5, Difficulty.NORMAL: 1.0, Difficulty.DIFICIL: 1.8}
DIFFICULTY_POS_MULT = {Difficulty.FACIL: 1.3, Difficulty.NORMAL: 1.0, Difficulty.DIFICIL: 0.6}
# Extra event chance on dificil
DIFFICULTY_EXTRA_EVENT = {Difficulty.FACIL: 0.0, Difficulty.NORMAL: 0.1, Difficulty.DIFICIL: 0.3}

# ─── Objectives V3 ──────────────────────────────────────────────────

OBJECTIVES = [
    ("solidario", "Send solidario to 2+ different players", 400),
    ("perfeccionista", "Pay full every week", 350),
    ("ahorradora", "End with > $2000", 300),
    ("moroso_estrategico", "Skip payment once", 500),
    ("generosa", "Send 3+ solidarios total", 450),
    ("inversionista", "Accept 2+ investment events", 350),
]

# ─── Strategies ──────────────────────────────────────────────────────

class Strategy(Enum):
    RESPONSIBLE = "responsible"
    GREEDY = "greedy"
    GAMBLER = "gambler"
    FREELOADER = "freeloader"
    INVESTOR = "investor"
    SOCIAL = "social"
    MIN_MAXER = "min_maxer"
    SURVIVOR = "survivor"
    HOARDER = "hoarder"

# ─── Player ──────────────────────────────────────────────────────────

@dataclass
class Player:
    id: int
    strategy: Strategy
    loan: LoanSize
    difficulty: Difficulty
    money: float = 0
    score: int = 0
    weekly_payment: float = 0
    base_income: float = 0
    # Income modifiers: list of (pct, weeks_remaining)
    income_mods: list = field(default_factory=list)
    payments_made: list = field(default_factory=list)
    solidario_sent_to: list = field(default_factory=list)
    solidario_unique: set = field(default_factory=set)
    solidario_received: int = 0
    objective: tuple = None
    total_paid: float = 0
    investments_accepted: int = 0
    family_events_paid: int = 0
    events_shared: int = 0

    def effective_income(self):
        mod = sum(pct for pct, _ in self.income_mods)
        return max(0, self.base_income * (1.0 + mod))

    def tick_mods(self):
        """Decrease remaining weeks on all mods, remove expired."""
        self.income_mods = [(pct, w - 1) for pct, w in self.income_mods if w > 1]


def calc_weekly_payment(credit, weeks, difficulty):
    tasa = TASA[difficulty]
    interest = (credit / 1000) * tasa
    return (credit + interest) / weeks


def pick_event(difficulty, rng):
    neg_mult = DIFFICULTY_NEG_MULT[difficulty]
    pos_mult = DIFFICULTY_POS_MULT[difficulty]
    adjusted = []
    for e in ALL_EVENTS:
        w = e.weight
        is_neg = e.money_pct < 0 or e.penalty_pct < 0 or (e.is_choice and e.cost > 0 and e.benefit_pct == 0)
        is_pos = e.money_pct > 0 or e.benefit_pct > 0
        if is_neg:
            w = max(1, int(w * neg_mult))
        elif is_pos:
            w = max(1, int(w * pos_mult))
        adjusted.append((e, w))
    total = sum(w for _, w in adjusted)
    pick = rng.randint(0, total - 1)
    for event, w in adjusted:
        pick -= w
        if pick < 0:
            return event
    return adjusted[0][0]


def decide_choice(player, event, rng):
    cost = int(player.base_income * event.cost)
    s = player.strategy
    if s == Strategy.INVESTOR:
        return player.money >= cost
    elif s == Strategy.GREEDY:
        return event.penalty_pct < 0 and player.money >= cost
    elif s == Strategy.FREELOADER:
        return False
    elif s == Strategy.GAMBLER:
        return rng.random() > 0.4 and player.money >= cost
    elif s == Strategy.HOARDER:
        return event.penalty_pct <= -0.20 and player.money >= cost
    elif s in (Strategy.RESPONSIBLE, Strategy.SOCIAL, Strategy.SURVIVOR):
        if event.benefit_pct > 0 or event.penalty_pct < 0:
            return player.money >= cost * 1.5
        return player.money >= cost * 2.5
    elif s == Strategy.MIN_MAXER:
        # Take investments if profitable, always repair
        if event.benefit_pct > 0 and event.benefit_duration >= 2:
            return player.money >= cost * 1.5
        return event.penalty_pct < 0 and player.money >= cost
    return False


def decide_payment(player, rng):
    wp = player.weekly_payment
    s = player.strategy
    can_full = player.money >= wp
    can_partial = player.money >= wp * 0.5

    if s in (Strategy.RESPONSIBLE, Strategy.INVESTOR, Strategy.SOCIAL, Strategy.MIN_MAXER, Strategy.GREEDY):
        return "full" if can_full else ("partial" if can_partial else "none")
    elif s == Strategy.GAMBLER:
        if rng.random() < 0.12:
            return "none"
        return "full" if can_full else ("partial" if can_partial else "none")
    elif s == Strategy.FREELOADER:
        r = rng.random()
        if r < 0.30:
            return "none"
        elif r < 0.55 and can_partial:
            return "partial"
        return "full" if can_full else "none"
    elif s == Strategy.SURVIVOR:
        if player.money >= wp * 2:
            return "full"
        elif can_full and player.money >= wp * 1.4:
            return "full"
        elif can_partial:
            return "partial"
        return "none"
    elif s == Strategy.HOARDER:
        if player.money >= wp * 3:
            return "full"
        elif can_partial:
            return "partial"
        return "none"
    return "none"


def decide_solidario(player, others, rng):
    s = player.strategy
    min_reserve = player.weekly_payment + SOLIDARIO_AMOUNT
    if player.money < min_reserve:
        return None
    if s in (Strategy.GREEDY, Strategy.FREELOADER, Strategy.HOARDER, Strategy.MIN_MAXER):
        return None
    if s == Strategy.SOCIAL:
        eligible = [o for o in others if o.id != player.id]
        if eligible:
            return min(eligible, key=lambda o: o.money).id
    elif s == Strategy.RESPONSIBLE:
        if player.money >= player.weekly_payment * 2 + SOLIDARIO_AMOUNT:
            struggling = [o for o in others if o.money < o.weekly_payment and o.id != player.id]
            if struggling:
                return rng.choice(struggling).id
    elif s == Strategy.GAMBLER:
        if rng.random() < 0.2:
            eligible = [o for o in others if o.id != player.id]
            return rng.choice(eligible).id if eligible else None
    elif s in (Strategy.INVESTOR, Strategy.SURVIVOR):
        if player.money >= player.weekly_payment * 3:
            struggling = [o for o in others if o.money < o.weekly_payment and o.id != player.id]
            if struggling:
                return min(struggling, key=lambda o: o.money).id
    return None


def decide_share_event(player, rng):
    """Does the player share their event in WhatsApp?"""
    s = player.strategy
    if s == Strategy.SOCIAL:
        return True
    elif s == Strategy.RESPONSIBLE:
        return rng.random() < 0.7
    elif s in (Strategy.GAMBLER, Strategy.INVESTOR, Strategy.SURVIVOR):
        return rng.random() < 0.5
    elif s == Strategy.FREELOADER:
        return rng.random() < 0.6  # shares to get sympathy
    elif s in (Strategy.GREEDY, Strategy.HOARDER, Strategy.MIN_MAXER):
        return rng.random() < 0.3
    return False


# ─── Simulate ────────────────────────────────────────────────────────

def simulate_game(seed, num_players, weeks, difficulty, strategies, loans):
    rng = random.Random(seed)
    players = []
    total_target = 0

    for i in range(num_players):
        loan = loans[i]
        credit = LOAN_CREDIT[loan]
        wp = calc_weekly_payment(credit, weeks, difficulty)
        income = LOAN_INCOME[loan]
        start_money = int(income * STARTING_MONEY_MULT[difficulty])
        total_target += wp
        obj = OBJECTIVES[(seed + i) % len(OBJECTIVES)]
        players.append(Player(
            id=i, strategy=strategies[i], loan=loan, difficulty=difficulty,
            money=start_money, weekly_payment=wp, base_income=income, objective=obj,
        ))

    week_results = []
    total_mora = 0
    consec_missed = 0

    for week in range(1, weeks + 1):
        # Tick income modifiers (reduce remaining weeks)
        for p in players:
            p.tick_mods()

        # Phase 1: Events (possibly 2 on dificil)
        for p in players:
            num_events = 1
            if rng.random() < DIFFICULTY_EXTRA_EVENT[difficulty]:
                num_events = 2

            for _ in range(num_events):
                event = pick_event(difficulty, rng)

                if event.is_choice:
                    cost = int(p.base_income * event.cost)
                    accepted = decide_choice(p, event, rng)
                    if accepted and p.money >= cost:
                        p.money -= cost
                        if event.benefit_pct > 0:
                            p.income_mods.append((event.benefit_pct, event.benefit_duration))
                            if event.category == "investment":
                                p.investments_accepted += 1
                                p.score += SCORE_INVESTMENT_MADE
                        if event.category == "personal":
                            p.family_events_paid += 1
                            p.score += SCORE_FAMILY_HELPED
                    else:
                        if event.penalty_pct != 0:
                            p.income_mods.append((event.penalty_pct, event.penalty_duration))
                else:
                    delta = int(p.effective_income() * event.money_pct)
                    p.money += delta

                # Share event?
                if decide_share_event(p, rng):
                    p.events_shared += 1
                    p.score += SCORE_SHARE_EVENT

        # Phase 2: Solidario
        for p in players:
            target_id = decide_solidario(p, players, rng)
            if target_id is not None and p.money >= SOLIDARIO_AMOUNT:
                p.money -= SOLIDARIO_AMOUNT
                players[target_id].money += SOLIDARIO_AMOUNT
                p.solidario_sent_to.append(target_id)
                p.solidario_unique.add(target_id)
                players[target_id].solidario_received += 1
                p.score += SCORE_SOLIDARIO_SENT

        # Phase 3: Payments
        week_total = 0
        for p in players:
            choice = decide_payment(p, rng)
            wp = p.weekly_payment
            amount = {"full": wp, "partial": int(wp * 0.5), "none": 0}.get(choice, 0)
            if amount > p.money:
                if p.money >= wp:
                    choice, amount = "full", wp
                elif p.money >= int(wp * 0.5):
                    choice, amount = "partial", int(wp * 0.5)
                else:
                    choice, amount = "none", 0
            p.money -= amount
            p.total_paid += amount
            p.payments_made.append(choice)
            week_total += amount
            p.score += {"full": SCORE_FULL_PAY, "partial": SCORE_PARTIAL_PAY, "none": SCORE_NO_PAY}[choice]

        # Week result
        passed = week_total >= total_target
        mora = 0
        if not passed:
            consec_missed += 1
            mora = MORA_BASE + MORA_GROWTH * (consec_missed - 1)
            total_mora += mora
            for p in players:
                p.score += SCORE_GROUP_FAILED
                if MORA_SPLIT:
                    p.money -= mora / num_players  # shared pain
        else:
            consec_missed = 0
            for p in players:
                p.score += int(SCORE_GROUP_PASSED * LOAN_GROUP_MULT[p.loan])

        week_results.append({"week": week, "paid": int(week_total), "target": int(total_target), "passed": passed, "mora": int(mora)})

        # Income
        if week < weeks:
            for p in players:
                p.money += p.effective_income()

    # ─── Objectives ──────────────────────────────────────────────
    for p in players:
        key, _, bonus = p.objective
        completed = False
        if key == "solidario":
            completed = len(p.solidario_unique) >= 2
        elif key == "perfeccionista":
            completed = all(c == "full" for c in p.payments_made)
        elif key == "ahorradora":
            completed = p.money > 2000
        elif key == "moroso_estrategico":
            completed = "none" in p.payments_made
        elif key == "generosa":
            completed = len(p.solidario_sent_to) >= 3
        elif key == "inversionista":
            completed = p.investments_accepted >= 2
        if completed:
            p.score += bonus
        p.score += int(max(0, p.money) / 100)

    return {
        "difficulty": difficulty.value, "weeks": weeks, "total_mora": total_mora,
        "num_players": num_players,
        "week_results": week_results,
        "players": [{
            "strategy": p.strategy.value, "loan": p.loan.value,
            "score": p.score, "money": int(p.money), "total_paid": int(p.total_paid),
            "full": p.payments_made.count("full"),
            "partial": p.payments_made.count("partial"),
            "none": p.payments_made.count("none"),
            "sol_sent": len(p.solidario_sent_to),
            "sol_unique": len(p.solidario_unique),
            "sol_recv": p.solidario_received,
            "invest": p.investments_accepted,
            "shared": p.events_shared,
            "obj": p.objective[0],
            "obj_done": completed,  # will be recalculated in analysis
        } for p in players],
    }


def run_single(args):
    return simulate_game(*args)


def run_analysis():
    SIMS_PER = 2500
    PLAYER_COUNTS = [4, 6, 12]
    WEEKS_OPTIONS = [4, 8, 16]
    rng = random.Random(42)

    configs = []
    for npl in PLAYER_COUNTS:
        for _ in range(SIMS_PER):
            w = rng.choice(WEEKS_OPTIONS)
            d = rng.choice(list(Difficulty))
            s = [rng.choice(list(Strategy)) for _ in range(npl)]
            l = [rng.choice(list(LoanSize)) for _ in range(npl)]
            configs.append((rng.randint(0, 999999), npl, w, d, s, l))

    print(f"Running {len(configs)} sims across player counts {PLAYER_COUNTS} (V3)...")
    with ProcessPoolExecutor() as executor:
        results = list(executor.map(run_single, configs))

    # ─── Aggregate ───────────────────────────────────────────────
    s_sc = defaultdict(list); s_w = defaultdict(int); s_g = defaultdict(int)
    l_sc = defaultdict(list); l_w = defaultdict(int); l_g = defaultdict(int)
    c_sc = defaultdict(list); c_w = defaultdict(int)
    d_sc = defaultdict(list); d_gp = defaultdict(lambda: [0,0])
    np_sc = defaultdict(list); np_gp = defaultdict(lambda: [0,0])
    sd_sc = defaultdict(list)
    l_money = defaultdict(list); l_bk = defaultdict(lambda: [0,0])
    obj_d = defaultdict(lambda: [0,0])
    s_pp = defaultdict(lambda: [0,0,0,0])  # full,partial,none,weeks
    s_sol = defaultdict(list)
    s_share = defaultdict(list)
    np_strat = defaultdict(list)

    for game in results:
        npl = game["num_players"]
        d = game["difficulty"]
        winner = max(game["players"], key=lambda p: p["score"])
        wi = game["players"].index(winner)

        for wr in game["week_results"]:
            d_gp[d][1] += 1; np_gp[npl][1] += 1
            if wr["passed"]:
                d_gp[d][0] += 1; np_gp[npl][0] += 1

        for i, p in enumerate(game["players"]):
            s, l = p["strategy"], p["loan"]
            combo = f"{s}+{l}"
            sd = f"{s}+{d}"
            is_win = (i == wi)

            s_sc[s].append(p["score"]); s_g[s] += 1
            l_sc[l].append(p["score"]); l_g[l] += 1
            c_sc[combo].append(p["score"])
            d_sc[d].append(p["score"])
            sd_sc[sd].append(p["score"])
            np_sc[npl].append(p["score"])
            np_strat[f"{npl}p+{s}"].append(p["score"])
            l_money[l].append(p["money"])
            s_sol[s].append(p["sol_sent"])
            s_share[s].append(p["shared"])

            l_bk[l][1] += 1
            if p["money"] < 0: l_bk[l][0] += 1

            if is_win: s_w[s] += 1; l_w[l] += 1; c_w[combo] += 1

            s_pp[s][0] += p["full"]; s_pp[s][1] += p["partial"]
            s_pp[s][2] += p["none"]; s_pp[s][3] += game["weeks"]

            obj_d[p["obj"]][1] += 1
            # Recalculate obj completion
            ok = False
            if p["obj"] == "solidario": ok = p["sol_unique"] >= 2
            elif p["obj"] == "perfeccionista": ok = p["full"] == game["weeks"] and p["none"] == 0 and p["partial"] == 0
            elif p["obj"] == "ahorradora": ok = p["money"] > 2000
            elif p["obj"] == "moroso_estrategico": ok = p["none"] > 0
            elif p["obj"] == "generosa": ok = p["sol_sent"] >= 3
            elif p["obj"] == "inversionista": ok = p["invest"] >= 2
            if ok: obj_d[p["obj"]][0] += 1

    total_pg = sum(len(g["players"]) for g in results)
    print(f"\n{'='*70}")
    print(f"CICLO BALANCE V3 — {len(configs)} games, {total_pg} player-games")
    print(f"{'='*70}")

    def pr(label):
        print(f"\n── {label} ──")

    pr("SCORE BY STRATEGY")
    print(f"{'Strat':<14} {'Avg':>7} {'Med':>7} {'Std':>7} {'Win%':>6} {'Sol':>5} {'Share':>5}")
    print("-"*51)
    sr = sorted(s_sc, key=lambda k: statistics.mean(s_sc[k]), reverse=True)
    for s in sr:
        sc=s_sc[s]; g=s_g[s]; w=s_w.get(s,0)
        print(f"{s:<14} {statistics.mean(sc):>7.0f} {statistics.median(sc):>7.0f} {statistics.stdev(sc):>7.0f} {w/g*100:>5.1f}% {statistics.mean(s_sol[s]):>5.1f} {statistics.mean(s_share[s]):>5.1f}")

    pr("SCORE BY LOAN")
    print(f"{'Loan':<10} {'Avg':>7} {'Med':>7} {'Money':>8} {'Win%':>6} {'Bkrpt%':>7}")
    print("-"*45)
    for l in ["small","medium","large"]:
        sc=l_sc[l]; g=l_g[l]; w=l_w.get(l,0); m=l_money[l]; bk=l_bk[l]
        print(f"{l:<10} {statistics.mean(sc):>7.0f} {statistics.median(sc):>7.0f} {statistics.mean(m):>8.0f} {w/g*100:>5.1f}% {bk[0]/bk[1]*100:>6.1f}%")

    pr("SCORE BY DIFFICULTY")
    for dd in ["facil","normal","dificil"]:
        sc=d_sc[dd]; gp=d_gp[dd]
        print(f"  {dd:<10} Avg:{statistics.mean(sc):>7.0f}  Std:{statistics.stdev(sc):>7.0f}  GroupPass:{gp[0]/gp[1]*100:>5.1f}%")

    pr("PLAYER COUNT")
    for n in sorted(np_sc):
        sc=np_sc[n]; gp=np_gp[n]
        print(f"  {n:>2} players  Avg:{statistics.mean(sc):>7.0f}  GroupPass:{gp[0]/gp[1]*100:>5.1f}%")
    print()
    for n in sorted(np_sc):
        by_s = defaultdict(list)
        for k,v in np_strat.items():
            if k.startswith(f"{n}p+"): by_s[k.split("+")[1]] = v
        ranked = sorted(by_s, key=lambda k: statistics.mean(by_s[k]), reverse=True)
        top = " > ".join(f"{s}({statistics.mean(by_s[s]):.0f})" for s in ranked[:3])
        bot = f"{ranked[-1]}({statistics.mean(by_s[ranked[-1]]):.0f})"
        print(f"  {n:>2}p best: {top}  worst: {bot}")

    pr("TOP 10 COMBOS")
    cr = sorted(c_sc, key=lambda k: statistics.mean(c_sc[k]), reverse=True)
    for c in cr[:10]:
        sc=c_sc[c]; w=c_w.get(c,0); g=len(sc)
        print(f"  {c:<26} Avg:{statistics.mean(sc):>7.0f}  Win:{w/g*100:>5.1f}%  N:{g}")

    pr("BOTTOM 5 COMBOS")
    for c in cr[-5:]:
        sc=c_sc[c]; g=len(sc)
        print(f"  {c:<26} Avg:{statistics.mean(sc):>7.0f}  N:{g}")

    pr("OBJECTIVES")
    for k in sorted(obj_d):
        d=obj_d[k]
        print(f"  {k:<22} {d[0]/d[1]*100:>6.1f}% ({d[0]}/{d[1]})")

    pr("PAYMENT PATTERNS")
    print(f"{'Strat':<14} {'Full%':>6} {'Part%':>6} {'None%':>6}")
    print("-"*32)
    for s in sr:
        p=s_pp[s]; tw=p[3] or 1
        print(f"{s:<14} {p[0]/tw*100:>5.1f}% {p[1]/tw*100:>5.1f}% {p[2]/tw*100:>5.1f}%")

    pr("STRATEGY × DIFFICULTY")
    print(f"{'Strat':<14} {'Facil':>8} {'Normal':>8} {'Dificil':>8}")
    print("-"*38)
    for s in sr:
        vals = {dd: statistics.mean(sd_sc.get(f"{s}+{dd}",[0])) for dd in ["facil","normal","dificil"]}
        print(f"{s:<14} {vals['facil']:>8.0f} {vals['normal']:>8.0f} {vals['dificil']:>8.0f}")

    # ─── Key Findings ────────────────────────────────────────────
    print(f"\n{'='*70}")
    print("KEY FINDINGS V3")
    print("="*70)
    print(f"  Best strategy:  {sr[0]} ({statistics.mean(s_sc[sr[0]]):.0f})")
    print(f"  Worst strategy: {sr[-1]} ({statistics.mean(s_sc[sr[-1]]):.0f})")
    print(f"  Best combo:     {cr[0]} ({statistics.mean(c_sc[cr[0]]):.0f})")
    gap = statistics.mean(s_sc[sr[0]]) - statistics.mean(s_sc[sr[-1]])
    print(f"  Strategy gap:   {gap:.0f} pts ({gap/statistics.mean(s_sc[sr[0]])*100:.0f}%)")
    lgap = statistics.mean(l_sc["large"]) - statistics.mean(l_sc["small"])
    print(f"  Loan gap:       {lgap:.0f} pts")
    dgap = max(statistics.mean(d_sc[d]) for d in d_sc) - min(statistics.mean(d_sc[d]) for d in d_sc)
    print(f"  Difficulty gap:  {dgap:.0f} pts")

    top3s = set(c.split("+")[0] for c in cr[:3])
    top3l = set(c.split("+")[1] for c in cr[:3])
    if len(top3s) == 1: print(f"\n  ⚠️  '{list(top3s)[0]}' dominates top 3")
    else: print(f"\n  ✓  Top 3 strategies: {top3s}")
    if len(top3l) == 1: print(f"  ⚠️  Loan '{list(top3l)[0]}' dominates top 3")
    else: print(f"  ✓  Top 3 loans: {top3l}")
    if dgap < 30: print(f"  ⚠️  Difficulty barely matters ({dgap:.0f} pts)")
    else: print(f"  ✓  Difficulty matters ({dgap:.0f} pts)")


if __name__ == "__main__":
    run_analysis()
