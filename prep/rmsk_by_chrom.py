"""Count bases and rows per chromosome for every RepeatMasker name, for the "Three names" chromosome view.

Run once per genome:
    python3 -I rmsk_by_chrom.py rmsk.txt.gz chrom.sizes SPECIES out.js

Same rules as rmsk_summary.py: primary chromosomes only (chr1..chrN, chrX, chrY, chrM);
bp = bases covered, summed over rows; copies = rows in the table. Simple_repeat names
(one per motif) are folded into one "(motifs)" name per chromosome, as in build_names_json.py,
and the number of distinct motif names on each chromosome is kept.

Output is a script, not JSON, so the page also works opened from disk:
    window.CHROM_DATA[SPECIES] = {paths: ["class|family|subfamily", ...],
                                  chr: {chr1: [bp0, rows0, bp1, rows1, ...], ...},
                                  motifs: {chr1: n, ...}}
Values follow the order of paths. Paths join names with "|" because some names contain "/".
"""
import gzip, json, re, sys
from collections import defaultdict

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
FOLD_CLASSES = {"Simple_repeat"}

def main(rmsk_path, sizes_path, species, out_path):
    chroms = [l.split()[0] for l in open(sizes_path) if PRIMARY.match(l.split()[0])]
    counts = defaultdict(lambda: defaultdict(lambda: [0, 0]))  # chrom -> path -> [bp, rows]
    motifs = defaultdict(set)
    with gzip.open(rmsk_path, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            # UCSC rmsk columns: 5 genoName, 6 genoStart, 7 genoEnd, 10 repName, 11 repClass, 12 repFamily
            chrom = f[5]
            if not PRIMARY.match(chrom):
                continue
            sub = f[10]
            if f[11] in FOLD_CLASSES:
                motifs[chrom].add(sub)
                sub = "(motifs)"
            v = counts[chrom][f[11] + "|" + f[12] + "|" + sub]
            v[0] += int(f[7]) - int(f[6])
            v[1] += 1
    paths = sorted({p for c in counts.values() for p in c})
    out = {"paths": paths, "chr": {}, "motifs": {}}
    for chrom in chroms:
        flat = []
        for p in paths:
            flat.extend(counts[chrom].get(p, [0, 0]))
        out["chr"][chrom] = flat
        out["motifs"][chrom] = len(motifs[chrom])
    with open(out_path, "w") as fh:
        fh.write("window.CHROM_DATA=window.CHROM_DATA||{};window.CHROM_DATA." + species + "=")
        json.dump(out, fh, separators=(",", ":"))
        fh.write(";\n")

if __name__ == "__main__":
    main(*sys.argv[1:5])
