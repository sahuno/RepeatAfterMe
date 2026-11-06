"""Cut perfect reads from every RepeatMasker subfamily, for the multi-mapping lesson.

    python3 -I sim_reads.py rmsk.txt.gz genome.fa READ_LEN N_PER_SUBFAMILY SEED out.fq

Rows: primary chromosomes only (chr1..chrN, chrX, chrY, chrM), as in rmsk_summary.py;
Simple_repeat and Low_complexity left out. Subfamilies with fewer than 1,000 bases are skipped.
For each subfamily, N bases are drawn at random from all its rows, each base equally likely
(so long rows are drawn more often). The read is centred on that base, so it is a typical read
covering the repeat; near the edge of a short row it runs into the DNA next to it, as real reads do.
Half the reads are reverse-complemented. Reads touching N, or running off the chromosome, are redrawn.
Read name: <subfamily index>|<chrom>:<0-based start>|<strand>. A header file out.fq.names lists
the subfamily index, class, family, subfamily and bases.
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

def main(rmsk, fasta, L, N, seed, out):
    L, N = int(L), int(N)
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
    missing = chroms - set(genome)
    if missing:
        sys.exit("chromosomes missing from FASTA: " + ",".join(sorted(missing)))
    with open(out + ".names", "w") as nm:
        nm.write("idx\tclass\tfamily\tsubfamily\tbp\n")
        for i, k in enumerate(keys):
            nm.write(f"{i}\t" + "\t".join(k) + f"\t{sum(e - s for _, s, e in rows[k])}\n")
    with open(out, "w") as fq:
        for i, k in enumerate(keys):
            r = rows[k]
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
                fq.write(f"@{i}|{c}:{start}|{strand}\n{read}\n+\n{'I' * L}\n")
                made += 1

if __name__ == "__main__":
    main(*sys.argv[1:7])
