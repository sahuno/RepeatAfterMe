"""Per copy, how many of its tiled reads STAR placed uniquely and back on that copy. Reads SAM text on stdin.

    samtools view Aligned.out.bam | python3 -I tally_tiles.py out.fq.rows out.tsv

Needs STAR run with --outSAMunmapped Within. Each read is counted once, on its primary line.
unique_home: NH 1 and the alignment starts within 5 bases of where the read was cut (the read's own copy);
unique_away: NH 1 somewhere else; multi: NH 2 or more; unmapped: anything STAR did not place.
"""
import sys


def main(rows_path, out):
    rows, order = {}, []
    with open(rows_path) as fh:
        header = next(fh).rstrip("\n").split("\t")
        for line in fh:
            f = line.rstrip("\n").split("\t")
            rows[f[0]] = dict(zip(header, f), unique_home=0, unique_away=0, multi=0, unmapped=0, seen=0)
            order.append(f[0])
    for line in sys.stdin:
        f = line.split("\t", 12)
        flag = int(f[1])
        if flag & 256 or flag & 2048:
            continue
        row, cut, _, _ = f[0].split("|")
        cut_chrom, cut_start = cut.rsplit(":", 1)
        t = rows[row]; t["seen"] += 1
        if flag & 4:
            t["unmapped"] += 1; continue
        nh = 1
        for tag in f[11].split("\t") if len(f) > 11 else []:
            if tag.startswith("NH:i:"):
                nh = int(tag[5:])
        if nh > 1:
            t["multi"] += 1
        elif f[2] == cut_chrom and abs(int(f[3]) - 1 - int(cut_start)) <= 5:
            t["unique_home"] += 1
        else:
            t["unique_away"] += 1
    cols = header + ["unique_home", "unique_away", "multi", "unmapped"]
    bad = 0
    with open(out, "w") as o:
        o.write("\t".join(cols) + "\n")
        for k in order:
            t = rows[k]
            bad += t["seen"] != int(t["reads"])
            o.write("\t".join(str(t[c]) for c in cols) + "\n")
    print(f"rows {len(order)}; rows whose read count differs from the BAM: {bad}", file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:])
