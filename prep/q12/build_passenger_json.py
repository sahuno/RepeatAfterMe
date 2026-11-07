"""Page data for lesson 12 (passenger.html), from the pulled context tables.

    python3 -I build_passenger_json.py data/q12 site/data OUT.js

For each species found as data/q12/<species>.<build>.context_pc.tsv (protein-coding genes as hosts),
joined with site/data/<species>_divergence.tsv for the median age. Keeps subfamilies covering at least
1,000 bases, as the other lessons do. Writes, per subfamily: class, family, name, median divergence and
copies in each place (exon, intron_same, intron_opp, intron_both, intergenic), plus the totals and the
gene counts from <species>.<build>.context_info.tsv and the gene-type check for chosen subfamilies.
"""
import csv, glob, json, os, sys

PLACES = ["exon", "intron_same", "intron_opp", "intron_both", "intergenic"]


def main(qdir, sitedata, out):
    data = {"places": PLACES, "species": {}}
    for path in sorted(glob.glob(f"{qdir}/*.context_pc.tsv")):
        sp, build = os.path.basename(path).split(".")[:2]
        div = {}
        for r in csv.DictReader(open(f"{sitedata}/{sp}_divergence.tsv"), delimiter="\t"):
            div[(r["class"], r["family"], r["subfamily"])] = r["div_median"]
        rows, tot = [], {p: 0 for p in PLACES}
        for r in csv.DictReader(open(path), delimiter="\t"):
            n = [int(r[f"n_{p}"]) for p in PLACES]
            for p, v in zip(PLACES, n):
                tot[p] += v
            bp = sum(int(r[f"bp_{p}"]) for p in PLACES)
            if bp < 1000:
                continue
            d = div.get((r["class"], r["family"], r["subfamily"]))
            rows.append([r["class"], r["family"], r["subfamily"], float(d) if d not in (None, "", "NA") else None] + n)
        info = dict(l.rstrip("\n").split("\t", 1) for l in open(f"{qdir}/{sp}.{build}.context_info.tsv") if "\t" in l)
        gt = {}
        for r in csv.DictReader(open(f"{qdir}/{sp}.{build}.gene_types.tsv"), delimiter="\t"):
            g = gt.setdefault(r["subfamily"], {"copies": int(r["copies"]), "in_genes": int(r["copies_in_genes"]),
                                               "noncoding_only": int(r["copies_in_noncoding_genes_only"]), "types": {}})
            g["types"][r["gene_type"]] = int(r["copies_overlapping_type"])
        data["species"][sp] = {"build": build, "genes_all": int(info["gtf_genes"]), "totals": tot,
                               "subs": rows, "gene_types": gt}
        print(sp, build, "subfamilies", len(rows), "rows", sum(tot.values()))
    with open(out, "w") as fh:
        fh.write("window.PASSENGER_DATA=" + json.dumps(data, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    main(*sys.argv[1:4])
