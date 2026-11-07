"""Pipeline checks for the q10 benchmark, run before any tool comparison is trusted.

    python3 -I check_fc.py out/mouse /path/to/q9/out/mouse_te100/tally_100.tsv

1. featureCounts unique-only per subfamily (sub_uniq) against q9's unique count for the same reads
   (tally_100.tsv, column 'unique'). featureCounts counts by where a read lands, q9 by where it was cut,
   so they differ by reads that land uniquely in a neighbouring row; expect close, not equal.
2. Unique reads on the right copy: per copy, min(featureCounts unique, truth), summed, over all
   unique reads featureCounts assigned.
"""
import csv, sys


def fc(path):
    out = {}
    for line in open(path):
        if line.startswith("#") or line.startswith("Geneid"):
            continue
        f = line.rstrip("\n").split("\t")
        out[f[0]] = float(f[-1])
    return out


def main(d, tally):
    subs = {r["sub_idx"]: r for r in csv.DictReader(open(f"{d}/annot/truth_sub.tsv"), delimiter="\t")}
    if tally == "-":
        t = []
        print("no q9 tally for this scenario: unique-count comparison skipped")
    else:
        t = list(csv.DictReader(open(tally), delimiter="\t"))
    q9 = {(r["class"], r["family"], r["subfamily"]): int(r["unique"]) for r in t}
    u = fc(f"{d}/fc/sub_uniq.txt")
    diffs, tot_q9, tot_fc = [], 0, 0
    for i, r in subs.items():
        a, b = q9.get((r["class"], r["family"], r["name"]), 0), u.get(r["sub_id"], 0.0)
        tot_q9 += a; tot_fc += b
        diffs.append((b - a, r["sub_id"], a, b))
    diffs.sort()
    if not t:
        diffs = []
    print(f"unique reads: q9 {tot_q9}, featureCounts {tot_fc:.0f}")
    print("largest shortfalls:", [(s, a, int(b)) for _, s, a, b in diffs[:5]])
    print("largest excesses:", [(s, a, int(b)) for _, s, a, b in diffs[-5:]])
    within = sum(1 for dlt, _, a, _b in diffs if abs(dlt) <= max(2, 0.01 * a)) if diffs else 0
    print(f"subfamilies within 1% (or 2 reads) of q9: {within} of {len(diffs)}")
    truth = {r["copy_id"]: int(r["reads"]) for r in csv.DictReader(open(f"{d}/annot/truth_copy.tsv"), delimiter="\t")}
    cu = fc(f"{d}/fc/copy_uniq.txt")
    right = sum(min(v, truth.get(c, 0)) for c, v in cu.items())
    print(f"unique reads on their true copy, at least: {right:.0f} of {sum(cu.values()):.0f}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
