"""Compare every tool's counts with the truth, per subfamily. Small outputs only.

    python3 -I summarize.py out/mouse

Reads out/mouse/annot/{copies,truth_copy,truth_sub}.tsv and whatever tool outputs exist:
  fc/{copy,sub}_{uniq,M,Mfrac}.txt        featureCounts (last column = counts)
  tecount/{multi,uniq}.cntTable            TEcount: rows "subfamily:family:class"
  telocal/multi.cntTable                   TElocal: rows "copy:subfamily:family:class"
  telescope/mouse-telescope_report.tsv     Telescope: one column per count type
Writes out/mouse/summary_sub.tsv (one row per method and subfamily) and summary_methods.tsv.
copy_abs_err for a subfamily = sum over its copies of |estimate - truth| (copy-level methods only);
half of the total over all copies is the least number of reads put on a wrong copy.
"""
import collections, csv, glob, os, sys


def tsv(path):
    with open(path) as fh:
        return list(csv.DictReader(fh, delimiter="\t"))


def featurecounts(path):
    out = {}
    with open(path) as fh:
        for line in fh:
            if line.startswith("#") or line.startswith("Geneid"):
                continue
            f = line.rstrip("\n").split("\t")
            out[f[0]] = float(f[-1])
    return out


def cnttable(path, key_field):
    out = {}
    with open(path) as fh:
        next(fh)
        for line in fh:
            name, v = line.rstrip("\n").split("\t")[:2]
            parts = name.split(":")
            if len(parts) < 3:          # gene rows (the stub) have no ':'
                continue
            out[parts[key_field]] = float(v)
    return out


def main(d):
    A = f"{d}/annot"
    copy_sub = {}
    for r in tsv(f"{A}/copies.tsv"):
        copy_sub[r["copy_id"]] = r["sub_id"]
    tcopy = {r["copy_id"]: int(r["reads"]) for r in tsv(f"{A}/truth_copy.tsv")}
    tsub_rows = tsv(f"{A}/truth_sub.tsv")
    tsub = {r["sub_id"]: int(r["reads"]) for r in tsub_rows}
    all_subs = set(copy_sub.values())
    reads = sum(tsub.values())

    methods = []                       # (name, level, dict)
    for lvl in ("copy", "sub"):
        for m in ("uniq", "M", "Mfrac"):
            p = f"{d}/fc/{lvl}_{m}.txt"
            if os.path.exists(p):
                methods.append((f"featureCounts_{m}_{lvl}", lvl, featurecounts(p)))
    for m in ("multi", "uniq"):
        p = f"{d}/tecount/{m}.cntTable"
        if os.path.exists(p):
            methods.append((f"TEcount_{m}", "sub", cnttable(p, 0)))
    p = f"{d}/telocal/multi.cntTable"
    if os.path.exists(p):
        methods.append(("TElocal_multi", "copy", cnttable(p, 0)))
    for p in glob.glob(f"{d}/telescope/*telescope_report.tsv"):
        with open(p) as fh:
            next(fh)                                   # Telescope writes a comment line first
            rows = list(csv.DictReader(fh, delimiter="\t"))
        cols = [c for c in rows[0] if c.endswith("_count") or c.startswith("init_best") or c == "final_conf"]
        for c in cols:
            vals = {}
            for r in rows:
                if r["transcript"] in copy_sub:
                    vals[r["transcript"]] = vals.get(r["transcript"], 0.0) + float(r[c])
            methods.append((f"Telescope_{c}", "copy", vals))

    with open(f"{d}/summary_sub.tsv", "w") as out, open(f"{d}/summary_methods.tsv", "w") as sm:
        out.write("method\tlevel\tsub_id\ttruth\test\tcopy_abs_err\tcopies_true\tcopies_est\n")
        sm.write("method\tlevel\treads\tcounted\tsub_abs_err\tcopy_abs_err\tunknown_ids\n")
        for name, lvl, vals in methods:
            est_sub, err, ntrue, nest = collections.Counter(), collections.Counter(), collections.Counter(), collections.Counter()
            unknown = 0
            if lvl == "copy":
                seen = set()
                for cid, v in vals.items():
                    s = copy_sub.get(cid)
                    if s is None:
                        unknown += 1
                        continue
                    est_sub[s] += v
                    t = tcopy.get(cid, 0)
                    err[s] += abs(v - t)
                    if v > 0: nest[s] += 1
                    seen.add(cid)
                for cid, t in tcopy.items():
                    s = copy_sub[cid]
                    ntrue[s] += 1
                    if cid not in seen:
                        err[s] += t
            else:
                for s, v in vals.items():
                    if s not in all_subs:
                        unknown += 1
                    est_sub[s] += v
            subs = set(tsub) | {s for s in est_sub if est_sub[s] > 0}
            sub_err = 0.0
            for s in sorted(subs):
                t = tsub.get(s, 0)
                sub_err += abs(est_sub[s] - t)
                ce = f"{err[s]:.2f}" if lvl == "copy" else "NA"
                out.write(f"{name}\t{lvl}\t{s}\t{t}\t{est_sub[s]:.2f}\t{ce}\t{ntrue[s]}\t{nest[s]}\n")
            tot_ce = f"{sum(err.values()):.1f}" if lvl == "copy" else "NA"
            sm.write(f"{name}\t{lvl}\t{reads}\t{sum(est_sub.values()):.1f}\t{sub_err:.1f}\t{tot_ce}\t{unknown}\n")
            print(f"{name:32s} counted {sum(est_sub.values()):12.1f} of {reads}; subfamily error {sub_err:12.1f}; copy error {tot_ce}; unknown ids {unknown}")


if __name__ == "__main__":
    main(sys.argv[1])
