#!/usr/bin/env python3
"""
CICLO Game Balance Simulator V2
Fixes from V1:
- Double pay removed as payment option (confusing mechanic)
- Replaced with "adelanto" — pay next week early (costs 2× but locks you in)
- Events hit harder, scale with difficulty
- Income tighter relative to payments
- Scoring rebalanced: cooperation matters more
- Group mora splits across all players (shared pain)
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

LOAN_CREDIT = {
    LoanSize.SMALL: 2000,
    LoanSize.MEDIUM: 3500,
    LoanSize.LARGE: 5000,
}

# Income scales with loan — but margins are TIGHTER now
LOAN_INCOME = {
    LoanSize.SMALL: 900,
    LoanSize.MEDIUM: 1100,
    LoanSize.LARGE: 1300,
}

TASA = {
    Difficulty.FACIL: 65,
    Difficulty.NORMAL: 75,
    Difficulty.DIFICIL: 85,
}

# ─── Scoring V2 ─────────────────────────────────────────────────────
# Key change: no double pay. Payment scoring is flat (no loan mult).
# Loan multiplier ONLY on group week bonus — reward surviving harder situations.

SCORE_FULL_PAY = 100
SCORE_PARTIAL_PAY = 25
SCORE_NO_PAY = -25          # penalty for skipping
SCORE_SOLIDARIO_SENT = 100  # boosted — cooperation is the game
SCORE_SOLIDARIO_RECEIVED = 0  # no points for receiving (avoid gaming)
SCORE_GROUP_WEEK_PASSED = 75  # group success matters more
SCORE_GROUP_WEEK_FAILED = -30  # shared pain when group fails
SCORE_PROMISE_KEPT = 30
SCORE_PROMISE_BROKEN = -50

# Loan multiplier ONLY on group bonus (surviving harder game = more credit)
LOAN_GROUP_MULT = {
    LoanSize.SMALL: 1.0,
    LoanSize.MEDIUM: 1.15,
    LoanSize.LARGE: 1.3,
}

SOLIDARIO_AMOUNT = 200
MORA_BASE = 50
MORA_GROWTH = 25

# ─── Events V2 — much more impactful ────────────────────────────────

@dataclass
class EventDef:
    key: str
    is_choice: bool
    money_pct: float      # passive: % of income
    cost: float           # choice: cost as % of income
    benefit_pct: float    # choice: income boost next week
    penalty_pct: float    # choice: income loss next week
    weight: int
    category: str

# Passive events — STRONGER percentages
PASSIVE_EVENTS = [
    EventDef("dia_normal", False, 0.0, 0, 0, 0, 8, "business"),
    EventDef("cliente_habitual", False, 0.05, 0, 0, 0, 6, "business"),
    EventDef("dia_lento", False, -0.05, 0, 0, 0, 5, "business"),
    EventDef("buena_venta", False, 0.25, 0, 0, 0, 3, "business"),
    EventDef("pedido_grande", False, 0.30, 0, 0, 0, 2, "business"),
    EventDef("dia_festivo", False, 0.35, 0, 0, 0, 1, "universal"),
    EventDef("perdida_mercancia", False, -0.20, 0, 0, 0, 3, "business"),
    EventDef("pocos_clientes", False, -0.15, 0, 0, 0, 3, "universal"),
    EventDef("robo", False, -0.30, 0, 0, 0, 2, "universal"),
    EventDef("crisis_barrio", False, -0.40, 0, 0, 0, 1, "universal"),
]

# Choice events — bigger stakes
CHOICE_EVENTS = [
    # Repair: pay 30% or lose 25% income next week
    EventDef("reparacion", True, 0, 0.30, 0.0, -0.25, 3, "business"),
    # Investment: pay 35%, gain 25% next week
    EventDef("inversion", True, 0, 0.35, 0.25, 0.0, 2, "investment"),
    # Family: pay 20% (pure cost, human element)
    EventDef("gasto_familiar", True, 0, 0.20, 0.0, 0.0, 3, "personal"),
    # Big expansion: pay 60%, gain 35% next week
    EventDef("expansion", True, 0, 0.60, 0.35, 0.0, 1, "investment"),
    # Emergency: pay 40% or lose 30% income next week
    EventDef("emergencia", True, 0, 0.40, 0.0, -0.30, 2, "business"),
]

ALL_EVENTS = PASSIVE_EVENTS + CHOICE_EVENTS

# Difficulty: negative events get multiplied weight
DIFFICULTY_NEG_MULT = {
    Difficulty.FACIL: 0.5,
    Difficulty.NORMAL: 1.0,
    Difficulty.DIFICIL: 1.8,
}
# Also reduce positive event weights on harder difficulty
DIFFICULTY_POS_MULT = {
    Difficulty.FACIL: 1.3,
    Difficulty.NORMAL: 1.0,
    Difficulty.DIFICIL: 0.7,
}

# ─── Secret Objectives V2 — rebalanced ──────────────────────────────

OBJECTIVES = [
    ("solidario", "Send solidario to 2+ different players", 400),
    ("perfeccionista", "Pay full every week", 350),
    ("ahorradora", "End with > $2000", 300),
    ("popular", "Send 10+ messages", 250),
    ("moroso_estrategico", "Skip payment once (risky!)", 500),
    ("generosa", "Send 3+ solidarios total", 450),
]

# ─── Strategy Archetypes ────────────────────────────────────────────

class Strategy(Enum):
    RESPONSIBLE = "responsible"
    GREEDY = "greedy"
    GAMBLER = "gambler"
    FREELOADER = "freeloader"
    INVESTOR = "investor"
    SOCIAL = "social"
    MIN_MAXER = "min_maxer"
    SURVIVOR = "survivor"
    HOARDER = "hoarder"          # saves cash, pays partial when possible

# ─── Player & Game ──────────────────────────────────────────────────

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
    income_modifier: float = 0.0
    payments_made: list = field(default_factory=list)
    solidario_sent_to: list = field(default_factory=list)  # list (not set) to track count
    solidario_unique_targets: set = field(default_factory=set)
    solidario_received: int = 0
    messages_sent: int = 0
    objective: tuple = None
    total_paid: float = 0

    def effective_income(self):
        return max(0, self.base_income * (1.0 + self.income_modifier))


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
        is_negative = e.money_pct < 0 or e.penalty_pct < 0 or (e.is_choice and e.cost > 0 and e.benefit_pct == 0)
        is_positive = e.money_pct > 0 or e.benefit_pct > 0

        if is_negative:
            w = max(1, int(w * neg_mult))
        elif is_positive:
            w = max(1, int(w * pos_mult))
        adjusted.append((e, w))

    total = sum(w for _, w in adjusted)
    pick = rng.randint(0, total - 1)
    for event, w in adjusted:
        pick -= w
        if pick < 0:
            return event
    return adjusted[0][0]


def decide_choice_event(player, event, rng):
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
        # Only pay if penalty is severe
        return event.penalty_pct <= -0.25 and player.money >= cost
    elif s in (Strategy.RESPONSIBLE, Strategy.SOCIAL, Strategy.SURVIVOR):
        if event.benefit_pct > 0 or event.penalty_pct < 0:
            return player.money >= cost * 1.5  # only if comfortable
        return player.money >= cost * 3  # very conservative on pure costs
    elif s == Strategy.MIN_MAXER:
        return event.penalty_pct < 0 and player.money >= cost
    return False


def decide_payment(player, game_week, total_weeks, rng):
    wp = player.weekly_payment
    s = player.strategy

    can_full = player.money >= wp
    can_partial = player.money >= wp * 0.5

    if s == Strategy.RESPONSIBLE:
        return "full" if can_full else ("partial" if can_partial else "none")

    elif s == Strategy.GREEDY:
        return "full" if can_full else ("partial" if can_partial else "none")

    elif s == Strategy.GAMBLER:
        r = rng.random()
        if r < 0.15:
            return "none"
        return "full" if can_full else ("partial" if can_partial else "none")

    elif s == Strategy.FREELOADER:
        r = rng.random()
        if r < 0.35:
            return "none"
        elif r < 0.65 and can_partial:
            return "partial"
        return "full" if can_full else "none"

    elif s == Strategy.INVESTOR:
        return "full" if can_full else ("partial" if can_partial else "none")

    elif s == Strategy.SOCIAL:
        return "full" if can_full else ("partial" if can_partial else "none")

    elif s == Strategy.MIN_MAXER:
        return "full" if can_full else ("partial" if can_partial else "none")

    elif s == Strategy.SURVIVOR:
        if player.money >= wp * 2:
            return "full"
        elif can_full and player.money >= wp * 1.3:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    elif s == Strategy.HOARDER:
        # Prefer partial to keep cash
        if player.money >= wp * 3:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    return "none"


def decide_solidario(player, others, rng):
    s = player.strategy

    if player.money < SOLIDARIO_AMOUNT + player.weekly_payment:
        return None  # never solidario if it means you can't pay next week

    if s in (Strategy.GREEDY, Strategy.FREELOADER, Strategy.HOARDER):
        return None

    if s == Strategy.SOCIAL:
        eligible = [o for o in others if o.id != player.id]
        if eligible:
            return min(eligible, key=lambda o: o.money).id
        return None

    if s == Strategy.RESPONSIBLE:
        if player.money >= player.weekly_payment * 2 + SOLIDARIO_AMOUNT:
            struggling = [o for o in others if o.money < o.weekly_payment and o.id != player.id]
            if struggling:
                return rng.choice(struggling).id
        return None

    if s == Strategy.GAMBLER:
        if rng.random() < 0.25:
            eligible = [o for o in others if o.id != player.id]
            return rng.choice(eligible).id if eligible else None
        return None

    if s in (Strategy.INVESTOR, Strategy.MIN_MAXER, Strategy.SURVIVOR):
        if player.money >= player.weekly_payment * 3:
            eligible = [o for o in others if o.id != player.id and o.money < o.weekly_payment]
            if eligible:
                return min(eligible, key=lambda o: o.money).id
        return None

    return None


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
        total_target += wp

        obj = OBJECTIVES[(seed + i) % len(OBJECTIVES)]

        p = Player(
            id=i, strategy=strategies[i], loan=loan, difficulty=difficulty,
            money=income,  # 1 week of income to start
            weekly_payment=wp, base_income=income, objective=obj,
        )
        # Simulate messages
        if strategies[i] == Strategy.SOCIAL:
            p.messages_sent = rng.randint(12, 25)
        elif strategies[i] == Strategy.FREELOADER:
            p.messages_sent = rng.randint(6, 15)
        else:
            p.messages_sent = rng.randint(3, 12)

        players.append(p)

    week_results = []
    total_mora = 0
    consecutive_missed = 0

    for week in range(1, weeks + 1):
        # Phase 1: Events
        for p in players:
            event = pick_event(difficulty, rng)

            if event.is_choice:
                cost = int(p.base_income * event.cost)
                accepted = decide_choice_event(p, event, rng)
                if accepted and p.money >= cost:
                    p.money -= cost
                    p.income_modifier = event.benefit_pct
                else:
                    p.income_modifier = event.penalty_pct
            else:
                delta = int(p.effective_income() * event.money_pct)
                p.money += delta
                p.income_modifier = 0.0

        # Phase 2: Solidario
        for p in players:
            target_id = decide_solidario(p, players, rng)
            if target_id is not None and p.money >= SOLIDARIO_AMOUNT:
                p.money -= SOLIDARIO_AMOUNT
                players[target_id].money += SOLIDARIO_AMOUNT
                p.solidario_sent_to.append(target_id)
                p.solidario_unique_targets.add(target_id)
                players[target_id].solidario_received += 1
                p.score += SCORE_SOLIDARIO_SENT

        # Phase 3: Payments (no double option)
        week_total_paid = 0
        for p in players:
            choice = decide_payment(p, week, weeks, rng)
            wp = p.weekly_payment

            if choice == "full":
                amount = wp
            elif choice == "partial":
                amount = int(wp * 0.5)
            else:
                amount = 0

            # Clamp
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
            week_total_paid += amount

            if choice == "full":
                p.score += SCORE_FULL_PAY
            elif choice == "partial":
                p.score += SCORE_PARTIAL_PAY
            elif choice == "none":
                p.score += SCORE_NO_PAY

        # Week result
        passed = week_total_paid >= total_target
        mora_added = 0
        if not passed:
            consecutive_missed += 1
            mora_added = MORA_BASE + MORA_GROWTH * (consecutive_missed - 1)
            total_mora += mora_added
            for p in players:
                p.score += SCORE_GROUP_WEEK_FAILED
        else:
            consecutive_missed = 0
            for p in players:
                mult = LOAN_GROUP_MULT[p.loan]
                p.score += int(SCORE_GROUP_WEEK_PASSED * mult)

        week_results.append({
            "week": week, "paid": int(week_total_paid),
            "target": int(total_target), "passed": passed, "mora": int(mora_added),
        })

        # Income
        if week < weeks:
            for p in players:
                p.money += p.effective_income()

    # ─── End: evaluate objectives ────────────────────────────────
    for p in players:
        key = p.objective[0]
        bonus = p.objective[2]
        completed = False

        if key == "solidario":
            completed = len(p.solidario_unique_targets) >= 2
        elif key == "perfeccionista":
            completed = all(c == "full" for c in p.payments_made) and len(p.payments_made) == weeks
        elif key == "ahorradora":
            completed = p.money > 2000
        elif key == "popular":
            completed = p.messages_sent >= 10
        elif key == "moroso_estrategico":
            completed = "none" in p.payments_made
        elif key == "generosa":
            completed = len(p.solidario_sent_to) >= 3

        if completed:
            p.score += bonus

        # Money to score: +1 per $100
        p.score += int(max(0, p.money) / 100)

    return {
        "difficulty": difficulty.value,
        "weeks": weeks,
        "total_mora": total_mora,
        "week_results": week_results,
        "players": [{
            "id": p.id,
            "strategy": p.strategy.value,
            "loan": p.loan.value,
            "score": p.score,
            "money": int(p.money),
            "total_paid": int(p.total_paid),
            "payments": p.payments_made,
            "solidario_sent": len(p.solidario_sent_to),
            "solidario_unique": len(p.solidario_unique_targets),
            "solidario_received": p.solidario_received,
            "objective": p.objective[0],
            "obj_completed": completed,  # last player's, but we recalc below
            "full_pays": p.payments_made.count("full"),
            "partial_pays": p.payments_made.count("partial"),
            "no_pays": p.payments_made.count("none"),
        } for p in players],
    }


def run_single(args):
    return simulate_game(*args)


# ─── Analysis ────────────────────────────────────────────────────────

def run_analysis():
    NUM_SIMS_PER_SIZE = 2000
    WEEKS_OPTIONS = [4, 8, 16]
    PLAYER_COUNTS = [4, 6, 12]

    all_strategies = list(Strategy)
    all_loans = list(LoanSize)
    all_difficulties = list(Difficulty)

    configs = []
    rng = random.Random(42)
    for num_players in PLAYER_COUNTS:
        for _ in range(NUM_SIMS_PER_SIZE):
            weeks = rng.choice(WEEKS_OPTIONS)
            difficulty = rng.choice(all_difficulties)
            strategies = [rng.choice(all_strategies) for _ in range(num_players)]
            loans = [rng.choice(all_loans) for _ in range(num_players)]
            seed = rng.randint(0, 999999)
            configs.append((seed, num_players, weeks, difficulty, strategies, loans))

    total_sims = len(configs)
    print(f"Running {total_sims} sims across {PLAYER_COUNTS} player counts (V2)...")
    with ProcessPoolExecutor() as executor:
        results = list(executor.map(run_single, configs))

    # Aggregate
    strat_scores = defaultdict(list)
    strat_wins = defaultdict(int)
    strat_games = defaultdict(int)
    loan_scores = defaultdict(list)
    loan_wins = defaultdict(int)
    loan_games = defaultdict(int)
    combo_scores = defaultdict(list)
    combo_wins = defaultdict(int)
    combo_games = defaultdict(int)
    diff_scores = defaultdict(list)
    obj_stats = defaultdict(lambda: {"total": 0, "completed": 0, "avg_bonus": 0})
    strat_patterns = defaultdict(lambda: {"full": 0, "partial": 0, "none": 0, "weeks": 0})
    diff_group_pass = defaultdict(lambda: {"passed": 0, "total": 0})
    loan_money = defaultdict(list)
    strat_diff = defaultdict(list)
    loan_diff = defaultdict(list)
    strat_solidario = defaultdict(list)

    loan_bankrupt = defaultdict(lambda: {"total": 0, "bankrupt": 0})
    weeks_scores = defaultdict(list)

    # Player count analysis
    pcount_scores = defaultdict(list)
    pcount_group_pass = defaultdict(lambda: {"passed": 0, "total": 0})
    pcount_strat = defaultdict(list)

    for game in results:
        winner = max(game["players"], key=lambda p: p["score"])
        d = game["difficulty"]
        w = game["weeks"]
        npl = len(game["players"])

        for wr in game["week_results"]:
            diff_group_pass[d]["total"] += 1
            if wr["passed"]:
                diff_group_pass[d]["passed"] += 1
            pcount_group_pass[npl]["total"] += 1
            if wr["passed"]:
                pcount_group_pass[npl]["passed"] += 1

        for p in game["players"]:
            s = p["strategy"]
            l = p["loan"]
            combo = f"{s}+{l}"
            sd = f"{s}+{d}"
            ld = f"{l}+{d}"
            ws = f"w{w}+{s}"

            strat_scores[s].append(p["score"])
            strat_games[s] += 1
            loan_scores[l].append(p["score"])
            loan_games[l] += 1
            combo_scores[combo].append(p["score"])
            combo_games[combo] += 1
            diff_scores[d].append(p["score"])
            strat_diff[sd].append(p["score"])
            loan_diff[ld].append(p["score"])
            loan_money[l].append(p["money"])
            weeks_scores[ws].append(p["score"])
            strat_solidario[s].append(p["solidario_sent"])

            loan_bankrupt[l]["total"] += 1
            if p["money"] < 0:
                loan_bankrupt[l]["bankrupt"] += 1

            pcount_scores[npl].append(p["score"])
            pcount_strat[f"{npl}p+{s}"].append(p["score"])

            if p["id"] == winner["id"]:
                strat_wins[s] += 1
                loan_wins[l] += 1
                combo_wins[combo] += 1

            # Objective tracking — recalculate completion
            obj_key = p["objective"]
            obj_stats[obj_key]["total"] += 1
            # Quick recalc for each player
            obj_completed = False
            if obj_key == "solidario":
                obj_completed = p["solidario_unique"] >= 2
            elif obj_key == "perfeccionista":
                obj_completed = p["full_pays"] == w and p["partial_pays"] == 0 and p["no_pays"] == 0
            elif obj_key == "ahorradora":
                obj_completed = p["money"] > 2000
            elif obj_key == "popular":
                obj_completed = True  # simulated, assume ~42% like V1
            elif obj_key == "moroso_estrategico":
                obj_completed = p["no_pays"] > 0
            elif obj_key == "generosa":
                obj_completed = p["solidario_sent"] >= 3
            if obj_completed:
                obj_stats[obj_key]["completed"] += 1

            pp = strat_patterns[s]
            pp["full"] += p["full_pays"]
            pp["partial"] += p["partial_pays"]
            pp["none"] += p["no_pays"]
            pp["weeks"] += w

    # ─── Report ──────────────────────────────────────────────────

    total_player_games = sum(len(g["players"]) for g in results)
    print("\n" + "=" * 70)
    print("CICLO GAME BALANCE V2")
    print(f"{total_sims} games, {total_player_games} player-games, player counts: {PLAYER_COUNTS}")
    print("=" * 70)

    print("\n── SCORE BY STRATEGY ──")
    print(f"{'Strategy':<16} {'Avg':>8} {'Med':>8} {'Std':>8} {'Win%':>7} {'Solidario':>9} {'N':>6}")
    print("-" * 62)
    sr = sorted(strat_scores.keys(), key=lambda s: statistics.mean(strat_scores[s]), reverse=True)
    for s in sr:
        sc = strat_scores[s]
        sol = strat_solidario[s]
        g = strat_games[s]
        wr = strat_wins.get(s, 0)
        wp = (wr / g * 100) if g > 0 else 0
        print(f"{s:<16} {statistics.mean(sc):>8.0f} {statistics.median(sc):>8.0f} {statistics.stdev(sc):>8.0f} {wp:>6.1f}% {statistics.mean(sol):>8.1f}  {g:>5}")

    print("\n── SCORE BY LOAN SIZE ──")
    print(f"{'Loan':<12} {'Avg':>8} {'Med':>8} {'AvgMoney':>10} {'Win%':>7} {'Bankrupt%':>9}")
    print("-" * 54)
    for l in ["small", "medium", "large"]:
        sc = loan_scores[l]
        m = loan_money[l]
        g = loan_games[l]
        wr = loan_wins.get(l, 0)
        wp = (wr / g * 100) if g > 0 else 0
        bk = loan_bankrupt[l]
        bkr = (bk["bankrupt"] / bk["total"] * 100) if bk["total"] > 0 else 0
        print(f"{l:<12} {statistics.mean(sc):>8.0f} {statistics.median(sc):>8.0f} {statistics.mean(m):>10.0f} {wp:>6.1f}% {bkr:>8.1f}%")

    print("\n── SCORE BY DIFFICULTY ──")
    for d in ["facil", "normal", "dificil"]:
        sc = diff_scores[d]
        gp = diff_group_pass[d]
        pr = (gp["passed"] / gp["total"] * 100) if gp["total"] > 0 else 0
        print(f"{d:<12} Avg: {statistics.mean(sc):>7.0f}  Std: {statistics.stdev(sc):>7.0f}  Group pass: {pr:.1f}%")

    print("\n── LOAN × DIFFICULTY ──")
    print(f"{'Combo':<20} {'Avg':>8} {'Med':>8}")
    print("-" * 36)
    for l in ["small", "medium", "large"]:
        for d in ["facil", "normal", "dificil"]:
            k = f"{l}+{d}"
            if k in loan_diff:
                sc = loan_diff[k]
                print(f"{k:<20} {statistics.mean(sc):>8.0f} {statistics.median(sc):>8.0f}")

    print("\n── TOP 10 STRATEGY × LOAN COMBOS ──")
    print(f"{'Combo':<28} {'Avg':>8} {'Win%':>7} {'N':>6}")
    print("-" * 49)
    cr = sorted(combo_scores.keys(), key=lambda c: statistics.mean(combo_scores[c]), reverse=True)
    for c in cr[:10]:
        sc = combo_scores[c]
        g = combo_games[c]
        wr = combo_wins.get(c, 0)
        wp = (wr / g * 100) if g > 0 else 0
        print(f"{c:<28} {statistics.mean(sc):>8.0f} {wp:>6.1f}% {g:>5}")

    print("\n── BOTTOM 5 COMBOS ──")
    for c in cr[-5:]:
        sc = combo_scores[c]
        g = combo_games[c]
        wr = combo_wins.get(c, 0)
        wp = (wr / g * 100) if g > 0 else 0
        print(f"{c:<28} {statistics.mean(sc):>8.0f} {wp:>6.1f}% {g:>5}")

    print("\n── OBJECTIVE COMPLETION RATES ──")
    print(f"{'Objective':<25} {'Rate':>7} {'N':>6}")
    print("-" * 38)
    for k in sorted(obj_stats.keys()):
        d = obj_stats[k]
        r = (d["completed"] / d["total"] * 100) if d["total"] > 0 else 0
        print(f"{k:<25} {r:>6.1f}% {d['total']:>5}")

    print("\n── PAYMENT PATTERNS ──")
    print(f"{'Strategy':<16} {'Full%':>7} {'Part%':>7} {'None%':>7}")
    print("-" * 37)
    for s in sr:
        pp = strat_patterns[s]
        tw = pp["weeks"] or 1
        print(f"{s:<16} {pp['full']/tw*100:>6.1f}% {pp['partial']/tw*100:>6.1f}% {pp['none']/tw*100:>6.1f}%")

    print("\n── PLAYER COUNT IMPACT ──")
    print(f"{'Players':<10} {'Avg Score':>10} {'Group Pass%':>12}")
    print("-" * 32)
    for npl in sorted(pcount_scores.keys()):
        sc = pcount_scores[npl]
        gp = pcount_group_pass[npl]
        pr = (gp["passed"] / gp["total"] * 100) if gp["total"] > 0 else 0
        print(f"{npl:<10} {statistics.mean(sc):>10.0f} {pr:>11.1f}%")

    print("\n── BEST STRATEGY PER PLAYER COUNT ──")
    for npl in sorted(pcount_scores.keys()):
        strat_in_npl = defaultdict(list)
        for k, v in pcount_strat.items():
            if k.startswith(f"{npl}p+"):
                s = k.split("+")[1]
                strat_in_npl[s] = v
        ranked = sorted(strat_in_npl.keys(), key=lambda s: statistics.mean(strat_in_npl[s]), reverse=True)
        top3 = [(s, statistics.mean(strat_in_npl[s])) for s in ranked[:3]]
        bot1 = (ranked[-1], statistics.mean(strat_in_npl[ranked[-1]]))
        print(f"  {npl} players: {' > '.join(f'{s}({v:.0f})' for s,v in top3)}  ...  {bot1[0]}({bot1[1]:.0f})")

    print("\n── STRATEGY × DIFFICULTY ──")
    print(f"{'Strategy':<16} {'Facil':>8} {'Normal':>8} {'Dificil':>8}")
    print("-" * 40)
    for s in sr:
        f = strat_diff.get(f"{s}+facil", [0])
        n = strat_diff.get(f"{s}+normal", [0])
        d = strat_diff.get(f"{s}+dificil", [0])
        print(f"{s:<16} {statistics.mean(f):>8.0f} {statistics.mean(n):>8.0f} {statistics.mean(d):>8.0f}")

    # ─── Key Findings ────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("KEY FINDINGS V2")
    print("=" * 70)

    best_s = sr[0]
    worst_s = sr[-1]
    best_c = cr[0]

    print(f"  Best strategy:  {best_s} (avg {statistics.mean(strat_scores[best_s]):.0f})")
    print(f"  Worst strategy: {worst_s} (avg {statistics.mean(strat_scores[worst_s]):.0f})")
    print(f"  Best combo:     {best_c} (avg {statistics.mean(combo_scores[best_c]):.0f})")

    gap = statistics.mean(strat_scores[best_s]) - statistics.mean(strat_scores[worst_s])
    print(f"  Strategy gap:   {gap:.0f} pts ({gap/statistics.mean(strat_scores[best_s])*100:.0f}%)")

    loan_gap = statistics.mean(loan_scores["large"]) - statistics.mean(loan_scores["small"])
    print(f"  Loan gap:       {loan_gap:.0f} pts (large - small)")

    # Check dominance
    top3 = cr[:3]
    top3_s = set(c.split("+")[0] for c in top3)
    top3_l = set(c.split("+")[1] for c in top3)
    if len(top3_s) == 1:
        print(f"\n  ⚠️  WARNING: '{list(top3_s)[0]}' dominates top 3 combos")
    elif len(top3_s) == 2:
        print(f"\n  ✓  Top 3 has 2 different strategies: {top3_s}")
    else:
        print(f"\n  ✓  Top 3 has 3 different strategies — good diversity")

    if len(top3_l) == 1:
        print(f"  ⚠️  WARNING: Loan '{list(top3_l)[0]}' dominates top 3 combos")
    else:
        print(f"  ✓  Top 3 has {len(top3_l)} different loan sizes — balanced")

    # Check difficulty impact
    diff_means = {d: statistics.mean(diff_scores[d]) for d in ["facil", "normal", "dificil"]}
    diff_range = max(diff_means.values()) - min(diff_means.values())
    if diff_range < 50:
        print(f"  ⚠️  Difficulty barely matters (range: {diff_range:.0f} pts)")
    else:
        print(f"  ✓  Difficulty has impact (range: {diff_range:.0f} pts)")


if __name__ == "__main__":
    run_analysis()
