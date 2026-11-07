"""Page data for zoos.html, from the youth tables made by family_youth.py.

    python3 -I build_zoo_json.py data/q6 OUT.js

Reads every data/q6/<species>.<build>.youth.tsv. Keeps transposon classes (LINE, SINE, LTR, DNA,
Retroposon, RC, with or without "?"). Per family: bases, young bases, subfamily count, and the eight
subfamilies with the most young bases (ties by bases). Markers ("new insertions documented") come only
from the name rules below, each tied to a fetched source; see q6_spec.md for the lookup behind them.
"""
import collections, csv, glob, json, os, re, sys

TE = {"LINE", "SINE", "LTR", "DNA", "Retroposon", "RC"}
# (species, class/family, subfamily regex or None for the whole family, marker key)
RULES = [
    ("mouse", "LTR/ERVK", r"^IAP", "iap"),
    ("mouse", "LTR/ERVK", r"^(MMETn-int|RLTRETN_Mm)$", "etn"),
    ("mouse", "LTR/ERVK", r"^(ETnERV3-int|RLTR13A\d?)$", "erb2"),
    ("mouse", "LTR/ERV1", r"^(MuLV-int|MuLV-4_I-int)$", "mlv"),
    ("mouse", "LTR/ERV1", r"^MMVL30-int$", "vl30"),
    ("mouse", "SINE/Alu", r"^B1", "b1"),
    ("mouse", "SINE/B2", r"^B2_Mm", "b2"),
    ("mouse", "LINE/L1", r"^L1Md_(T|A|Gf)$", "l1md"),
    ("human", "LINE/L1", None, "hl1"),
    ("human", "SINE/Alu", None, "halu"),
    ("human", "Retroposon/SVA", None, "hsva"),
]


def marker(sp, fam, sub):
    """Subfamily marker: only rules that name subfamilies apply to a subfamily."""
    for s, f, rx, key in RULES:
        if s == sp and f == fam and rx is not None and re.search(rx, sub):
            return key
    return None


def family_marker(sp, fam):
    """Family marker: only rules that name a whole family (sources name the element, not subfamilies)."""
    for s, f, rx, key in RULES:
        if s == sp and f == fam and rx is None:
            return key
    return None


def main(qdir, out):
    data = {"species": {}}
    for path in sorted(glob.glob(f"{qdir}/*.youth.tsv")):
        sp, build = os.path.basename(path).split(".")[:2]
        genome = int([l for l in open(path) if l.startswith("# genome_bp")][0].split("\t")[1])
        fams = collections.defaultdict(list)
        for r in csv.DictReader((l for l in open(path) if not l.startswith("#")), delimiter="\t"):
            if r["class"].rstrip("?") not in TE:
                continue
            fams[(r["class"], r["family"])].append(r)
        out_f = []
        for (cls, fam), rs in fams.items():
            bp = sum(int(r["bp"]) for r in rs)
            ybp = sum(int(r["young_bp"]) for r in rs)
            label = f"{cls}/{fam}"
            ranked = sorted(rs, key=lambda r: (-int(r["young_bp"]), -int(r["bp"])))
            top = ranked[:8] + [r for r in ranked[8:] if marker(sp, label, r["subfamily"])]   # never hide a marked one
            fam_marker = family_marker(sp, label)
            out_f.append({"cls": cls, "fam": fam, "bp": bp, "ybp": ybp, "nsub": len(rs), "marker": fam_marker,
                          "has_marked": any(marker(sp, label, r["subfamily"]) for r in rs),
                          "top": [[r["subfamily"], int(r["copies"]), int(r["bp"]), int(r["young_copies"]), int(r["young_bp"]),
                                   marker(sp, label, r["subfamily"])] for r in top]})
        out_f.sort(key=lambda f: -f["bp"])
        data["species"][sp] = {"build": build, "genome_bp": genome, "families": out_f}
        print(sp, build, "families", len(out_f), "young TE % genome", round(100 * sum(f["ybp"] for f in out_f) / genome, 2))
    with open(out, "w") as fh:
        fh.write("window.ZOO_DATA=" + json.dumps(data, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    main(*sys.argv[1:3])
