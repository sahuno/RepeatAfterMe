"""Build the data file for the "Body and ends" lesson.

    python3 -I build_ltr_json.py mouse_ltr.json human_ltr.json mouse_pair.json human_pair.json ltr.js

Inputs are the outputs of ltr_structure.py and ltr_pair_identity.py, one per species.
Keeps groups (a body name and the LTR names whose most frequent partner it is) with at least
MIN_LTRS LTR pieces, LTR names with at least MIN_ROLE pieces, and computes the rank correlation
between a group's median LTR divergence and its share of solo LTRs.
"""
import json, sys

MIN_LTRS = 50
MIN_ROLE = 50

def spearman(xs, ys):
    def rank(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
                j += 1
            for k in range(i, j + 1):
                r[order[k]] = (i + j) / 2
            i = j + 1
        return r
    if len(xs) < 3:
        return 0.0
    rx, ry = rank(xs), rank(ys)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return num / den if den else 0.0

def species(path, pair_path):
    d = json.load(open(path))
    pair = json.load(open(pair_path))
    out = {"assembly": d["assembly"], "rule": d["rule"], "byD": {}, "pair": pair}
    for D, e in d["byD"].items():
        groups = {}
        for k, g in e["groups"].items():
            n = sum(g["ltrs"].values())
            if k.startswith("~") or n < MIN_LTRS:
                continue
            groups[k] = {"f": g["family"], "b": [g["bodies"].get("both", 0), g["bodies"].get("one", 0), g["bodies"].get("none", 0)],
                         "l": [g["ltrs"].get("with_body", 0), g["ltrs"].get("solo", 0)], "sf": g["solo_full"],
                         "se": g["same_ends"], "div": g["ltr_div_median"], "names": g["ltr_names"]}
        both = sum(g["b"][0] for g in groups.values())
        same = sum(g["se"] for g in groups.values())
        pts = [(g["div"], g["l"][1] / sum(g["l"])) for g in groups.values() if g["div"] is not None]
        entry = {"groups": groups, "sameEnds": [same, both],
                 "rho": None if len(pts) < 3 else round(spearman([p[0] for p in pts], [p[1] for p in pts]), 2), "nGroups": len(pts)}
        if "flank" in e:
            entry["flank"] = {b: v for b, v in e["flank"].items() if b in groups}
            entry["roles"] = {n: r for n, r in e["roles"].items() if sum(r.values()) >= MIN_ROLE}
            entry["spread"] = {n: v for n, v in e["spread"].items() if n in entry["roles"]}
            entry["examples"] = e["examples"]
        out["byD"][D] = entry
    return out

def main(m, h, mp, hp, out_path):
    data = {"species": {"mouse": species(m, mp), "human": species(h, hp)},
            "validation": {"source": "Subramanian et al. 2011, Retrovirology 8:90", "doi": "10.1186/1742-4690-8-90",
                           "build": "GRCh37/hg19", "proviruses": 91, "soloLTRs": 944, "soloRule": "longer than 750 bp"}}
    with open(out_path, "w") as fh:
        fh.write("window.LTR_DATA=")
        json.dump(data, fh, separators=(",", ":"))
        fh.write(";\n")

if __name__ == "__main__":
    main(*sys.argv[1:6])
