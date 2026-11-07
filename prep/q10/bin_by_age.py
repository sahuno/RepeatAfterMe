"""Group the q10 benchmark summary by subfamily age. Runs on the Mac on small tables.

    python3 -I bin_by_age.py summary_sub.tsv mouse_divergence.tsv out.tsv

Age = median RepeatMasker divergence of the subfamily (site/data/<species>_divergence.tsv).
Bins: young under 3%, middle 3 to 10%, old 10% or more. Per method and bin:
  subs            subfamilies with reads in the bin
  truth           reads cut from those subfamilies
  counted_pct     reads the method counted for them, as % of truth
  sub_err_pct     sum over subfamilies of |estimate - truth|, as % of truth
  copy_err_pct    sum over copies of |estimate - truth|, halved, as % of truth (copy-level methods)
  missing_pct     (truth - counted) as % of truth: reads the method never counted for the bin
  misplaced_pct   (sum over copies of |estimate - truth| - |truth - counted|) / 2, as % of truth:
                  at least this share of the reads sits on a wrong copy, net of reads never counted
"""
import collections, csv, sys


def main(summary, div, out):
    age = {}
    names = collections.defaultdict(list)
    for r in csv.DictReader(open(div), delimiter="\t"):
        names[r["subfamily"]].append(r)
    for n, rs in names.items():
        for r in rs:
            sid = n if len(rs) == 1 else n + "@" + r["family"]
            age[sid] = float(r["div_median"]) if r["div_median"] not in ("", "NA") else None
    def bin_of(s):
        a = age.get(s)
        if a is None:
            return None
        return "young" if a < 3 else "middle" if a < 10 else "old"
    acc = collections.defaultdict(lambda: collections.Counter())
    levels = {}
    nobin = collections.Counter()
    for r in csv.DictReader(open(summary), delimiter="\t"):
        b = bin_of(r["sub_id"])
        m = r["method"]
        levels[m] = r["level"]
        if b is None:
            nobin[m] += 1
            continue
        t, e = float(r["truth"]), float(r["est"])
        a = acc[(m, b)]
        a["truth"] += t
        a["est"] += e
        a["sub_err"] += abs(e - t)
        if r["copy_abs_err"] != "NA":
            a["copy_err"] += float(r["copy_abs_err"])
        if t > 0:
            a["subs"] += 1
    with open(out, "w") as fh:
        fh.write("method\tlevel\tbin\tsubs\ttruth\tcounted_pct\tsub_err_pct\tcopy_err_pct\tmissing_pct\tmisplaced_pct\n")
        for (m, b), a in sorted(acc.items(), key=lambda kv: (kv[0][0], ["young", "middle", "old"].index(kv[0][1]))):
            T = a["truth"] or 1
            ce = f"{100 * a['copy_err'] / 2 / T:.1f}" if levels[m] == "copy" else "NA"
            miss = 100 * (a["truth"] - a["est"]) / T
            mp = f"{100 * (a['copy_err'] - abs(a['truth'] - a['est'])) / 2 / T:.1f}" if levels[m] == "copy" else "NA"
            fh.write(f"{m}\t{levels[m]}\t{b}\t{a['subs']}\t{a['truth']:.0f}\t{100 * a['est'] / T:.1f}\t"
                     f"{100 * a['sub_err'] / T:.1f}\t{ce}\t{miss:.1f}\t{mp}\n")
    if nobin:
        print("rows without an age:", dict(nobin))


if __name__ == "__main__":
    main(*sys.argv[1:4])
