"""Cut perfect reads from only K copies of each RepeatMasker subfamily (q10 benchmark, scenario 2).

    python3 -I sim_reads_k.py rmsk.txt.gz genome.fa READ_LEN N_PER_SUBFAMILY K SEED out.fq

K = 0 means every row (scenario 1). With K = 0 and SEED = 1000 + READ_LEN the reads are the same reads,
in the same order, as q9's sim_reads.py made; only the names differ (a serial number is added).

Same rows, filters, read naming and header file as q9's sim_reads.py, so build_annots.py and its truth
rule work unchanged. The difference: for each subfamily, K rows are picked at random (weighted by
length, without replacement; all rows if it has K or fewer), and every read is cut from those rows,
each base of them equally likely. This is the case copy-level tools are built for: a few copies on,
the rest silent. Reads touching N, or running off the chromosome, are redrawn.
Read name: <subfamily index>|<chrom>:<0-based start>|<strand>|<serial>. The serial makes every name
unique: Telescope indexes reads by name, so two reads cut at the same place would otherwise be merged.
"""
import bisect, gzip, random, re, sys
from collections import defaultdict

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
SKIP = {"Simple_repeat", "Low_complexity"}
COMP = str.maketrans("ACGTacgt", "TGCAtgca")


def read_fasta(path, keep):
    seq, name, parts = {}, None, []
    op = gzip.open if path.endswith(".gz") else open
    with op(path, "rt") as fh:
        for line in fh:
            if line.startswith(">"):
                if name in keep: seq[name] = "".join(parts).upper()
                name, parts = line[1:].split()[0], []
            elif name in keep:
                parts.append(line.strip())
    if name in keep: seq[name] = "".join(parts).upper()
    return seq


def pick_rows(r, k, rng):
    """K distinct rows, each step weighted by row length."""
    if len(r) <= k:
        return list(r)
    left, chosen = list(r), []
    for _ in range(k):
        w = [e - s for _, s, e in left]
        x, acc = rng.randrange(sum(w)), 0
        for j, wj in enumerate(w):
            acc += wj
            if x < acc:
                chosen.append(left.pop(j))
                break
    return chosen


def main(rmsk, fasta, L, N, K, seed, out):
    L, N, K = int(L), int(N), int(K)
    rng = random.Random(int(seed))
    rows = defaultdict(list)
    with gzip.open(rmsk, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            if PRIMARY.match(f[5]) and f[11] not in SKIP:
                rows[(f[11], f[12], f[10])].append((f[5], int(f[6]), int(f[7])))
    keys = sorted(k for k, r in rows.items() if sum(e - s for _, s, e in r) >= 1000)
    chroms = {c for k in keys for c, _, _ in rows[k]}
    genome = read_fasta(fasta, chroms)
    with open(out + ".names", "w") as nm:
        nm.write("idx\tclass\tfamily\tsubfamily\tbp\n")
        for i, k in enumerate(keys):
            nm.write(f"{i}\t" + "\t".join(k) + f"\t{sum(e - s for _, s, e in rows[k])}\n")
    serial = 0
    with open(out, "w") as fq, open(out + ".chosen", "w") as ch:
        ch.write("idx\tchrom\tstart0\tend\n")
        for i, k in enumerate(keys):
            r = pick_rows(rows[k], K, rng) if K > 0 else rows[k]
            if K > 0:
                for c, s, e in r:
                    ch.write(f"{i}\t{c}\t{s}\t{e}\n")
            cum, t = [], 0
            for _, s, e in r:
                t += e - s; cum.append(t)
            made, tries = 0, 0
            while made < N and tries < N * 20:
                tries += 1
                x = rng.randrange(t)
                j = bisect.bisect_right(cum, x)
                c, s, e = r[j]
                base = s + x - (cum[j] - (e - s))
                start = base - L // 2
                g = genome[c]
                if start < 0 or start + L > len(g):
                    continue
                read = g[start:start + L]
                if "N" in read:
                    continue
                strand = "+"
                if rng.random() < 0.5:
                    read, strand = read.translate(COMP)[::-1], "-"
                fq.write(f"@{i}|{c}:{start}|{strand}|{serial}\n{read}\n+\n{'I' * L}\n")
                made += 1
                serial += 1


if __name__ == "__main__":
    main(*sys.argv[1:8])
