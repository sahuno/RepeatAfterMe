"""Divergence of each RepeatMasker subfamily from its consensus, for the multi-mapping lesson.

Run once per genome:
    python3 -I rmsk_divergence.py rmsk.txt.gz out.tsv

Same rows as rmsk_summary.py: primary chromosomes only (chr1..chrN, chrX, chrY, chrM).
Divergence is RepeatMasker's milliDiv column (base mismatches per thousand between the copy
and the consensus), shown here in percent. Each row is weighted by the bases it covers, so a
long fragment counts more than a short one. Output: class, family, subfamily, bp, and the
bp-weighted 25th, 50th and 75th percentiles of divergence in percent. Simple_repeat and
Low_complexity are left out: they have no consensus in the same sense.
"""
import gzip, re, sys
from collections import defaultdict

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
SKIP = {"Simple_repeat", "Low_complexity"}

def wq(pairs, qs):
    pairs.sort()
    tot = sum(w for _, w in pairs)
    out, acc, i = [], 0, 0
    for q in qs:
        target = q * tot
        while i < len(pairs) and acc + pairs[i][1] < target:
            acc += pairs[i][1]; i += 1
        out.append(pairs[min(i, len(pairs) - 1)][0])
    return out

def main(rmsk_path, out_path):
    rows = defaultdict(lambda: defaultdict(int))  # key -> milliDiv -> bp
    with gzip.open(rmsk_path, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            # UCSC rmsk columns: 2 milliDiv, 5 genoName, 6 genoStart, 7 genoEnd, 10 repName, 11 repClass, 12 repFamily
            if not PRIMARY.match(f[5]) or f[11] in SKIP:
                continue
            rows[(f[11], f[12], f[10])][int(f[2])] += int(f[7]) - int(f[6])
    with open(out_path, "w") as out:
        out.write("class\tfamily\tsubfamily\tbp\tdiv_q25\tdiv_median\tdiv_q75\n")
        for key in sorted(rows):
            pairs = list(rows[key].items())
            bp = sum(w for _, w in pairs)
            q = wq(pairs, [0.25, 0.5, 0.75])
            out.write("\t".join(key) + f"\t{bp}\t" + "\t".join(f"{x / 10:.1f}" for x in q) + "\n")

if __name__ == "__main__":
    main(*sys.argv[1:3])
