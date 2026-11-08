"""Per-copy counts for one subfamily in the q10 three-copies benchmark, against the truth (lesson 11).

    python3 -I k3_copies.py RepeatAfterMe_q10/out/mouse_k3 SUBFAMILY out.tsv

Rows: every copy of the subfamily that has true reads or a count of at least 0.5 from any copy-level rule.
Columns: copy, position, milliDiv, truth, featureCounts unique / -M --fraction, TElocal, Telescope final and unique.
"""
import csv, glob, sys


def main(d, sub, out):
    A = f"{d}/annot"
    copies = {r["copy_id"]: r for r in csv.DictReader(open(f"{A}/copies.tsv"), delimiter="\t") if r["sub_id"] == sub}
    cols = {"truth": {r["copy_id"]: float(r["reads"]) for r in csv.DictReader(open(f"{A}/truth_copy.tsv"), delimiter="\t") if r["copy_id"] in copies}}
    for m in ("uniq", "Mfrac"):
        v = {}
        for line in open(f"{d}/fc/copy_{m}.txt"):
            if line.startswith("#") or line.startswith("Geneid"):
                continue
            f = line.rstrip("\n").split("\t")
            if f[0] in copies:
                v[f[0]] = float(f[-1])
        cols[f"fc_{m}"] = v
    v = {}
    for line in open(f"{d}/telocal/multi.cntTable"):
        f = line.rstrip("\n").split("\t")
        k = f[0].strip('"').split(":")[0]
        if k in copies:
            v[k] = float(f[1])
    cols["telocal"] = v
    p = glob.glob(f"{d}/telescope/*telescope_report.tsv")[0]
    with open(p) as fh:
        next(fh)
        rows = list(csv.DictReader(fh, delimiter="\t"))
    for c, name in (("final_count", "telescope"), ("unique_count", "telescope_unique")):
        cols[name] = {r["transcript"]: float(r[c]) for r in rows if r["transcript"] in copies}
    names = list(cols)
    keep = [k for k in copies if any(cols[n].get(k, 0) >= 0.5 for n in names if n != "fc_Mfrac") or cols["truth"].get(k, 0) > 0]
    with open(out, "w") as o:
        o.write("copy_id\tchrom\tstart0\tend\tstrand\tmilliDiv\t" + "\t".join(names) + "\n")
        for k in sorted(keep, key=lambda k: (-cols["truth"].get(k, 0), -cols["telescope"].get(k, 0))):
            r = copies[k]
            o.write(f"{k}\t{r['chrom']}\t{r['start0']}\t{r['end']}\t{r['strand']}\t{r['milliDiv']}\t" + "\t".join(f"{cols[n].get(k, 0):.2f}" for n in names) + "\n")
        tot = {n: sum(cols[n].values()) for n in names}
        nz = {n: sum(1 for x in cols[n].values() if x > 0) for n in names}
        o.write("#total\t\t\t\t\t\t" + "\t".join(f"{tot[n]:.2f}" for n in names) + "\n")
        o.write("#copies_above_0\t\t\t\t\t\t" + "\t".join(str(nz[n]) for n in names) + "\n")


if __name__ == "__main__":
    main(*sys.argv[1:])
