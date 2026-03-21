#!/usr/bin/env python3
"""
CICLO Game Balance Simulator
Monte Carlo simulation testing different player strategies across
loan sizes, difficulties, and behavioral archetypes.

Runs thousands of games in parallel to find exploitable mechanics.
"""

import random
import statistics
from dataclasses import dataclass, field
from enum import Enum
from concurrent.futures import ProcessPoolExecutor
from collections import defaultdict
import json

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

# Income scales with loan — bigger business = more revenue
LOAN_INCOME = {
    LoanSize.SMALL: 1000,
    LoanSize.MEDIUM: 1250,
    LoanSize.LARGE: 1500,
}

TASA = {
    Difficulty.FACIL: 65,
    Difficulty.NORMAL: 75,
    Difficulty.DIFICIL: 85,
}

# Scoring
SCORE_FULL_PAY = 100
SCORE_DOUBLE_PAY = 250
SCORE_PARTIAL_PAY = 25
SCORE_NO_PAY = 0
SCORE_SOLIDARIO_SENT = 75
SCORE_GROUP_WEEK_PASSED = 50
SCORE_PROMISE_KEPT = 30
SCORE_PROMISE_BROKEN = -50

LOAN_SCORE_MULT = {
    LoanSize.SMALL: 1.0,
    LoanSize.MEDIUM: 1.2,
    LoanSize.LARGE: 1.5,
}

SOLIDARIO_AMOUNT = 200
MORA_BASE = 45
MORA_GROWTH = 15

# ─── Events ──────────────────────────────────────────────────────────

@dataclass
class EventDef:
    key: str
    is_choice: bool  # passive vs active
    # For passive events: pct of income
    money_pct: float  # e.g. +0.20 = +20% of income, -0.15 = -15%
    # For choice events:
    cost: float  # pct of income to pay
    benefit_pct: float  # income boost next week if paid
    penalty_pct: float  # income loss next week if not paid
    weight: int
    category: str  # "business", "personal", "investment", "universal"

# Passive events — percentage of weekly income
PASSIVE_EVENTS = [
    EventDef("dia_normal", False, 0.0, 0, 0, 0, 10, "business"),
    EventDef("cliente_habitual", False, 0.0, 0, 0, 0, 8, "business"),
    EventDef("dia_lento", False, 0.0, 0, 0, 0, 6, "business"),
    EventDef("buena_venta", False, 0.20, 0, 0, 0, 3, "business"),
    EventDef("pedido_grande", False, 0.25, 0, 0, 0, 3, "business"),
    EventDef("dia_nino", False, 0.25, 0, 0, 0, 2, "universal"),
    EventDef("buen_fin", False, 0.15, 0, 0, 0, 2, "universal"),
    EventDef("perdida_mercancia", False, -0.15, 0, 0, 0, 3, "business"),
    EventDef("pocos_clientes", False, -0.10, 0, 0, 0, 3, "universal"),
    EventDef("robo", False, -0.20, 0, 0, 0, 1, "universal"),
]

# Choice events — player decides to pay or not
CHOICE_EVENTS = [
    # Repair: pay 25% income now or lose 20% income next week
    EventDef("reparacion", True, 0, 0.25, 0.0, -0.20, 3, "business"),
    # Investment: pay 30% income now, gain 20% income next week
    EventDef("inversion", True, 0, 0.30, 0.20, 0.0, 2, "investment"),
    # Family expense: pay 15% income (pure cost, no game benefit — but might help objectives)
    EventDef("gasto_familiar", True, 0, 0.15, 0.0, 0.0, 2, "personal"),
    # Big investment: pay 50% income, gain 30% next week
    EventDef("expansion", True, 0, 0.50, 0.30, 0.0, 1, "investment"),
]

ALL_EVENTS = PASSIVE_EVENTS + CHOICE_EVENTS
TOTAL_EVENT_WEIGHT = sum(e.weight for e in ALL_EVENTS)

# Difficulty affects event distribution
DIFFICULTY_NEGATIVE_MULT = {
    Difficulty.FACIL: 0.6,
    Difficulty.NORMAL: 1.0,
    Difficulty.DIFICIL: 1.5,
}

# ─── Secret Objectives ──────────────────────────────────────────────

OBJECTIVES = [
    ("solidario", "Send solidario to 2+ different players", 500),
    ("perfeccionista", "Pay full every week", 500),
    ("generoso", "Pay double at least once", 400),
    ("ahorradora", "End with > $3000", 400),
    ("popular", "Send 10+ messages (simulated)", 300),
    ("moroso_estrategico", "Skip payment at least once", 600),
]

# ─── Strategy Archetypes ────────────────────────────────────────────

class Strategy(Enum):
    RESPONSIBLE = "responsible"        # Always pays full, sends solidario when able
    GREEDY = "greedy"                  # Pays full but never solidario, hoards cash
    GAMBLER = "gambler"                # Pays double sometimes, skips sometimes
    FREELOADER = "freeloader"          # Pays partial/none, asks for solidario
    INVESTOR = "investor"              # Always takes investment events, pays full
    SOCIAL = "social"                  # Pays full, always sends solidario, keeps promises
    MIN_MAXER = "min_maxer"            # Tries to optimize score: large loan, always full
    SURVIVOR = "survivor"              # Pays full when can, partial when low, conservative
    DOUBLE_SPAMMER = "double_spammer"  # Always tries to pay double for max points

# ─── Player & Game State ────────────────────────────────────────────

@dataclass
class Player:
    id: int
    strategy: Strategy
    loan: LoanSize
    difficulty: Difficulty  # shared per game but stored for convenience
    money: float = 0
    score: int = 0
    weekly_payment: float = 0
    base_income: float = 0
    income_modifier: float = 0.0  # temporary +/- from choice events
    payments_made: list = field(default_factory=list)  # "full"/"partial"/"none"/"double"
    solidario_sent_to: set = field(default_factory=set)
    solidario_received: int = 0
    promises_made: int = 0
    promises_kept: int = 0
    messages_sent: int = 0
    objective: tuple = None  # (key, desc, bonus)
    total_paid: float = 0

    def effective_income(self):
        return self.base_income * (1.0 + self.income_modifier)


@dataclass
class WeekResult:
    week: int
    total_paid: float
    target: float
    passed: bool
    mora_added: float


@dataclass
class GameResult:
    difficulty: Difficulty
    weeks: int
    players: list  # list of player summaries
    week_results: list
    total_mora: float


def calc_weekly_payment(credit, weeks, difficulty):
    tasa = TASA[difficulty]
    interest = (credit / 1000) * tasa
    return (credit + interest) / weeks


def pick_event(difficulty, rng):
    """Pick a weighted random event, adjusting negative weights by difficulty."""
    mult = DIFFICULTY_NEGATIVE_MULT[difficulty]
    adjusted = []
    for e in ALL_EVENTS:
        w = e.weight
        if e.money_pct < 0 or e.penalty_pct < 0:
            w = max(1, int(w * mult))
        adjusted.append((e, w))

    total = sum(w for _, w in adjusted)
    pick = rng.randint(0, total - 1)
    for event, w in adjusted:
        pick -= w
        if pick < 0:
            return event
    return adjusted[0][0]


def decide_choice_event(player, event, rng):
    """Should this player pay the cost of a choice event?"""
    cost = int(player.base_income * event.cost)
    s = player.strategy

    if s == Strategy.INVESTOR:
        # Always invest/repair if can afford
        return player.money >= cost
    elif s == Strategy.GREEDY:
        # Only repair (avoid penalty), skip investments
        return event.penalty_pct < 0 and player.money >= cost
    elif s == Strategy.FREELOADER:
        # Never pay for events
        return False
    elif s == Strategy.GAMBLER:
        return rng.random() > 0.4 and player.money >= cost
    elif s in (Strategy.RESPONSIBLE, Strategy.SOCIAL, Strategy.SURVIVOR):
        # Pay if affordable and beneficial
        if event.benefit_pct > 0 or event.penalty_pct < 0:
            return player.money >= cost
        return player.money >= cost * 2  # only if comfortable for pure costs
    elif s in (Strategy.MIN_MAXER, Strategy.DOUBLE_SPAMMER):
        # Pay repairs, skip pure costs
        return event.penalty_pct < 0 and player.money >= cost
    return False


def decide_payment(player, game_week, total_weeks, rng):
    """Decide payment choice based on strategy."""
    wp = player.weekly_payment
    s = player.strategy

    can_full = player.money >= wp
    can_double = player.money >= wp * 2
    can_partial = player.money >= wp * 0.5

    if s == Strategy.RESPONSIBLE:
        if can_full:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    elif s == Strategy.GREEDY:
        if can_full:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    elif s == Strategy.GAMBLER:
        r = rng.random()
        if r < 0.2 and can_double:
            return "double"
        elif r < 0.3:
            return "none"  # skip for fun
        elif can_full:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    elif s == Strategy.FREELOADER:
        r = rng.random()
        if r < 0.4:
            return "none"
        elif r < 0.7 and can_partial:
            return "partial"
        elif can_full:
            return "full"
        return "none"

    elif s == Strategy.INVESTOR:
        if can_full:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    elif s == Strategy.SOCIAL:
        if can_full:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    elif s == Strategy.MIN_MAXER:
        # Always full, try double near end for bonus
        if game_week >= total_weeks - 2 and can_double:
            return "double"
        elif can_full:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    elif s == Strategy.SURVIVOR:
        # Conservative: full if comfortable, partial if tight
        if player.money >= wp * 2:
            return "full"
        elif can_full and player.money >= wp * 1.3:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    elif s == Strategy.DOUBLE_SPAMMER:
        if can_double:
            return "double"
        elif can_full:
            return "full"
        elif can_partial:
            return "partial"
        return "none"

    return "none"


def decide_solidario(player, others, rng):
    """Decide whether to send solidario and to whom."""
    s = player.strategy

    if player.money < SOLIDARIO_AMOUNT:
        return None

    if s == Strategy.GREEDY or s == Strategy.FREELOADER:
        return None

    if s == Strategy.SOCIAL:
        # Always send if possible, prefer lowest money
        eligible = [o for o in others if o.id != player.id]
        if eligible:
            target = min(eligible, key=lambda o: o.money)
            return target.id

    if s == Strategy.RESPONSIBLE:
        # Send if someone is struggling and we have buffer
        if player.money >= player.weekly_payment + SOLIDARIO_AMOUNT * 1.5:
            struggling = [o for o in others if o.money < o.weekly_payment and o.id != player.id]
            if struggling:
                return rng.choice(struggling).id
        return None

    if s == Strategy.GAMBLER:
        if rng.random() < 0.3:
            eligible = [o for o in others if o.id != player.id]
            if eligible:
                return rng.choice(eligible).id
        return None

    if s in (Strategy.INVESTOR, Strategy.MIN_MAXER, Strategy.DOUBLE_SPAMMER, Strategy.SURVIVOR):
        # Only if very comfortable
        if player.money >= player.weekly_payment * 3:
            eligible = [o for o in others if o.id != player.id]
            if eligible:
                return min(eligible, key=lambda o: o.money).id
        return None

    return None


# ─── Simulate One Game ──────────────────────────────────────────────

def simulate_game(seed, num_players, weeks, difficulty, strategies, loans):
    """Run a single game simulation. Returns GameResult."""
    rng = random.Random(seed)

    players = []
    total_target = 0

    for i in range(num_players):
        loan = loans[i]
        credit = LOAN_CREDIT[loan]
        wp = calc_weekly_payment(credit, weeks, difficulty)
        income = LOAN_INCOME[loan]
        total_target += wp

        # Assign objective
        obj = OBJECTIVES[(seed + i) % len(OBJECTIVES)]

        p = Player(
            id=i,
            strategy=strategies[i],
            loan=loan,
            difficulty=difficulty,
            money=income,  # start with 1 week of income (savings)
            weekly_payment=wp,
            base_income=income,
            objective=obj,
        )
        # Simulate message count based on strategy
        if strategies[i] == Strategy.SOCIAL:
            p.messages_sent = rng.randint(12, 25)
        elif strategies[i] == Strategy.FREELOADER:
            p.messages_sent = rng.randint(8, 15)
        else:
            p.messages_sent = rng.randint(3, 12)

        players.append(p)

    week_results = []
    total_mora = 0
    consecutive_missed = 0

    for week in range(1, weeks + 1):
        # Phase 1: Events
        for p in players:
            # Apply any pending income modifier from last week's choice
            # (modifier is already set, will be used in effective_income)

            event = pick_event(difficulty, rng)

            if event.is_choice:
                cost = int(p.base_income * event.cost)
                accepted = decide_choice_event(p, event, rng)
                if accepted and p.money >= cost:
                    p.money -= cost
                    # Benefit applies next week
                    p.income_modifier = event.benefit_pct
                else:
                    # Penalty applies next week
                    p.income_modifier = event.penalty_pct
            else:
                # Passive event: immediate money change
                delta = int(p.effective_income() * event.money_pct)
                p.money += delta
                p.income_modifier = 0.0  # reset modifier

        # Phase 2: Solidario
        for p in players:
            target_id = decide_solidario(p, players, rng)
            if target_id is not None:
                p.money -= SOLIDARIO_AMOUNT
                players[target_id].money += SOLIDARIO_AMOUNT
                p.solidario_sent_to.add(target_id)
                players[target_id].solidario_received += 1
                p.score += SCORE_SOLIDARIO_SENT

        # Phase 3: Payments
        week_total_paid = 0
        for p in players:
            choice = decide_payment(p, week, weeks, rng)
            wp = p.weekly_payment

            if choice == "full":
                amount = wp
            elif choice == "double":
                amount = wp * 2
            elif choice == "partial":
                amount = int(wp * 0.5)
            else:
                amount = 0

            # Clamp to available money
            if amount > p.money:
                if p.money >= wp:
                    choice = "full"
                    amount = wp
                elif p.money >= int(wp * 0.5):
                    choice = "partial"
                    amount = int(wp * 0.5)
                else:
                    choice = "none"
                    amount = 0

            p.money -= amount
            p.total_paid += amount
            p.payments_made.append(choice)
            week_total_paid += amount

            # Score payment
            mult = LOAN_SCORE_MULT[p.loan]
            if choice == "full":
                p.score += int(SCORE_FULL_PAY * mult)
            elif choice == "double":
                p.score += int(SCORE_DOUBLE_PAY * mult)
            elif choice == "partial":
                p.score += SCORE_PARTIAL_PAY
            # none = 0

        # Week result
        passed = week_total_paid >= total_target
        mora_added = 0
        if not passed:
            consecutive_missed += 1
            mora_added = MORA_BASE + MORA_GROWTH * (consecutive_missed - 1)
            total_mora += mora_added
        else:
            consecutive_missed = 0
            # Group bonus for everyone
            for p in players:
                p.score += SCORE_GROUP_WEEK_PASSED

        week_results.append(WeekResult(week, week_total_paid, total_target, passed, mora_added))

        # Phase 4: Income (between weeks)
        if week < weeks:
            for p in players:
                p.money += p.effective_income()

    # ─── End of game: evaluate objectives ────────────────────────
    for p in players:
        key = p.objective[0]
        bonus = p.objective[2]
        completed = False

        if key == "solidario":
            completed = len(p.solidario_sent_to) >= 2
        elif key == "perfeccionista":
            completed = all(c == "full" for c in p.payments_made) and len(p.payments_made) == weeks
        elif key == "generoso":
            completed = "double" in p.payments_made
        elif key == "ahorradora":
            completed = p.money > 3000
        elif key == "popular":
            completed = p.messages_sent >= 10
        elif key == "moroso_estrategico":
            completed = "none" in p.payments_made

        if completed:
            p.score += bonus
            p.money += bonus  # bonus is also money

        # Money-to-score: +1 per $100 remaining
        p.score += int(p.money / 100)

    return GameResult(
        difficulty=difficulty,
        weeks=weeks,
        players=[{
            "id": p.id,
            "strategy": p.strategy.value,
            "loan": p.loan.value,
            "score": p.score,
            "money": int(p.money),
            "total_paid": int(p.total_paid),
            "payments": p.payments_made,
            "solidario_sent": len(p.solidario_sent_to),
            "solidario_received": p.solidario_received,
            "objective": p.objective[0],
            "obj_completed": (
                len(p.solidario_sent_to) >= 2 if p.objective[0] == "solidario" else
                all(c == "full" for c in p.payments_made) if p.objective[0] == "perfeccionista" else
                "double" in p.payments_made if p.objective[0] == "generoso" else
                p.money > 3000 if p.objective[0] == "ahorradora" else
                p.messages_sent >= 10 if p.objective[0] == "popular" else
                "none" in p.payments_made
            ),
            "full_pays": p.payments_made.count("full"),
            "double_pays": p.payments_made.count("double"),
            "partial_pays": p.payments_made.count("partial"),
            "no_pays": p.payments_made.count("none"),
        } for p in players],
        week_results=[{
            "week": r.week,
            "paid": int(r.total_paid),
            "target": int(r.target),
            "passed": r.passed,
            "mora": int(r.mora_added),
        } for r in week_results],
        total_mora=total_mora,
    )


def run_single(args):
    """Wrapper for multiprocessing."""
    return simulate_game(*args)


# ─── Analysis ────────────────────────────────────────────────────────

def run_analysis():
    NUM_SIMS = 5000
    WEEKS_OPTIONS = [4, 8, 16]
    NUM_PLAYERS = 4

    all_strategies = list(Strategy)
    all_loans = list(LoanSize)
    all_difficulties = list(Difficulty)

    # Generate simulation configs
    configs = []
    rng = random.Random(42)

    for sim_id in range(NUM_SIMS):
        weeks = rng.choice(WEEKS_OPTIONS)
        difficulty = rng.choice(all_difficulties)
        strategies = [rng.choice(all_strategies) for _ in range(NUM_PLAYERS)]
        loans = [rng.choice(all_loans) for _ in range(NUM_PLAYERS)]
        seed = rng.randint(0, 999999)
        configs.append((seed, NUM_PLAYERS, weeks, difficulty, strategies, loans))

    # Run in parallel
    print(f"Running {NUM_SIMS} simulations with {NUM_PLAYERS} players each...")
    with ProcessPoolExecutor() as executor:
        results = list(executor.map(run_single, configs))

    # ─── Aggregate stats ─────────────────────────────────────────

    # 1. Score by strategy
    strat_scores = defaultdict(list)
    strat_wins = defaultdict(int)
    strat_games = defaultdict(int)

    # 2. Score by loan size
    loan_scores = defaultdict(list)
    loan_wins = defaultdict(int)
    loan_games = defaultdict(int)

    # 3. Score by strategy × loan
    combo_scores = defaultdict(list)
    combo_wins = defaultdict(int)
    combo_games = defaultdict(int)

    # 4. Score by difficulty
    diff_scores = defaultdict(list)

    # 5. Objective completion rates
    obj_completions = defaultdict(lambda: {"total": 0, "completed": 0})

    # 6. Payment pattern stats
    strat_payment_patterns = defaultdict(lambda: {"full": 0, "partial": 0, "none": 0, "double": 0, "weeks": 0})

    # 7. Group pass rates by difficulty
    diff_group_pass = defaultdict(lambda: {"passed": 0, "total": 0})

    # 8. Money by loan
    loan_final_money = defaultdict(list)

    # 9. Score by strategy × difficulty
    strat_diff_scores = defaultdict(list)

    # 10. Double pay analysis
    double_pay_scores = []
    no_double_pay_scores = []

    for game in results:
        winner = max(game.players, key=lambda p: p["score"])

        for p in game.players:
            s = p["strategy"]
            l = p["loan"]
            combo = f"{s}+{l}"
            sd = f"{s}+{game.difficulty.value}"

            strat_scores[s].append(p["score"])
            strat_games[s] += 1
            loan_scores[l].append(p["score"])
            loan_games[l] += 1
            combo_scores[combo].append(p["score"])
            combo_games[combo] += 1
            diff_scores[game.difficulty.value].append(p["score"])
            strat_diff_scores[sd].append(p["score"])
            loan_final_money[l].append(p["money"])

            if p["id"] == winner["id"]:
                strat_wins[s] += 1
                loan_wins[l] += 1
                combo_wins[combo] += 1

            obj_completions[p["objective"]]["total"] += 1
            if p["obj_completed"]:
                obj_completions[p["objective"]]["completed"] += 1

            pp = strat_payment_patterns[s]
            pp["full"] += p["full_pays"]
            pp["double"] += p["double_pays"]
            pp["partial"] += p["partial_pays"]
            pp["none"] += p["no_pays"]
            pp["weeks"] += game.weeks

            if p["double_pays"] > 0:
                double_pay_scores.append(p["score"])
            else:
                no_double_pay_scores.append(p["score"])

        for wr in game.week_results:
            diff_group_pass[game.difficulty.value]["total"] += 1
            if wr["passed"]:
                diff_group_pass[game.difficulty.value]["passed"] += 1

    # ─── Print Report ────────────────────────────────────────────

    print("\n" + "=" * 70)
    print("CICLO GAME BALANCE ANALYSIS")
    print(f"{NUM_SIMS} games × {NUM_PLAYERS} players = {NUM_SIMS * NUM_PLAYERS} player-games")
    print("=" * 70)

    # Strategy rankings
    print("\n── SCORE BY STRATEGY ──")
    print(f"{'Strategy':<20} {'Avg Score':>10} {'Median':>10} {'StdDev':>10} {'Win%':>8} {'Games':>8}")
    print("-" * 66)
    strat_ranking = sorted(strat_scores.keys(), key=lambda s: statistics.mean(strat_scores[s]), reverse=True)
    for s in strat_ranking:
        scores = strat_scores[s]
        avg = statistics.mean(scores)
        med = statistics.median(scores)
        std = statistics.stdev(scores) if len(scores) > 1 else 0
        wins = strat_wins.get(s, 0)
        games = strat_games[s]
        win_pct = (wins / (games / NUM_PLAYERS)) * 100 if games > 0 else 0
        print(f"{s:<20} {avg:>10.1f} {med:>10.1f} {std:>10.1f} {win_pct:>7.1f}% {games:>8}")

    # Loan size rankings
    print("\n── SCORE BY LOAN SIZE ──")
    print(f"{'Loan':<20} {'Avg Score':>10} {'Median':>10} {'Avg Money':>10} {'Win%':>8} {'Games':>8}")
    print("-" * 66)
    for l in [ls.value for ls in LoanSize]:
        scores = loan_scores[l]
        money = loan_final_money[l]
        avg = statistics.mean(scores)
        med = statistics.median(scores)
        avg_m = statistics.mean(money)
        wins = loan_wins.get(l, 0)
        games = loan_games[l]
        win_pct = (wins / (games / NUM_PLAYERS)) * 100 if games > 0 else 0
        print(f"{l:<20} {avg:>10.1f} {med:>10.1f} {avg_m:>10.1f} {win_pct:>7.1f}% {games:>8}")

    # Top combos (strategy × loan)
    print("\n── TOP 15 STRATEGY × LOAN COMBOS (by avg score) ──")
    print(f"{'Combo':<30} {'Avg Score':>10} {'Win%':>8} {'Games':>8}")
    print("-" * 56)
    combo_ranking = sorted(combo_scores.keys(), key=lambda c: statistics.mean(combo_scores[c]), reverse=True)
    for c in combo_ranking[:15]:
        scores = combo_scores[c]
        avg = statistics.mean(scores)
        wins = combo_wins.get(c, 0)
        games = combo_games[c]
        win_pct = (wins / (games / NUM_PLAYERS)) * 100 if games > 0 else 0
        print(f"{c:<30} {avg:>10.1f} {win_pct:>7.1f}% {games:>8}")

    # Bottom 5 combos
    print("\n── BOTTOM 5 STRATEGY × LOAN COMBOS ──")
    for c in combo_ranking[-5:]:
        scores = combo_scores[c]
        avg = statistics.mean(scores)
        wins = combo_wins.get(c, 0)
        games = combo_games[c]
        win_pct = (wins / (games / NUM_PLAYERS)) * 100 if games > 0 else 0
        print(f"{c:<30} {avg:>10.1f} {win_pct:>7.1f}% {games:>8}")

    # Difficulty analysis
    print("\n── SCORE BY DIFFICULTY ──")
    for d in ["facil", "normal", "dificil"]:
        scores = diff_scores[d]
        gp = diff_group_pass[d]
        pass_rate = (gp["passed"] / gp["total"] * 100) if gp["total"] > 0 else 0
        print(f"{d:<12} Avg: {statistics.mean(scores):>8.1f}  Group pass rate: {pass_rate:.1f}%")

    # Strategy × difficulty
    print("\n── STRATEGY × DIFFICULTY (avg score) ──")
    print(f"{'Strategy':<20} {'Facil':>10} {'Normal':>10} {'Dificil':>10}")
    print("-" * 50)
    for s in strat_ranking:
        facil = strat_diff_scores.get(f"{s}+facil", [0])
        normal = strat_diff_scores.get(f"{s}+normal", [0])
        dificil = strat_diff_scores.get(f"{s}+dificil", [0])
        print(f"{s:<20} {statistics.mean(facil):>10.1f} {statistics.mean(normal):>10.1f} {statistics.mean(dificil):>10.1f}")

    # Objective completion rates
    print("\n── SECRET OBJECTIVE COMPLETION RATES ──")
    print(f"{'Objective':<25} {'Rate':>8} {'Total':>8}")
    print("-" * 41)
    for obj_key in sorted(obj_completions.keys()):
        data = obj_completions[obj_key]
        rate = (data["completed"] / data["total"] * 100) if data["total"] > 0 else 0
        print(f"{obj_key:<25} {rate:>7.1f}% {data['total']:>8}")

    # Payment patterns by strategy
    print("\n── PAYMENT PATTERNS BY STRATEGY (% of weeks) ──")
    print(f"{'Strategy':<20} {'Full%':>8} {'Double%':>8} {'Partial%':>8} {'None%':>8}")
    print("-" * 52)
    for s in strat_ranking:
        pp = strat_payment_patterns[s]
        total_weeks = pp["weeks"] if pp["weeks"] > 0 else 1
        print(f"{s:<20} {pp['full']/total_weeks*100:>7.1f}% {pp['double']/total_weeks*100:>7.1f}% {pp['partial']/total_weeks*100:>7.1f}% {pp['none']/total_weeks*100:>7.1f}%")

    # Double pay analysis
    print("\n── DOUBLE PAY ANALYSIS ──")
    if double_pay_scores:
        print(f"Players who used double:     Avg={statistics.mean(double_pay_scores):.1f}  N={len(double_pay_scores)}")
    if no_double_pay_scores:
        print(f"Players who never doubled:   Avg={statistics.mean(no_double_pay_scores):.1f}  N={len(no_double_pay_scores)}")

    # Survival analysis — how often do players go bankrupt (money < 0)?
    print("\n── SURVIVAL ANALYSIS (final money < 0) ──")
    for l in [ls.value for ls in LoanSize]:
        money = loan_final_money[l]
        bankrupt = sum(1 for m in money if m < 0)
        rate = bankrupt / len(money) * 100 if money else 0
        avg_neg = statistics.mean([m for m in money if m < 0]) if any(m < 0 for m in money) else 0
        print(f"{l:<12} Bankrupt: {rate:.1f}%  Avg negative: ${avg_neg:.0f}")

    # Key findings
    print("\n" + "=" * 70)
    print("KEY FINDINGS")
    print("=" * 70)

    best_strat = strat_ranking[0]
    worst_strat = strat_ranking[-1]
    best_combo = combo_ranking[0]
    worst_combo = combo_ranking[-1]

    print(f"  Best strategy:  {best_strat} (avg {statistics.mean(strat_scores[best_strat]):.0f} pts)")
    print(f"  Worst strategy: {worst_strat} (avg {statistics.mean(strat_scores[worst_strat]):.0f} pts)")
    print(f"  Best combo:     {best_combo} (avg {statistics.mean(combo_scores[best_combo]):.0f} pts)")
    print(f"  Worst combo:    {worst_combo} (avg {statistics.mean(combo_scores[worst_combo]):.0f} pts)")

    gap = statistics.mean(strat_scores[best_strat]) - statistics.mean(strat_scores[worst_strat])
    print(f"  Strategy gap:   {gap:.0f} pts ({gap/statistics.mean(strat_scores[best_strat])*100:.0f}% of best)")

    loan_gap = statistics.mean(loan_scores["large"]) - statistics.mean(loan_scores["small"])
    print(f"  Loan gap:       {loan_gap:.0f} pts (large - small)")

    if double_pay_scores and no_double_pay_scores:
        d_gap = statistics.mean(double_pay_scores) - statistics.mean(no_double_pay_scores)
        print(f"  Double pay gap: {d_gap:.0f} pts (users vs non-users)")

    # Check if any combo is clearly dominant
    top3 = combo_ranking[:3]
    top3_strats = set(c.split("+")[0] for c in top3)
    top3_loans = set(c.split("+")[1] for c in top3)
    if len(top3_strats) == 1:
        print(f"\n  ⚠️  WARNING: Strategy '{list(top3_strats)[0]}' dominates all top combos")
    if len(top3_loans) == 1:
        print(f"\n  ⚠️  WARNING: Loan '{list(top3_loans)[0]}' dominates all top combos")


if __name__ == "__main__":
    run_analysis()
