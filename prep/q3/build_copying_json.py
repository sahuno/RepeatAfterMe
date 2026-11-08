#!/usr/bin/env python3
"""Build site/data/copying.js for the "How copies are made" lesson (question 3).

Input: UCSC's RepeatMasker .out files for mm10 (bigZips/chromOut.tar.gz, RepeatMasker
open-3-3-0, library 20110920), as in lesson 8. Rows sharing a RepeatMasker ID on one
chromosome are one insertion.

For each chosen subfamily:
- its insertions = (chromosome, ID) groups with at least one row of that name;
- each row's part of the consensus (the reconstructed original sequence): "+" rows give
  begin, end, (left); "C" rows give (left), end, begin. Rows of one subfamily can report
  slightly different consensus lengths (end + left), so the drawing uses the most common
  length and the end tests use each row's own numbers;
- per insertion, the consensus bases its rows of that name cover;
- "has the 5' end": a row of the insertion begins within the first 100 consensus bases;
  "has the 3' end": a row ends within 100 bases of the consensus end ((left) <= 100);
- coverage curve: for 100 equal bins along the consensus, the share of insertions that
  cover the bin's middle base;
- a fixed random sample of 150 insertions (seed 7) with their covered segments, for
  drawing;
- median % different from consensus over the subfamily's rows.
Also: per class, rows and rows under 5% and 10% different; L1 family insertions and how
many cover at least 6,000 consensus bases.

Primary chromosomes only (chr1..chr19, chrX, chrY, chrM).
Usage: python3 -I build_copying_json.py <dir with */chr*.fa.out> <out.js>
"""
import glob, json, os, random, sys
from collections import Counter, defaultdict
from statistics import median

PRIM = set(["chr%s" % i for i in list(range(1, 20)) + ["X", "Y", "M"]])
PICK = [("L1Md_T", "L1, young"), ("L1Md_A", "L1, young"), ("L1Md_F2", "L1, older"), ("Lx9", "L1, old"),
        ("B1_Mm", "SINE"), ("B2_Mm2", "SINE"), ("IAPEz-int", "ERV body"), ("MMETn-int", "ERV body"),
        ("URR1A", "DNA transposon"), ("MER2", "DNA transposon")]
NAMES = set(n for n, _ in PICK)
CLASSES = ["LINE", "SINE", "LTR", "DNA"]


def cons(strand, a, b, c):
    num = lambda s: int(s.strip("()"))
    if strand == "+":
        return num(a), num(b), num(c)
    return num(c), num(b), num(a)


def covered(segs):
    segs = sorted(segs)
    out = []
    for b, e in segs:
        if out and b <= out[-1][1] + 1:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([b, e])
    return out


def main(indir, out):
    rows_by_ins = defaultdict(list)    # (chrom, id) -> [(name, b, e)] for chosen names
    clen = defaultdict(Counter)
    ends = defaultdict(list)          # (chrom, id, name) -> [(begin, left)]
    divs = defaultdict(list)
    l1 = defaultdict(list)             # (chrom, id) -> [(b, e, name)] for L1 family rows
    cls = {c: [0, 0, 0] for c in CLASSES}
    for f in sorted(glob.glob(os.path.join(indir, "*", "*.fa.out"))):
        with open(f) as fh:
            for i, line in enumerate(fh):
                if i < 3:
                    continue
                p = line.split()
                if len(p) < 15 or p[4] not in PRIM:
                    continue
                cf = p[10].split("/")
                d = float(p[1])
                if cf[0] in cls:
                    cls[cf[0]][0] += 1
                    cls[cf[0]][1] += d < 5
                    cls[cf[0]][2] += d < 10
                name = p[9]
                if name in NAMES or p[10] == "LINE/L1":
                    b, e, left = cons(p[8], p[11], p[12], p[13])
                    if name in NAMES:
                        rows_by_ins[(p[4], p[14], name)].append((b, e))
                        ends[(p[4], p[14], name)].append((b, left))
                        clen[name][e + left] += 1
                        divs[name].append(d)
                    if p[10] == "LINE/L1":
                        l1[(p[4], p[14])].append((b, e, name))
    subs = []
    rng = random.Random(7)
    for name, label in PICK:
        L = clen[name].most_common(1)[0][0]
        keys = [k for k in rows_by_ins if k[2] == name]
        ins = [covered(rows_by_ins[k]) for k in keys]
        n = len(ins)
        has5 = [min(b for b, _ in ends[k]) <= 100 for k in keys]
        has3 = [min(l for _, l in ends[k]) <= 100 for k in keys]
        five = sum(has5)
        three = sum(has3)
        both = sum(1 for a, b in zip(has5, has3) if a and b)
        cov = []
        for k in range(100):
            mid = 1 + int((k + 0.5) * (L - 1) / 100)
            cov.append(round(sum(1 for s in ins if any(b <= mid <= e for b, e in s)) / n, 4))
        bases = [sum(e - b + 1 for b, e in s) for s in ins]
        sample = [[[b, min(e, L)] for b, e in s if b <= L] for s in rng.sample(ins, min(150, n))]
        sample = [s for s in sample if s]
        sample.sort(key=lambda s: (s[0][0], -s[-1][1]))
        subs.append({"name": name, "label": label, "consLen": L, "insertions": n, "five": five, "three": three,
                     "both": both, "medianBases": int(median(bases)), "medianDiv": round(median(divs[name]), 1),
                     "cov": cov, "sample": sample})
        print(f"{name:10s} len {L:5d} ins {n:6d} 5'end {five:6d} ({100*five/n:4.1f}%) 3'end {three:6d} ({100*three/n:4.1f}%) "
              f"both {both:5d} medianBases {int(median(bases)):5d} medianDiv {median(divs[name]):.1f}")
    # L1 family: insertions and those covering >= 6,000 consensus bases (summed over the insertion's L1 rows)
    l1n = len(l1)
    l1long = 0
    for v in l1.values():
        byname = defaultdict(list)
        for b, e, nm in v:
            byname[nm].append((b, e))
        tot = sum(sum(e - b + 1 for b, e in covered(s)) for s in byname.values())
        l1long += tot >= 6000
    print("L1 family insertions", l1n, "covering >= 6,000 consensus bases", l1long)
    for c in CLASSES:
        print(c, cls[c])
    data = {"source": "UCSC mm10 chromOut.tar.gz (RepeatMasker open-3-3-0, library 20110920)",
            "subs": subs, "classes": {c: cls[c] for c in CLASSES}, "l1Insertions": l1n, "l1Long": l1long}
    with open(out, "w") as fh:
        fh.write("// Built by site/prep/q3/build_copying_json.py from UCSC mm10 RepeatMasker .out files.\n")
        fh.write("window.COPYING_DATA = ")
        json.dump(data, fh, separators=(",", ":"))
        fh.write(";\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
