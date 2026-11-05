"""Link transposon families across two species summaries by RepeatMasker label.

    python3 -I link_families.py mouse_summary.tsv human_summary.tsv links.tsv

Rule, applied without judgement: two families are linked when both tables file
them under the identical "class/family" label (trailing "?" kept, so "DNA?/hAT"
links only to "DNA?/hAT"). Only transposon classes are linked. A link means
"same RepeatMasker label", not "same element". Families with no identical label
in the other table get no link.

Prints every unlinked family that covers more than 1% of its own genome; those
are the only ones worth a human look.
"""
import sys
from collections import defaultdict

def read(path):
    genome, fam = None, defaultdict(lambda: [0, 0, 0])  # bp, copies, subfamilies
    with open(path) as fh:
        for line in fh:
            if line.startswith("# genome_bp"):
                genome = int(line.split("\t")[1])
            if line.startswith("#") or line.startswith("class\t"):
                continue
            cls, f, sub, copies, bp, te = line.rstrip("\n").split("\t")
            if te == "1":
                v = fam[f"{cls}/{f}"]
                v[0] += int(bp); v[1] += int(copies); v[2] += 1
    return genome, fam

def main(a_path, b_path, out_path, threshold=0.01):
    ga, a = read(a_path)
    gb, b = read(b_path)
    shared = sorted(set(a) & set(b))
    with open(out_path, "w") as out:
        out.write("label\tin_a\tin_b\ta_pct_genome\tb_pct_genome\n")
        for lab in sorted(set(a) | set(b)):
            pa = a[lab][0] / ga * 100 if lab in a else 0
            pb = b[lab][0] / gb * 100 if lab in b else 0
            out.write(f"{lab}\t{int(lab in a)}\t{int(lab in b)}\t{pa:.3f}\t{pb:.3f}\n")
    print(f"A families {len(a)}  B families {len(b)}  linked {len(shared)}")
    for name, own, other, g in (("A", a, b, ga), ("B", b, a, gb)):
        only = {k: v for k, v in own.items() if k not in other}
        pct = sum(v[0] for v in only.values()) / g * 100
        print(f"{name}-only families {len(only)}, covering {pct:.2f}% of {name}'s genome")
        for k, v in sorted(only.items(), key=lambda kv: -kv[1][0]):
            share = v[0] / g
            flag = "  <-- over threshold" if share > threshold else ""
            print(f"   {k:32s} {share*100:6.3f}%  {v[2]:4d} subfamilies{flag}")

if __name__ == "__main__":
    main(*sys.argv[1:4])
