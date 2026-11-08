"""Tile perfect reads across every copy of one RepeatMasker subfamily (lesson 11: which copies can be told apart).

    python3 -I tile_reads.py rmsk.txt.gz genome.fa SUBFAMILY READ_LEN STEP out.fq

Rows: the subfamily's rows on primary chromosomes (chr1..chrN, chrX, chrY, chrM), as in the other lessons.
One read is centred every STEP bases along each row, starting STEP/2 in, so every read's centre base lies
inside its row; near a row's edge the read runs into the DNA next to it, as real reads do.
Reads alternate between forward and reverse-complement. Reads touching N or running off the chromosome are skipped.
Read name: <row number>|<chrom>:<0-based start>|<strand>|<serial>.
Writes out.fq and out.fq.rows (one line per row: row number, chrom, start0, end, strand, milliDiv,
consensus start and end covered, consensus length, reads written).
"""
import gzip, re, sys

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
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


def cons_span(f):
    """UCSC rmsk columns: + strand repStart, repEnd, repLeft(<=0); - strand repStart(<=0 = left), repEnd, repLeft."""
    strand, a, b, c = f[9], int(f[13]), int(f[14]), int(f[15])
    if strand == "+":
        return a, b, b - c            # covered start (1-based), end, consensus length
    return c, b, b - a                # on - strand, repLeft holds the covered start


def main(rmsk, fasta, sub, L, step, out):
    L, step = int(L), int(step)
    rows = []
    with gzip.open(rmsk, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            if f[10] == sub and PRIMARY.match(f[5]):
                cs, ce, cl = cons_span(f)
                rows.append((f[5], int(f[6]), int(f[7]), f[9], int(f[2]), cs, ce, cl))
    genome = read_fasta(fasta, {r[0] for r in rows})
    half, serial = L // 2, 0
    with open(out, "w") as fq, open(out + ".rows", "w") as rw:
        rw.write("row\tchrom\tstart0\tend\tstrand\tmilliDiv\tcons_start\tcons_end\tcons_len\treads\n")
        for i, (c, s, e, st, md, cs, ce, cl) in enumerate(rows):
            g, n = genome[c], 0
            for centre in range(s + step // 2, e, step):
                a = centre - half
                if a < 0 or a + L > len(g):
                    continue
                r = g[a:a + L]
                if "N" in r:
                    continue
                strand = "+" if serial % 2 == 0 else "-"
                if strand == "-":
                    r = r.translate(COMP)[::-1]
                fq.write(f"@{i}|{c}:{a}|{strand}|{serial}\n{r}\n+\n{'I' * L}\n")
                serial += 1; n += 1
            rw.write(f"{i}\t{c}\t{s}\t{e}\t{st}\t{md}\t{cs}\t{ce}\t{cl}\t{n}\n")
    print(f"{sub}: {len(rows)} rows, {serial} reads", file=sys.stderr)


if __name__ == "__main__":
    main(*sys.argv[1:])
