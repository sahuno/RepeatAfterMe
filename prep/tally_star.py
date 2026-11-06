"""Count where STAR put the simulated reads, per subfamily. Reads SAM text on stdin.

    samtools view Aligned.out.bam | python3 -I tally_star.py reads.fq.names READ_LEN out.tsv

Needs STAR run with --outSAMunmapped Within, which keeps unmapped reads with a uT tag
(STAR source ReadAlign_mappedFilter.cpp: 0 = no good windows, 1 = too short, 2 = too many
mismatches, 3 = more loci than outFilterMultimapNmax).
Per subfamily: reads; unique (NH 1, MAPQ 255); nh2 (MAPQ 3); nh3_4 (MAPQ 1); nh5_10 and
nh11_up (MAPQ 0; nh11_up only when the loci limit was raised); too_many (uT 3); no_window
(uT 0: with perfect reads, the usual cause is that every anchor maps to more loci than
winAnchorMultimapNmax, so STAR never builds an alignment); other_unmapped (uT 1 or 2);
home = reads whose primary alignment starts within 5 bases of where the read was cut.
"""
import sys
from collections import defaultdict

def main(names, L, out):
    meta = {}
    with open(names) as fh:
        next(fh)
        for line in fh:
            f = line.rstrip("\n").split("\t")
            meta[f[0]] = f[1:]
    keys = ["reads", "unique", "nh2", "nh3_4", "nh5_10", "nh11_up", "too_many", "no_window", "other_unmapped", "home"]
    t = defaultdict(lambda: dict.fromkeys(keys, 0))
    for line in sys.stdin:
        f = line.split("\t", 11)
        flag = int(f[1])
        if flag & 256 or flag & 2048:
            continue  # count each read once, on its primary line
        idx, src, _ = f[0].split("|")
        c = t[idx]
        c["reads"] += 1
        tags = dict((x[:2], x[5:].strip()) for x in f[11].split("\t")) if len(f) > 11 else {}
        if flag & 4:
            u = tags.get("uT")
            if u == "3": c["too_many"] += 1
            elif u == "0": c["no_window"] += 1
            else: c["other_unmapped"] += 1
            continue
        nh = int(tags.get("NH", "1"))
        if nh == 1: c["unique"] += 1
        elif nh == 2: c["nh2"] += 1
        elif nh <= 4: c["nh3_4"] += 1
        elif nh <= 10: c["nh5_10"] += 1
        else: c["nh11_up"] += 1
        chrom, start = src.split(":")
        if f[2] == chrom and abs(int(f[3]) - 1 - int(start)) <= 5:
            c["home"] += 1
    with open(out, "w") as o:
        o.write("read_len\tclass\tfamily\tsubfamily\tbp\t" + "\t".join(keys) + "\n")
        for idx in sorted(t, key=int):
            o.write(L + "\t" + "\t".join(meta[idx]) + "\t" + "\t".join(str(t[idx][k]) for k in keys) + "\n")

if __name__ == "__main__":
    main(*sys.argv[1:4])
