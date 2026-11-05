"""Rebuild retrovirus-like copies (provirus, solo LTR, lone body) from one UCSC RepeatMasker table.

    python3 -I ltr_structure.py rmsk.txt.gz ASSEMBLY out.json [MIN_LTRS]

RepeatMasker gives the body of an LTR element ("...-int") and its ends (the LTRs) separate
rows with separate names. This script puts the rows back together by position, with a fixed,
stated rule, so the page never relies on a hand-made list of which end belongs to which body.

Rule (applied to class LTR rows on primary chromosomes only):
  1. Body pieces: body rows on the same strand with a gap <= MERGE_GAP bp are one body, even
     with rows of other names in between (bridges later insertions, including LTRs).
     Its name is the "-int" name covering most bases.
  2. End pieces: other rows with the same name and strand and a gap <= MERGE_GAP bp are one LTR.
  3. An LTR on the same strand that ends within D bp before a body, or starts within D bp
     after it, belongs to that body. Each LTR goes to its nearest body only.
  4. A body with an LTR on both sides is "LTR-body-LTR"; with one, "one end"; with none, "body alone".
     An LTR with no body is "solo" under this rule.
  5. Each LTR name's partner is the body name it flanks most often, if it does so at least
     MIN_PARTNER times; found once at D = MAIN_D and kept for every D, so groups hold the same
     LTR names at every distance. Names below that bar stay unpaired and out of the groups.
  Body names end in "-int", or in "_I" / "-I" for a few internal regions named the older way.
Results are reported for D = 50, 200 and 1000 bp so the reader can see how much the rule matters.
"""
import bisect, gzip, json, re, statistics, sys
from collections import Counter, defaultdict

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
MERGE_GAP = 300
DISTANCES = [50, 200, 1000]
MAIN_D = 200
MIN_PARTNER = 10   # an LTR name joins a body's group only after at least this many flanking events
BODY_NAME = re.compile(r"(-int|[-_]I)$")  # "-int"; a few internal regions end in "_I" or "-I" (IAPLTR4_I, MamGypsy2-I)

def cons_len(strand, rep_start, rep_end, rep_left):
    # UCSC rmsk: on "+", repLeft is minus the consensus bases left after the match;
    # on "-", repStart is that number and repLeft is where the match starts.
    return rep_end + (abs(rep_start) if strand == "-" else abs(rep_left))

def read_rows(path):
    rows = defaultdict(list)  # chrom -> rows sorted later
    with gzip.open(path, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            if f[11] not in ("LTR", "LTR?") or not PRIMARY.match(f[5]):
                continue
            rows[f[5]].append({
                "chrom": f[5], "s": int(f[6]), "e": int(f[7]), "strand": f[9], "name": f[10],
                "family": f[12], "div": int(f[2]),
                "cons": cons_len(f[9], int(f[13]), int(f[14]), int(f[15])),
                "body": bool(BODY_NAME.search(f[10])),
            })
    for c in rows:
        rows[c].sort(key=lambda r: r["s"])
    return rows

def pieces(rows):
    """Merge rows into body and LTR pieces (rules 1 and 2).
    Bodies merge per strand, ends per strand and name, so rows of other names in between
    (for example a later LTR inserted inside a body) do not split a piece."""
    out, last_by_key = [], {}
    for r in rows:
        key = (r["strand"], "body") if r["body"] else (r["strand"], "end", r["name"])
        last = last_by_key.get(key)
        same = last is not None and r["s"] - last["e"] <= MERGE_GAP
        if same:
            last["e"] = max(last["e"], r["e"])
            last["rows"].append(r)
            last["bp"][r["name"]] += r["e"] - r["s"]
            last["len"] += r["e"] - r["s"]
        else:
            last_by_key[key] = {"chrom": r["chrom"], "s": r["s"], "e": r["e"], "strand": r["strand"], "body": r["body"],
                                "name": r["name"], "family": r["family"], "rows": [r],
                                "bp": Counter({r["name"]: r["e"] - r["s"]}), "len": r["e"] - r["s"]}
            out.append(last_by_key[key])
    out.sort(key=lambda p: p["s"])
    for p in out:
        p["name"] = p["bp"].most_common(1)[0][0]
        p["family"] = next(r["family"] for r in p["rows"] if r["name"] == p["name"])
        p["cons"] = max(r["cons"] for r in p["rows"] if r["name"] == p["name"])
        p["div"] = min(r["div"] for r in p["rows"])
    return out

def assemble(chrom_pieces, D):
    """Attach LTRs to bodies (rule 3). Returns per-piece role labels."""
    for p in chrom_pieces:
        p["left"] = p["right"] = None
        p["partner"] = None
    for strand in "+-":
        ltrs = [p for p in chrom_pieces if not p["body"] and p["strand"] == strand]
        bodies = [p for p in chrom_pieces if p["body"] and p["strand"] == strand]
        starts = [p["s"] for p in ltrs]
        ends = sorted((p["e"], i) for i, p in enumerate(ltrs))
        end_vals = [e for e, _ in ends]
        claims = {}  # ltr index -> (distance, body, side)
        for b in bodies:
            # nearest LTR ending within D before the body
            j = bisect.bisect_right(end_vals, b["s"] + 5) - 1
            if j >= 0:
                e, i = ends[j]
                d = b["s"] - e
                if -5 <= d <= D and ltrs[i]["s"] < b["s"]:
                    if i not in claims or d < claims[i][0]:
                        claims[i] = (d, b, "left")
            # nearest LTR starting within D after the body
            k = bisect.bisect_left(starts, b["e"] - 5)
            if k < len(ltrs):
                d = ltrs[k]["s"] - b["e"]
                if -5 <= d <= D and ltrs[k]["e"] > b["e"]:
                    if k not in claims or d < claims[k][0]:
                        claims[k] = (d, b, "right")
        for i, (d, b, side) in claims.items():
            if b[side] is None or b[side][0] > d:
                if b[side] is not None:
                    b[side][1]["partner"] = None
                b[side] = (d, ltrs[i])
                ltrs[i]["partner"] = b

def run(rows_by_chrom, D):
    all_pieces = []
    for c, rows in rows_by_chrom.items():
        ps = pieces(rows)
        assemble(ps, D)
        all_pieces.extend(ps)
    return all_pieces

def ltr_side(b, side):
    """5' or 3' end in the element's own direction."""
    if b["strand"] == "+":
        return "5p" if side == "left" else "3p"
    return "3p" if side == "left" else "5p"

def summarise(all_pieces, fixed_partner=None):
    bodies = [p for p in all_pieces if p["body"]]
    ltrs = [p for p in all_pieces if not p["body"]]
    flank = defaultdict(Counter)          # body name -> Counter of LTR names
    ltr_partner_counts = defaultdict(Counter)  # LTR name -> Counter of body names
    for b in bodies:
        for side in ("left", "right"):
            if b[side]:
                l = b[side][1]
                flank[b["name"]][l["name"]] += 1
                ltr_partner_counts[l["name"]][b["name"]] += 1
    partner = fixed_partner if fixed_partner is not None else \
        {n: c.most_common(1)[0][0] for n, c in ltr_partner_counts.items() if c.most_common(1)[0][1] >= MIN_PARTNER}
    groups = defaultdict(lambda: {"bodies": Counter(), "ltrs": Counter(), "solo_full": 0, "ltr_names": Counter(), "family": None,
                                  "ltr_div": [], "same_ends": 0})
    for b in bodies:
        kind = "both" if b["left"] and b["right"] else "one" if (b["left"] or b["right"]) else "none"
        g = groups[b["name"]]; g["bodies"][kind] += 1; g["family"] = b["family"]
        if kind == "both" and b["left"][1]["name"] == b["right"][1]["name"]:
            g["same_ends"] += 1
    for l in ltrs:
        key = partner.get(l["name"])
        if key is None:
            key = "~unpaired:" + l["family"]
        g = groups[key]
        role = "with_body" if l["partner"] else "solo"
        g["ltrs"][role] += 1
        g["ltr_names"][l["name"]] += 1
        g["ltr_div"].append(l["div"])
        if role == "solo" and l["len"] >= 0.8 * l["cons"]:
            g["solo_full"] += 1
        if g["family"] is None:
            g["family"] = l["family"]
    roles = defaultdict(Counter)  # LTR name -> 5p / 3p / solo
    for b in bodies:
        for side in ("left", "right"):
            if b[side]:
                roles[b[side][1]["name"]][ltr_side(b, side)] += 1
    for l in ltrs:
        if not l["partner"]:
            roles[l["name"]]["solo"] += 1
    fam = defaultdict(lambda: {"bodies": Counter(), "ltrs": Counter()})
    for b in bodies:
        kind = "both" if b["left"] and b["right"] else "one" if (b["left"] or b["right"]) else "none"
        fam[b["family"]]["bodies"][kind] += 1
    for l in ltrs:
        fam[l["family"]]["ltrs"]["with_body" if l["partner"] else "solo"] += 1
    spread = {n: c.most_common(3) for n, c in ltr_partner_counts.items()}
    return flank, partner, groups, fam, roles, spread

def example_provirus(by_name, body_name):
    best = None
    for b in by_name.get(body_name, []):
        if not (b["body"] and b["left"] and b["right"]):
            continue
        l, r = b["left"][1], b["right"][1]
        if l["name"] != r["name"]:
            continue
        if any(x["name"] not in (body_name, l["name"]) or x["e"] - x["s"] < 50 for x in l["rows"] + b["rows"] + r["rows"]):
            continue
        full = b["len"] / b["cons"] if b["cons"] else 0
        lfull = min(l["len"] / l["cons"], r["len"] / r["cons"]) if l["cons"] and r["cons"] else 0
        score = (round(min(full, 1.0), 2) >= 0.95 and lfull >= 0.95, -b["div"], b["len"])
        if best is None or score > best[0]:
            best = (score, b)
    if not best:
        return None
    b = best[1]
    parts = [b["left"][1], b, b["right"][1]]
    rows = sorted([r for p in parts for r in p["rows"]], key=lambda r: r["s"])
    return {"chrom": b["chrom"], "start": parts[0]["s"], "end": parts[-1]["e"], "strand": b["strand"],
            "rows": [[r["s"], r["e"], r["name"], r["div"]] for r in rows]}

def example_solo(by_name, ltr_names):
    best = None
    for l in (x for n in ltr_names for x in by_name.get(n, [])):
        if l["body"] or l["partner"] or not l["cons"] or len(l["rows"]) != 1:
            continue
        score = (l["len"] >= 0.95 * l["cons"], -l["div"])
        if best is None or score > best[0]:
            best = (score, l)
    if not best:
        return None
    l = best[1]
    return {"chrom": l["chrom"], "start": l["s"], "end": l["e"], "strand": l["strand"],
            "rows": [[r["s"], r["e"], r["name"], r["div"]] for r in l["rows"]]}

def main(rmsk_path, assembly, out_path, min_ltrs="50"):
    rows = read_rows(rmsk_path)
    result = {"assembly": assembly, "rule": {"merge_gap": MERGE_GAP, "distances": DISTANCES, "main": MAIN_D}, "byD": {}}
    # Group membership (which body an LTR name belongs to) is fixed at the main distance,
    # so every distance reports on the same LTRs.
    fixed = summarise(run(rows, MAIN_D))[1]
    for D in DISTANCES:
        ps = run(rows, D)
        flank, partner, groups, fam, roles, spread = summarise(ps, fixed)
        entry = {
            "families": {f: {"bodies": dict(v["bodies"]), "ltrs": dict(v["ltrs"])} for f, v in fam.items()},
            "groups": {k: {"family": v["family"], "bodies": dict(v["bodies"]), "ltrs": dict(v["ltrs"]),
                           "solo_full": v["solo_full"], "ltr_names": v["ltr_names"].most_common(8),
                           "same_ends": v["same_ends"],
                           "ltr_div_median": statistics.median(v["ltr_div"]) if v["ltr_div"] else None}
                       for k, v in groups.items()},
            "roles": {n: dict(c) for n, c in roles.items()},
        }
        if D == MAIN_D:
            entry["flank"] = {b: c.most_common(8) for b, c in flank.items()}
            entry["partner"] = partner
            entry["spread"] = spread
            entry["examples"] = {}
            by_name = defaultdict(list)
            for p in ps:
                by_name[p["name"]].append(p)
            for body, g in groups.items():
                if body.startswith("~") or sum(g["ltrs"].values()) < int(min_ltrs):
                    continue
                names = [n for n, p in partner.items() if p == body]
                pv, so = example_provirus(by_name, body), example_solo(by_name, names)
                if pv and so:
                    entry["examples"][body] = {"provirus": pv, "solo": so}
        result["byD"][str(D)] = entry
        g = sorted(entry["groups"].items(), key=lambda kv: -(sum(kv[1]["ltrs"].values())))[:6]
        print(f"D={D}: " + "; ".join(f"{k}: bodies {v['bodies']} ltrs {v['ltrs']}" for k, v in g))
    with open(out_path, "w") as out:
        json.dump(result, out, separators=(",", ":"))

if __name__ == "__main__":
    main(*sys.argv[1:5])
