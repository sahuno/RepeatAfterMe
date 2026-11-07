"""Which gene types overlap the copies of chosen subfamilies (any strand), for lesson 12.

    python3 -I gene_types.py rmsk.txt.gz annotation.gtf OUT.tsv SUBFAMILY [SUBFAMILY ...]

For each subfamily: copies overlapping at least one gene body, and how many of those copies overlap a gene
of each gene_type (a copy can count under several types). Also: copies whose overlapping genes are all
non-protein-coding, the case where an annotated transcript may itself be the copy's own RNA.
"""
import bisect, collections, gzip, re, sys

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")


def main(rmsk, gtf, out, *subs):
    want = set(subs)
    genes = collections.defaultdict(list)      # chrom -> [(s0, e, type)]
    with open(gtf) as fh:
        for line in fh:
            if line.startswith("#"):
                continue
            f = line.split("\t", 8)
            if f[2] != "gene":
                continue
            m = re.search(r'gene_type "([^"]+)"', f[8])
            genes[f[0]].append((int(f[3]) - 1, int(f[4]), m.group(1) if m else "unknown"))
    idx = {}
    for c, v in genes.items():
        v.sort()
        idx[c] = (v, [x[0] for x in v], max(x[1] - x[0] for x in v))
    n = collections.Counter(); ov = collections.Counter(); bytype = collections.defaultdict(collections.Counter)
    noncoding_only = collections.Counter()
    with gzip.open(rmsk, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            if f[10] not in want or not PRIMARY.match(f[5]):
                continue
            c, s, e, sub = f[5], int(f[6]), int(f[7]), f[10]
            n[sub] += 1
            if c not in idx:
                continue
            v, starts, maxlen = idx[c]
            j = bisect.bisect_left(starts, s - maxlen)
            types = set()
            while j < len(v) and v[j][0] < e:
                if v[j][1] > s:
                    types.add(v[j][2])
                j += 1
            if types:
                ov[sub] += 1
                for t in types:
                    bytype[sub][t] += 1
                if "protein_coding" not in types:
                    noncoding_only[sub] += 1
    with open(out, "w") as fh:
        fh.write("subfamily\tcopies\tcopies_in_genes\tcopies_in_noncoding_genes_only\tgene_type\tcopies_overlapping_type\n")
        for sub in subs:
            for t, k in bytype[sub].most_common():
                fh.write(f"{sub}\t{n[sub]}\t{ov[sub]}\t{noncoding_only[sub]}\t{t}\t{k}\n")
            print(f"{sub}: {n[sub]} copies, {ov[sub]} in a gene body, {noncoding_only[sub]} only in non-protein-coding genes; top types {bytype[sub].most_common(4)}")


if __name__ == "__main__":
    main(*sys.argv[1:4], *sys.argv[4:])
