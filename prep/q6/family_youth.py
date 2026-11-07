"""Young bases per subfamily, for the "Two zoos" lesson. One genome per run.

    python3 -I family_youth.py rmsk.txt.gz <species>_summary.tsv OUT.tsv

Rows and bases are counted exactly as in rmsk_summary.py (primary chromosomes; bases = sum of row lengths),
so per-class totals can be checked against <species>_summary.tsv, whose header gives the genome length used
as the denominator. "Young" is per copy: a row whose milliDiv is under 30, i.e. under 3% different from its
subfamily's reconstructed original sequence. This is not the subfamily-median age used on other pages.
Writes: class, family, subfamily, copies, bp, young_copies, young_bp; header comment genome_bp.
"""
import collections, gzip, re, sys

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
YOUNG_MILLIDIV = 30


def main(rmsk, summary, out):
    genome = None
    for line in open(summary):
        if line.startswith("# genome_bp_primary_chromosomes"):
            genome = int(line.split("\t")[1])
    n, bp, yn, ybp = (collections.Counter() for _ in range(4))
    with gzip.open(rmsk, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            if not PRIMARY.match(f[5]):
                continue
            k, L = (f[11], f[12], f[10]), int(f[7]) - int(f[6])
            n[k] += 1
            bp[k] += L
            if int(f[2]) < YOUNG_MILLIDIV:
                yn[k] += 1
                ybp[k] += L
    with open(out, "w") as fh:
        fh.write(f"# genome_bp\t{genome}\n# young_rule\tmilliDiv < {YOUNG_MILLIDIV} (under 3%)\n")
        fh.write("class\tfamily\tsubfamily\tcopies\tbp\tyoung_copies\tyoung_bp\n")
        for k in sorted(n, key=lambda k: (k[0], k[1], -bp[k])):
            fh.write("\t".join(k) + f"\t{n[k]}\t{bp[k]}\t{yn[k]}\t{ybp[k]}\n")
    print(f"genome {genome}; rows {sum(n.values())}; bp {sum(bp.values())}; young bp {sum(ybp.values())} "
          f"({100 * sum(ybp.values()) / genome:.2f}% of genome)")


if __name__ == "__main__":
    main(*sys.argv[1:4])
