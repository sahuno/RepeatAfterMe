"""Page data for the "Tested on simulated reads" section of tools.html, from the pulled benchmark tables.

    python3 -I build_bench_json.py data/q10 site/data/tools_bench.js

Reads data/q10/mouse_{all,k3}/by_age.tsv (made by bin_by_age.py from summarize.py output on iris),
data/q10/mouse_{all,k3}/run_info.tsv and data/q10/versions.tsv. Writes only numbers that are in
those files: per scenario, age bin and rule, reads counted (% of reads cut) and reads on a wrong copy
(lower bound, % of reads cut; null for rules that report subfamilies only or count reads twice).
"""
import csv, json, sys

RULES = [  # (key in by_age.tsv, label on the page, show the wrong-copy number?)
    ("featureCounts_uniq_copy", "Unique only (featureCounts)", True),
    ("featureCounts_M_copy", "featureCounts -M", False),
    ("featureCounts_Mfrac_copy", "featureCounts -M --fraction", True),
    ("TEcount_multi", "TEcount (TEtranscripts)", False),
    ("TElocal_multi", "TElocal", True),
    ("Telescope_final_count", "Telescope default", True),
    ("Telescope_final_conf", "Telescope, confident only", True),
]
BINS = ["young", "middle", "old"]


def kv(path):
    return dict(l.rstrip("\n").split("\t", 1) for l in open(path) if "\t" in l)


def main(d, out):
    data = {"rules": [{"key": k, "label": lab} for k, lab, _ in RULES], "bins": BINS, "scenarios": {}}
    for sc in ("all", "k3"):
        rows = {(r["method"], r["bin"]): r for r in csv.DictReader(open(f"{d}/mouse_{sc}/by_age.tsv"), delimiter="\t")}
        info = kv(f"{d}/mouse_{sc}/run_info.tsv")
        s = {"copies_per_subfamily": info.get("copies_per_subfamily"), "star": info.get("star"),
             "star_settings": info.get("star_extra_settings"), "bins": {}, "values": {}}
        for b in BINS:
            ref = rows[("featureCounts_uniq_copy", b)]
            s["bins"][b] = {"subfamilies": int(ref["subs"]), "reads": int(ref["truth"])}
            s["values"][b] = {}
            for k, _lab, wrong in RULES:
                r = rows[(k, b)]
                mp = float(r["misplaced_pct"]) if wrong and r["misplaced_pct"] != "NA" else None
                s["values"][b][k] = [float(r["counted_pct"]), mp]
        data["scenarios"][sc] = s
    data["versions"] = kv(f"{d}/versions.tsv")
    with open(out, "w") as fh:
        fh.write("window.TOOLS_BENCH=" + json.dumps(data, separators=(",", ":")) + ";\n")
    print("wrote", out)


if __name__ == "__main__":
    main(*sys.argv[1:3])
