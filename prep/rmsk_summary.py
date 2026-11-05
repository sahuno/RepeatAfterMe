"""Summarise one UCSC RepeatMasker table (rmsk.txt.gz) to one line per subfamily.

Run once per genome:
    python3 -I rmsk_summary.py rmsk.txt.gz chrom.sizes out.tsv ASSEMBLY

Inputs come from https://hgdownload.soe.ucsc.edu/goldenPath/<assembly>/database/rmsk.txt.gz
and .../bigZips/<assembly>.chrom.sizes.

Only the primary chromosomes are used (chr1..chrN, chrX, chrY, chrM). Unplaced
contigs, "_random", "chrUn", "_alt" and "_fix" sequences are dropped, so alternate
haplotypes are not counted twice.

Output columns: class, family, subfamily, copies (rows in the table), bp (bases
covered, summed over rows), te (1 if the class is a transposon class).
Header comments record the assembly, the input file's md5 and modification time
(curl -R keeps the server's date), the genome length used as the denominator,
and the first transposon row on the primary chromosomes, verbatim.
"""
import gzip, hashlib, os, re, sys, time
from collections import defaultdict

PRIMARY = re.compile(r"^chr([0-9]+|X|Y|M)$")
TE_CLASSES = {"LINE", "SINE", "LTR", "DNA", "RC", "Retroposon"}

def main(rmsk_path, sizes_path, out_path, assembly):
    md5 = hashlib.md5(open(rmsk_path, 'rb').read()).hexdigest()
    mtime = time.strftime('%Y-%m-%d', time.gmtime(os.path.getmtime(rmsk_path)))
    first_te = None
    genome = 0
    with open(sizes_path) as fh:
        for line in fh:
            chrom, size = line.split()[:2]
            if PRIMARY.match(chrom):
                genome += int(size)
    copies, bp = defaultdict(int), defaultdict(int)
    skipped = 0
    with gzip.open(rmsk_path, "rt") as fh:
        for line in fh:
            f = line.rstrip("\n").split("\t")
            # UCSC rmsk columns: 5 genoName, 6 genoStart, 7 genoEnd, 10 repName, 11 repClass, 12 repFamily
            if not PRIMARY.match(f[5]):
                skipped += 1
                continue
            if first_te is None and f[11].rstrip("?") in TE_CLASSES:
                first_te = line.rstrip("\n")
            key = (f[11], f[12], f[10])
            copies[key] += 1
            bp[key] += int(f[7]) - int(f[6])
    with open(out_path, "w") as out:
        out.write(f"# assembly\t{assembly}\n")
        out.write(f"# source_md5\t{md5}\n")
        out.write(f"# source_file_date\t{mtime}\n")
        out.write(f"# first_te_row\t{first_te}\n")
        out.write(f"# genome_bp_primary_chromosomes\t{genome}\n")
        out.write(f"# rows_skipped_non_primary\t{skipped}\n")
        out.write("class\tfamily\tsubfamily\tcopies\tbp\tte\n")
        for key in sorted(copies, key=lambda k: (k[0], k[1], -bp[k])):
            cls, fam, sub = key
            te = 1 if cls.rstrip("?") in TE_CLASSES else 0
            out.write(f"{cls}\t{fam}\t{sub}\t{copies[key]}\t{bp[key]}\t{te}\n")

if __name__ == "__main__":
    main(*sys.argv[1:5])
