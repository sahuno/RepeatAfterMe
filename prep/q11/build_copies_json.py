"""Build site/data/copies.js for lesson 11 (which copies) from the small tables pulled from iris.

    python3 -I build_copies_json.py data/q11 data/q12/mouse.mm10.context_pc.tsv site/data/copies.js

Inputs: data/q11/mouse.mm10.L1Md_T.tiles.copy_unique.tsv (tally_tiles.py), data/q11/mouse.mm10.L1Md_T.k3_copies.tsv
(k3_copies.py), and lesson 12's protein-coding context table. Prints every number the page states.
A row "has the 5' end" when it covers consensus base 100 or earlier; "share" = reads placed uniquely back on the row
divided by reads tiled on it.
"""
import csv, json, statistics, sys

FIVE = 100


def main(d, ctx, out):
    rows = list(csv.DictReader(open(f"{d}/mouse.mm10.L1Md_T.tiles.copy_unique.tsv"), delimiter="\t"))
    for r in rows:
        r["len"] = int(r["end"]) - int(r["start0"]); r["n"] = int(r["reads"]); r["u"] = int(r["unique_home"])
        r["sh"] = r["u"] / r["n"]; r["five"] = int(r["cons_start"]) <= FIVE; r["md"] = int(r["milliDiv"])
        r["three"] = int(r["cons_end"]) >= int(r["cons_len"]) - FIVE
    T = {k: sum(int(r[k]) for r in rows) for k in ("reads", "unique_home", "unique_away", "multi", "unmapped")}
    groups = {
        "all": rows,
        "five": [r for r in rows if r["five"]],
        "long": [r for r in rows if r["len"] >= 6000],
        "short": [r for r in rows if r["len"] < 1000],
    }
    edges = [i / 10 for i in range(11)]
    hist = {}
    for g, sel in groups.items():
        bins = [0] * 11          # bin 0: no unique read at all; bins 1..10: (0,10%), [10,20%) ... [90,100%]
        for r in sel:
            if r["u"] == 0: bins[0] += 1
            else: bins[min(10, 1 + int(r["sh"] * 10))] += 1
        hist[g] = {"n": len(sel), "bins": bins, "median": round(statistics.median(r["sh"] for r in sel), 4),
                   "under10": sum(1 for r in sel if r["sh"] < 0.10), "none": sum(1 for r in sel if r["u"] == 0),
                   "reads": sum(r["n"] for r in sel), "unique": sum(r["u"] for r in sel)}
    sh = sorted(r["sh"] for r in rows)
    model_shares = [round(sh[int(len(sh) * (i + 0.5) / 20)], 3) for i in range(20)]
    c = None
    for line in open(ctx):
        f = line.rstrip("\n").split("\t")
        if f[2] == "L1Md_T": c = [int(x) for x in f[3:8]]
    stats = {
        "rows": len(rows), "bases": sum(r["len"] for r in rows),
        "short": len(groups["short"]), "long": len(groups["long"]), "five": len(groups["five"]),
        "five_long": sum(1 for r in rows if r["five"] and r["len"] >= 6000),
        "three": sum(1 for r in rows if r["three"]), "young": sum(1 for r in rows if r["md"] < 30),
        "md_median": statistics.median(r["md"] for r in rows),
        "ctx": {"exon": c[0], "intron": c[1] + c[2] + c[3], "intron_same": c[1], "intron_opp": c[2], "intron_both": c[3], "intergenic": c[4]},
        "tiles": T,
    }
    k3 = []
    tiles = {(r["chrom"], r["start0"]): r for r in rows}
    for r in csv.DictReader(open(f"{d}/mouse.mm10.L1Md_T.k3_copies.tsv"), delimiter="\t"):
        if r["copy_id"].startswith("#"): continue
        t = tiles.get((r["chrom"], r["start0"]))
        k3.append({"pos": f"{r['chrom']}:{int(r['start0']) + 1:,}", "len": int(r["end"]) - int(r["start0"]),
                   "five": bool(t and t["five"]), "share": round(t["sh"], 6) if t else None,
                   "truth": float(r["truth"]), "telescope": float(r["telescope"]), "telocal": float(r["telocal"]),
                   "fc_uniq": float(r["fc_uniq"])})
    k3 = [x for x in k3 if x["truth"] > 0 or x["telescope"] >= 0.5 or x["fc_uniq"] >= 0.5][:6]
    data = {"stats": stats, "hist": hist, "model_shares": model_shares, "k3": k3, "five_rule": FIVE}
    with open(out, "w") as o:
        o.write("// Lesson 11 data, built by site/prep/q11/build_copies_json.py. Mouse mm10, subfamily L1Md_T.\n")
        o.write("window.COPIES_DATA = " + json.dumps(data, separators=(",", ":")) + ";\n")
    print(json.dumps(stats, indent=1)); print(json.dumps(hist, indent=1)); print("model shares", model_shares)
    for x in k3: print(x)


if __name__ == "__main__":
    main(*sys.argv[1:])
