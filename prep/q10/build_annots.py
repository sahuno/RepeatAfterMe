"""Annotations and truth for the q10 counting-tool benchmark, from one RepeatMasker table.

    python3 -I build_annots.py rmsk.txt.gz sim.fq.gz sim.fq.names READ_LEN OUT_DIR

Rows kept exactly as in q9's sim_reads.py: primary chromosomes (chr1..chrN, chrX, chrY, chrM),
Simple_repeat and Low_complexity left out. One copy = one RepeatMasker row (a row can be only part
of one insertion: see the Body and ends lesson). Copy id = <subfamily>_r<row number>, unique.
A subfamily is one (class, family, name) triple, as in sim_reads.py; seven mouse names occur under
two families, so their id gets "@<family>" added.

Writes to OUT_DIR:
  te.gtf          Hammell-lab TE GTF layout (gene_id = subfamily, transcript_id = copy id,
                  family_id, class_id) plus locus = copy id for Telescope. 1-based, closed.
  stub_genes.gtf  one gene on a contig absent from the BAM, so tools that require a gene GTF
                  see TE features only.
  copy.saf, sub.saf   featureCounts SAF: GeneID = copy id, or subfamily.
  copies.tsv      copy_id, sub_id, class, family, name, chrom, start0, end, strand, milliDiv
  truth_copy.tsv  copy_id, reads: reads whose centre base lies in that row (rows of the read's
                  own subfamily only), from read names <idx>|<chrom>:<start0>|<strand>.
  truth_sub.tsv   sub_idx, sub_id, class, family, name, reads, reads_without_copy
"""
import bisect, collections, gzip, re, sys

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
SKIP = {"Simple_repeat", "Low_complexity"}

def main(rmsk, fq, names, L, out):
    L = int(L)
    rows = []                                   # (chrom, start0, end, strand, cls, fam, name, div)
    fams = collections.defaultdict(set)
    with gzip.open(rmsk, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            if PRIMARY.match(f[5]) and f[11] not in SKIP:
                rows.append((f[5], int(f[6]), int(f[7]), f[9], f[11], f[12], f[10], int(f[2])))
                fams[f[10]].add((f[11], f[12]))
    clash = {n for n, s in fams.items() if len(s) > 1}
    def sub_id(cls, fam, name):
        return name + "@" + fam if name in clash else name
    by_key = collections.defaultdict(list)      # triple -> [(start0, end, copy_id, chrom)]
    with open(f"{out}/te.gtf", "w") as gtf, open(f"{out}/copy.saf", "w") as cs, \
         open(f"{out}/sub.saf", "w") as ss, open(f"{out}/copies.tsv", "w") as ct:
        cs.write("GeneID\tChr\tStart\tEnd\tStrand\n"); ss.write("GeneID\tChr\tStart\tEnd\tStrand\n")
        ct.write("copy_id\tsub_id\tclass\tfamily\tname\tchrom\tstart0\tend\tstrand\tmilliDiv\n")
        for i, (c, s, e, st, cls, fam, name, div) in enumerate(rows):
            sid = sub_id(cls, fam, name)
            cid = f"{sid}_r{i}"
            gtf.write(f'{c}\trmsk\texon\t{s + 1}\t{e}\t.\t{st}\t.\tgene_id "{sid}"; transcript_id "{cid}"; '
                      f'family_id "{fam}"; class_id "{cls}"; locus "{cid}";\n')
            cs.write(f"{cid}\t{c}\t{s + 1}\t{e}\t{st}\n")
            ss.write(f"{sid}\t{c}\t{s + 1}\t{e}\t{st}\n")
            ct.write(f"{cid}\t{sid}\t{cls}\t{fam}\t{name}\t{c}\t{s}\t{e}\t{st}\t{div}\n")
            by_key[(cls, fam, name)].append((c, s, e, cid))
    with open(f"{out}/stub_genes.gtf", "w") as g:
        g.write('chrStub\tstub\texon\t1\t100\t.\t+\t.\tgene_id "STUB"; transcript_id "STUB.1";\n')

    idx2key = {}
    with open(names) as fh:
        next(fh)
        for line in fh:
            i, cls, fam, name, _bp = line.rstrip("\n").split("\t")
            idx2key[int(i)] = (cls, fam, name)
    # per subfamily and chromosome: sorted starts, for finding the row that holds a base
    look = {}
    for k in idx2key.values():
        per = collections.defaultdict(list)
        for c, s, e, cid in by_key[k]:
            per[c].append((s, e, cid))
        look[k] = {c: (sorted(v), [x[0] for x in sorted(v)]) for c, v in per.items()}
    truth_copy, truth_sub, miss = collections.Counter(), collections.Counter(), collections.Counter()
    op = gzip.open if fq.endswith(".gz") else open
    with op(fq, "rt") as fh:
        for n, line in enumerate(fh):
            if n % 4:
                continue
            i, pos = line[1:].rstrip("\n").split("|")[:2]   # names may carry |<strand>|<serial> after
            c, start = pos.rsplit(":", 1)
            i, base = int(i), int(start) + L // 2
            k = idx2key[i]
            truth_sub[i] += 1
            v = look[k].get(c)
            hit = None
            if v:
                j = bisect.bisect_right(v[1], base) - 1
                # rows of one subfamily rarely overlap; look back a few rows for one that holds the base
                for jj in range(j, max(-1, j - 20), -1):
                    s, e, cid = v[0][jj]
                    if s <= base < e:
                        hit = cid
                        break
            if hit:
                truth_copy[hit] += 1
            else:
                miss[i] += 1
    with open(f"{out}/truth_copy.tsv", "w") as t:
        t.write("copy_id\treads\n")
        for cid, r in sorted(truth_copy.items()):
            t.write(f"{cid}\t{r}\n")
    with open(f"{out}/truth_sub.tsv", "w") as t:
        t.write("sub_idx\tsub_id\tclass\tfamily\tname\treads\treads_without_copy\n")
        for i, (cls, fam, name) in sorted(idx2key.items()):
            t.write(f"{i}\t{sub_id(cls, fam, name)}\t{cls}\t{fam}\t{name}\t{truth_sub[i]}\t{miss[i]}\n")
    print(f"rows {len(rows)}; name clashes {len(clash)}; reads {sum(truth_sub.values())}; "
          f"reads without a copy {sum(miss.values())}; copies with reads {len(truth_copy)}")

if __name__ == "__main__":
    main(*sys.argv[1:6])
