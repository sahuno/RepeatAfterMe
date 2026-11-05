"""Compare the two LTRs of one provirus, base by base.

    python3 -I ltr_pair_identity.py ASSEMBLY CHROM START1 END1 START2 END2

Coordinates are 0-based, end-exclusive, as in the UCSC rmsk table. Both LTRs of a provirus
lie on the same strand, so their genomic sequences are compared as they are.
Sequence comes from the UCSC REST API (https://api.genome.ucsc.edu/getData/sequence).
Alignment: global (Needleman-Wunsch), match +1, mismatch -1, gap -2. Prints one JSON line.
"""
import json, sys, urllib.request

def fetch(assembly, chrom, start, end):
    url = f"https://api.genome.ucsc.edu/getData/sequence?genome={assembly};chrom={chrom};start={start};end={end}"
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)["dna"].upper()

def align(a, b, match=1, mismatch=-1, gap=-2):
    n, m = len(a), len(b)
    prev = [j * gap for j in range(m + 1)]
    trace = [bytearray(m + 1) for _ in range(n + 1)]
    for j in range(1, m + 1):
        trace[0][j] = 2
    for i in range(1, n + 1):
        cur = [i * gap] + [0] * m
        trace[i][0] = 1
        ai = a[i - 1]
        for j in range(1, m + 1):
            d = prev[j - 1] + (match if ai == b[j - 1] else mismatch)
            u = prev[j] + gap
            l = cur[j - 1] + gap
            if d >= u and d >= l:
                cur[j] = d; trace[i][j] = 0
            elif u >= l:
                cur[j] = u; trace[i][j] = 1
            else:
                cur[j] = l; trace[i][j] = 2
        prev = cur
    i, j, same, diff, gaps = n, m, 0, 0, 0
    while i > 0 or j > 0:
        t = trace[i][j]
        if t == 0:
            if a[i - 1] == b[j - 1]: same += 1
            else: diff += 1
            i -= 1; j -= 1
        elif t == 1:
            gaps += 1; i -= 1
        else:
            gaps += 1; j -= 1
    return same, diff, gaps

def main(assembly, chrom, s1, e1, s2, e2):
    a = fetch(assembly, chrom, int(s1), int(e1))
    b = fetch(assembly, chrom, int(s2), int(e2))
    same, diff, gaps = align(a, b)
    cols = same + diff + gaps
    print(json.dumps({"assembly": assembly, "chrom": chrom, "ltr1": [int(s1), int(e1)], "ltr2": [int(s2), int(e2)],
                      "len1": len(a), "len2": len(b), "identical": same, "mismatches": diff, "gap_columns": gaps,
                      "identity_pct": round(100 * same / cols, 2)}))

if __name__ == "__main__":
    main(*sys.argv[1:7])
