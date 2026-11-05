"""Build the data file for the "Three names" lesson from the two species summaries.

    python3 -I build_names_json.py mouse_summary.tsv human_summary.tsv names.js

One shared tree (class > family > subfamily) holds both species, so a box keeps
its place when the page switches species. A node present in only one species has
zero size in the other. Each node stores [bp, copies] per species.

Order inside each level: by mouse share of genome plus human share, largest first.
Simple_repeat subfamilies (one per motif, thousands of them) are folded into one
node per species table, flagged "fold", because no one tests them one by one.
"""
import json, sys

TE_CLASSES = ["LINE", "SINE", "LTR", "DNA", "RC", "Retroposon"]
FOLD_CLASSES = {"Simple_repeat"}

def read(path):
    meta, rows = {}, []
    with open(path) as fh:
        for line in fh:
            line = line.rstrip("\n")
            if line.startswith("# "):
                k, v = line[2:].split("\t", 1)
                meta[k] = v
            elif line.startswith("class\t"):
                continue
            else:
                c, f, s, copies, bp, te = line.split("\t")
                rows.append((c, f, s, int(copies), int(bp), te == "1"))
    return meta, rows

def class_rank(c):
    base = c.rstrip("?")
    if base in TE_CLASSES:
        return (0 if not c.endswith("?") else 1, TE_CLASSES.index(base))
    return (2, 0)

def main(a_path, b_path, out_path):
    species = {"mouse": read(a_path), "human": read(b_path)}
    tree = {}       # class -> family -> subfamily -> {sp: [bp, copies]}
    te_of = {}
    for sp, (meta, rows) in species.items():
        for c, f, s, copies, bp, te in rows:
            te_of[c] = te
            if c in FOLD_CLASSES:
                s = "(motifs)"
            node = tree.setdefault(c, {}).setdefault(f, {}).setdefault(s, {})
            v = node.setdefault(sp, [0, 0])
            v[0] += bp; v[1] += copies
    genome = {sp: int(m["genome_bp_primary_chromosomes"]) for sp, (m, _) in species.items()}
    motif_names = {sp: sum(1 for r in rows if r[0] in FOLD_CLASSES) for sp, (_, rows) in species.items()}

    def share(d):
        return sum(d.get(sp, [0, 0])[0] / genome[sp] for sp in genome)

    def total(children):
        t = {}
        for ch in children:
            for sp, (bp, cp) in ch["v"].items():
                x = t.setdefault(sp, [0, 0]); x[0] += bp; x[1] += cp
        return t

    out_classes = []
    for c in sorted(tree, key=lambda c: (class_rank(c), -sum(share(s) for f in tree[c].values() for s in f.values()))):
        fams = []
        for f, subs in tree[c].items():
            kids = [{"n": s, "v": v} for s, v in subs.items()]
            for k in kids:
                if k["n"] == "(motifs)":
                    k["fold"] = {sp: motif_names[sp] for sp in genome}
            kids.sort(key=lambda k: -share(k["v"]))
            fams.append({"n": f, "c": kids, "v": total(kids)})
        fams.sort(key=lambda f: -share(f["v"]))
        out_classes.append({"n": c, "te": te_of[c], "c": fams, "v": total(fams)})

    meta = {}
    for sp, (m, rows) in species.items():
        meta[sp] = {
            "assembly": m["assembly"],
            "md5": m["source_md5"],
            "fileDate": m["source_file_date"],
            "url": f"https://hgdownload.soe.ucsc.edu/goldenPath/{m['assembly']}/database/rmsk.txt.gz",
            "genome": genome[sp],
            "rowsDropped": int(m["rows_skipped_non_primary"]),
            "firstRow": m["first_te_row"].split("\t"),
        }
    with open(out_path, "w") as out:
        # A script file, not .json, so the page also works opened straight from disk.
        out.write("window.NAMES_DATA=")
        json.dump({"downloaded": "2026-11-05", "species": meta, "tree": out_classes}, out, separators=(",", ":"))
        out.write(";\n")

if __name__ == "__main__":
    main(*sys.argv[1:4])
