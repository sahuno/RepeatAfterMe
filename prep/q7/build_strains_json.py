#!/usr/bin/env python3
"""Build site/data/strains.js for the "Not in the reference" lesson (question 7).

Input: the transposable element variant (TEV) tables of Nellaker et al. 2012,
Genome Biology 13:R45, Additional file 13 (gb-2012-13-6-r45-S13.TGZ, folder
bed_files/), one table per family, mm9 coordinates. Columns: chrm, start, stop,
ori, C57B6_ref, then 17 strains. A reference column of 1 means the copy is in
the C57BL/6J reference; a strain value of DEL means that strain lacks it. A
reference column of 0 means the copy is absent from the reference; INS means
the strain carries it. Plain 1 or 0 means the strain matches the reference.

Counting rules:
- A strain "lacks" a reference copy when its value is DEL, and "carries an
  extra" copy when its value is INS.
- The same position can appear in more than one family table (mostly LINE and
  LINE_frag). Within a family group, and in the totals, a position (chrom,
  start) counts once.
- Family groups: IAP (IAP-I), L1 (LINE + LINE_frag), ETn, SINE (B1 and B2 are
  not separated in the source), and other LTR (MaLR, RLTR10, MuLV, VL30,
  RLTR1B, RLTR45, IS2).

Usage: python3 -I build_strains_json.py <bed_files dir> <mm9 chromInfo> <out.js>
"""
import glob, json, os, sys
from collections import defaultdict

GROUP = {"IAP-I": "IAP", "LINE": "L1", "LINE_frag": "L1", "ETn": "ETn", "SINE": "SINE",
         "MaLR": "oLTR", "RLTR10": "oLTR", "MuLV": "oLTR", "VL30": "oLTR",
         "RLTR1B": "oLTR", "RLTR45": "oLTR", "IS2": "oLTR"}
GROUPS = ["IAP", "L1", "ETn", "SINE", "oLTR"]
NAMES = {"129P2": "129P2/OlaHsd", "129S1": "129S1/SvImJ", "129S5": "129S5/SvEvBrd",
         "AKR": "AKR/J", "A_J": "A/J", "BALB": "BALB/cJ", "C3H": "C3H/HeJ",
         "C57BL": "C57BL/6NJ", "CAST": "CAST/EiJ", "CBA": "CBA/J", "DBA": "DBA/2J",
         "LP_J": "LP/J", "NOD": "NOD/ShiLtJ", "NZO": "NZO/HlLtJ", "PWK": "PWK/PhJ",
         "SPRET": "SPRET/EiJ", "WSB": "WSB/EiJ"}
WILD = {"CAST", "PWK", "SPRET", "WSB"}
CHR = "chr19"


def main(bed_dir, chrominfo, out):
    lengths = {}
    for line in open(chrominfo):
        c, n = line.split("\t")[:2]
        lengths[c] = int(n)
    strains = None
    # per strain: kind -> group -> set of positions; kind -> set (all groups)
    sets = defaultdict(lambda: {"D": defaultdict(set), "I": defaultdict(set)})
    tot = defaultdict(lambda: {"D": set(), "I": set()})
    rows = 0
    mixed = 0
    chrom_rows = {}  # (start, group) -> (ref, states)
    for path in sorted(glob.glob(os.path.join(bed_dir, "*.shared.tab"))):
        fam = os.path.basename(path).split(".")[0]
        g = GROUP[fam]
        with open(path) as fh:
            hdr = fh.readline().rstrip("\n").split("\t")
            if strains is None:
                strains = hdr[5:]
            assert hdr[5:] == strains, path
            for line in fh:
                p = line.rstrip("\n").split("\t")
                rows += 1
                pos = (p[0], int(p[1]))
                vals = p[5:]
                if (p[4] == "1" and "INS" in vals) or (p[4] == "0" and "DEL" in vals):
                    mixed += 1
                for s, v in zip(strains, vals):
                    if v == "DEL":
                        sets[s]["D"][g].add(pos); tot[s]["D"].add(pos)
                    elif v == "INS":
                        sets[s]["I"][g].add(pos); tot[s]["I"].add(pos)
                if p[0] == CHR:
                    key = (int(p[1]), g)
                    st = "".join({"DEL": "d", "INS": "i"}.get(v, v) for v in vals)
                    chrom_rows.setdefault(key, (int(p[4]), st))
    out_strains = []
    for s in strains:
        out_strains.append({
            "id": s, "name": NAMES[s],
            "kind": "wild" if s in WILD else ("sub" if s == "C57BL" else "lab"),
            "lacks": len(tot[s]["D"]), "extra": len(tot[s]["I"]),
            "byGroup": {g: [len(sets[s]["D"][g]), len(sets[s]["I"][g])] for g in GROUPS},
        })
    chrom = sorted(chrom_rows.items())
    data = {
        "source": "Nellaker et al. 2012, Genome Biology 13:R45, Additional file 13 (mm9)",
        "rowsInFiles": rows, "mixedRows": mixed,
        "groups": GROUPS,
        "strains": out_strains,
        "chrom": {"name": CHR, "length": lengths[CHR],
                  "rows": [[k[0], k[1], v[0], v[1]] for k, v in chrom]},
    }
    with open(out, "w") as fh:
        fh.write("// Built by site/prep/q7/build_strains_json.py from Nellaker et al. 2012, Additional file 13.\n")
        fh.write("window.STRAINS_DATA = ")
        json.dump(data, fh, separators=(",", ":"))
        fh.write(";\n")
    print("rows", rows, "mixed", mixed, "chr19 rows", len(chrom))
    for o in out_strains:
        print(f"{o['name']:14s} lacks {o['lacks']:6d} extra {o['extra']:6d} "
              + " ".join(f"{g}:{o['byGroup'][g][0]}/{o['byGroup'][g][1]}" for g in GROUPS))


if __name__ == "__main__":
    main(*sys.argv[1:4])
