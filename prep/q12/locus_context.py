"""Where each RepeatMasker copy sits relative to genes: exon, intron (same or opposite strand), intergenic.

    python3 -I locus_context.py rmsk.txt.gz annotation.gtf OUT.tsv [all|protein_coding]

Rows kept as in the other lessons: primary chromosomes (chr1..chrN, chrX, chrY, chrM), Simple_repeat and
Low_complexity left out. Genes and exons: every 'gene' and 'exon' line of the GTF (all gene types), or only
those with gene_type "protein_coding" when the 4th argument says so. Each
row gets one place, by overlap, with exon first (as in Kong et al. 2019, REdiscoverTE):
  exon          overlaps an exon of any gene, on either strand
  intron_same   inside a gene body on the copy's own strand only, no exon overlap
  intron_opp    inside a gene body on the opposite strand only, no exon overlap
  intron_both   inside gene bodies on both strands, no exon overlap
  intergenic    overlaps no gene body
"Same strand" means the gene's pre-mRNA would carry the copy in its sense orientation.
Writes one line per subfamily (class, family, name): copies and bases in each place.
"""
import bisect, collections, gzip, re, sys

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
SKIP = {"Simple_repeat", "Low_complexity"}
PLACES = ["exon", "intron_same", "intron_opp", "intron_both", "intergenic"]


def merge(iv):
    iv.sort()
    out = []
    for s, e in iv:
        if out and s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return [x[0] for x in out], [x[1] for x in out]


def hits(m, s, e):
    """Does [s, e) overlap any merged interval in m = (starts, ends)?"""
    if not m:
        return False
    starts, ends = m
    j = bisect.bisect_left(ends, s + 1)          # first interval ending after s
    return j < len(starts) and starts[j] < e


def main(rmsk, gtf, out, types="all"):
    genes = collections.defaultdict(list)       # (chrom, strand) -> [(s0, e)]
    exons = collections.defaultdict(list)       # chrom -> [(s0, e)] (both strands)
    op = gzip.open if gtf.endswith(".gz") else open
    with op(gtf, "rt") as fh:
        for line in fh:
            if line.startswith("#"):
                continue
            f = line.split("\t", 8)
            if types == "protein_coding" and 'gene_type "protein_coding"' not in f[8]:
                continue
            if f[2] == "gene":
                genes[(f[0], f[6])].append((int(f[3]) - 1, int(f[4])))
            elif f[2] == "exon":
                exons[f[0]].append((int(f[3]) - 1, int(f[4])))
    G = {k: merge(v) for k, v in genes.items()}
    E = {k: merge(v) for k, v in exons.items()}
    print(f"genes: {sum(len(v) for v in genes.values())}; exons: {sum(len(v) for v in exons.values())}")
    n = collections.defaultdict(collections.Counter)
    bp = collections.defaultdict(collections.Counter)
    with gzip.open(rmsk, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            c = f[5]
            if not PRIMARY.match(c) or f[11] in SKIP:
                continue
            s, e, st = int(f[6]), int(f[7]), f[9]
            other = "-" if st == "+" else "+"
            if hits(E.get(c), s, e):
                p = "exon"
            else:
                same, opp = hits(G.get((c, st)), s, e), hits(G.get((c, other)), s, e)
                p = "intron_both" if same and opp else "intron_same" if same else "intron_opp" if opp else "intergenic"
            k = (f[11], f[12], f[10])
            n[k][p] += 1
            bp[k][p] += e - s
    with open(out, "w") as fh:
        fh.write("class\tfamily\tsubfamily\t" + "\t".join(f"n_{p}" for p in PLACES) + "\t" + "\t".join(f"bp_{p}" for p in PLACES) + "\n")
        for k in sorted(n):
            fh.write("\t".join(k) + "\t" + "\t".join(str(n[k][p]) for p in PLACES) + "\t" + "\t".join(str(bp[k][p]) for p in PLACES) + "\n")
    tot = collections.Counter()
    for k in n:
        tot.update(n[k])
    print("copies by place:", {p: tot[p] for p in PLACES})


if __name__ == "__main__":
    main(*sys.argv[1:5])
