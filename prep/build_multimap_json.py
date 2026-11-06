"""Build the data file for the "One read, many places" lesson.

    python3 -I build_multimap_json.py SPECIES divergence.tsv run_dir_default run_dir_te100 [SPECIES ...] out.js

Arguments come in groups of four per species, then the output path. Each run directory holds
tally_50.tsv, tally_100.tsv and run_info.tsv from run_q9.sh (sim_reads.py + STAR + tally_star.py).
"default" is STAR at default settings; "te100" adds --outFilterMultimapNmax 100
--winAnchorMultimapNmax 100, the setting used in the TEtranscripts study.
Per subfamily the file stores: class, family, subfamily, bases, median divergence (%), and for
each run [reads, unique, nh2, nh3_4, nh5_10, nh11_up, too_many, no_window, other_unmapped, home].
"""
import json, sys

COUNTS = ["reads", "unique", "nh2", "nh3_4", "nh5_10", "nh11_up", "too_many", "no_window", "other_unmapped", "home"]
RUNS = [("default", "50"), ("default", "100"), ("te100", "50"), ("te100", "100")]

def table(path):
    with open(path) as fh:
        head = fh.readline().rstrip("\n").split("\t")
        return [dict(zip(head, l.rstrip("\n").split("\t"))) for l in fh]

def info(path):
    return dict(l.rstrip("\n").split("\t", 1) for l in open(path) if "\t" in l)

def main(args):
    out_path, args = args[-1], args[:-1]
    assert len(args) % 4 == 0, "arguments come in groups of four per species"
    data = {"runs": [list(r) for r in RUNS], "counts": COUNTS, "species": {}}
    for i in range(0, len(args), 4):
        sp, div_path, d_dir, t_dir = args[i:i + 4]
        div = {(r["class"], r["family"], r["subfamily"]): float(r["div_median"]) for r in table(div_path)}
        dirs = {"default": d_dir, "te100": t_dir}
        rows, meta = {}, {}
        for setting, L in RUNS:
            meta[setting] = info(f"{dirs[setting]}/run_info.tsv")
            for r in table(f"{dirs[setting]}/tally_{L}.tsv"):
                k = (r["class"], r["family"], r["subfamily"])
                rows.setdefault(k, {"bp": int(r["bp"]), "runs": {}})["runs"][(setting, L)] = [int(r[c]) for c in COUNTS]
        subs = []
        for k in sorted(rows):
            v = rows[k]
            assert len(v["runs"]) == 4, ("missing run for", k)
            assert len({tuple(x)[0] for x in v["runs"].values()}) == 1, ("read counts differ between runs", k)
            subs.append(list(k) + [v["bp"], div.get(k)] + [v["runs"][r] for r in RUNS])
        m = meta["default"]
        data["species"][sp] = {
            "star": m["star"], "index": m["index"], "fastaMd5": m["fasta_md5"], "rmskMd5": m["rmsk_md5"],
            "readsPerSubfamily": int(m["reads_per_subfamily"]), "te100": meta["te100"]["star_extra_settings"],
            "subs": subs,
        }
    with open(out_path, "w") as fh:
        fh.write("window.MULTIMAP_DATA=")
        json.dump(data, fh, separators=(",", ":"))
        fh.write(";\n")

if __name__ == "__main__":
    main(sys.argv[1:])
