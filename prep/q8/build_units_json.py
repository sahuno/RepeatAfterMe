#!/usr/bin/env python3
"""Build site/data/units.js for the "Rows or subfamilies" lesson (question 8).

Input: UCSC's RepeatMasker .out files for mm10 (bigZips/chromOut.tar.gz, RepeatMasker
open-3-3-0, library 20110920: the same run as the UCSC rmsk table). Unlike the table,
the .out files keep RepeatMasker's ID column (last column), which gives every row of one
insertion the same number, including the LTRs and body of one ERV.

Rules:
- Primary chromosomes only (chr1..chr19, chrX, chrY, chrM), as on the other pages.
- Transposons only: classes LINE, SINE, LTR and DNA (rows with "?" classes, simple
  repeats, low complexity, satellites, RNA genes and the rest are left out).
- A row is one line of the file. An insertion is one (chromosome, ID) pair: the rows
  RepeatMasker judged to be one element. A subfamily is a repeat name. A row's family and
  class come from its class/family column.
- Gaps: for each insertion with two or more rows, sort the rows by start. For each gap
  between consecutive rows, look for rows of any class lying wholly inside the gap:
  a transposon row closer to its consensus (lower % substitutions) than the closer of the
  two host rows; a transposon row not closer; only non-transposon rows (simple repeats and
  the like); nothing, with the name changing across the gap (an ERV's LTR and body);
  nothing, same name.
- Examples: every row overlapping two chosen insertions, for the page's drawing.

Usage: python3 -I build_units_json.py <dir with */chr*.fa.out> <out.js>
"""
import glob, json, os, sys
from bisect import bisect_left
from collections import Counter, defaultdict

PRIM = set(["chr%s" % i for i in list(range(1, 20)) + ["X", "Y", "M"]])
TE = {"LINE", "SINE", "LTR", "DNA"}
PICK = ["L1Md_T", "L1Md_A", "IAPEz-int", "MERVL-int", "ETnERV-int", "B1_Mm", "B2_Mm2", "MT2_Mm", "IAPLTR1_Mm"]


EXAMPLES = [("chr7", "3523447"), ("chr19", "2017585")]


def main(indir, out):
    allrows = []  # (chrom, start0, end, name, cls, fam, id, div, strand, rep coords)
    for f in sorted(glob.glob(os.path.join(indir, "*", "*.fa.out"))):
        with open(f) as fh:
            for i, line in enumerate(fh):
                if i < 3:
                    continue
                p = line.split()
                if len(p) < 15 or p[4] not in PRIM:
                    continue
                cf = p[10].split("/")
                allrows.append((p[4], int(p[5]) - 1, int(p[6]), p[9], cf[0], cf[1] if len(cf) > 1 else cf[0],
                                p[14], float(p[1]), p[8], (p[11], p[12], p[13])))
    rows = [r for r in allrows if r[4] in TE]
    ins = defaultdict(list)
    for r in rows:
        ins[(r[0], r[6])].append(r)
    units = {"classes": len(TE), "families": len(set((r[4], r[5]) for r in rows)),
             "subfamilies": len(set(r[3] for r in rows)), "insertions": len(ins), "rows": len(rows)}
    print("units", units)
    rpi = Counter(min(len(v), 5) for v in ins.values())
    multi = [v for v in ins.values() if len(v) > 1]
    mixed = sum(1 for v in multi if len(set(r[3] for r in v)) > 1)
    spans = [max(r[2] for r in v) - min(r[1] for r in v) for v in multi]
    big = sum(1 for x in spans if x > 20000)
    print("insertions with >1 row", len(multi), "with >1 name", mixed, "span >20kb", big, "rows/insertion", sorted(rpi.items()))

    by_chrom = defaultdict(list)
    for r in allrows:
        by_chrom[r[0]].append(r)
    starts = {}
    for c in by_chrom:
        by_chrom[c].sort(key=lambda r: r[1])
        starts[c] = [r[1] for r in by_chrom[c]]
    KEYS = ["younger", "older", "other", "ltrbody", "none"]
    gap = Counter()
    for (c, cid), v in ins.items():
        if len(v) < 2:
            continue
        v = sorted(v, key=lambda r: r[1])
        for a, b in zip(v, v[1:]):
            lo, hi = a[2], b[1]
            L = by_chrom[c]
            j = bisect_left(starts[c], lo)
            inside = []
            while j < len(L) and L[j][1] < hi:
                if L[j][6] != cid and L[j][2] <= hi:
                    inside.append(L[j])
                j += 1
            te = [x for x in inside if x[4] in TE]
            if te:
                k = "younger" if min(x[7] for x in te) < min(a[7], b[7]) else "older"
            elif inside:
                k = "other"
            elif a[3] != b[3]:
                k = "ltrbody"
            else:
                k = "none"
            gap[k] += 1
    print("gaps", sum(gap.values()), dict(gap))

    pick = []
    for nm in PICK:
        cs = [v for v in ins.values() if any(r[3] == nm for r in v)]
        nrows = sum(1 for r in rows if r[3] == nm)
        dist = Counter(min(sum(1 for r in v if r[3] == nm), 5) for v in cs)
        partners = Counter()
        for v in cs:
            for o in set(r[3] for r in v if r[3] != nm):
                partners[o] += 1
        withp = sum(1 for v in cs if any(r[3] != nm for r in v))
        cl = next(r for r in rows if r[3] == nm)
        pick.append({"name": nm, "cls": cl[4], "fam": cl[5], "rows": nrows, "insertions": len(cs),
                     "perIns": [dist.get(k, 0) for k in range(1, 6)],
                     "withOther": withp, "partners": partners.most_common(3)})
        print(nm, nrows, len(cs), [dist.get(k, 0) for k in range(1, 6)], withp, partners.most_common(3))

    examples = []
    for c, cid in EXAMPLES:
        v = ins[(c, cid)]
        lo, hi = min(r[1] for r in v), max(r[2] for r in v)
        shown = [r for r in by_chrom[c] if r[2] > lo and r[1] < hi]
        examples.append({"chrom": c, "id": cid, "start": lo, "end": hi,
                         "rows": [[r[1], r[2], r[3], r[4] + "/" + r[5], r[7], r[8], " ".join(r[9]), r[6] == cid] for r in shown]})
        print("example", c, cid, lo, hi, len(shown), "rows shown")

    data = {"source": "UCSC mm10 chromOut.tar.gz (RepeatMasker open-3-3-0, library 20110920)",
            "units": units, "rowsPerIns": [rpi.get(k, 0) for k in range(1, 6)],
            "insMulti": len(multi), "insMixed": mixed, "insSpan20k": big,
            "gaps": [gap.get(k, 0) for k in KEYS], "gapKeys": KEYS,
            "pick": pick, "examples": examples}
    with open(out, "w") as fh:
        fh.write("// Built by site/prep/q8/build_units_json.py from UCSC mm10 RepeatMasker .out files.\n")
        fh.write("window.UNITS_DATA = ")
        json.dump(data, fh, separators=(",", ":"))
        fh.write(";\n")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
