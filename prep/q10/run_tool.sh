#!/bin/bash
# Run one counting tool on q9's simulated mouse reads (100 bases, STAR with both multimap limits at 100).
# Usage: run_tool.sh annot|fc|tecount|telocal|telescope [te100|k3]
#   te100 (default): q9's reads, cut evenly from every copy of each subfamily -> out/mouse
#   k3: scenario 2, reads cut from 3 copies per subfamily (run_sim_k.sh 3) -> out/mouse_k3
# Every tool reads the same BAM and the same annotation built from one RepeatMasker table.
set -euo pipefail
TOOL=$1; SCEN=${2:-te100}
T=${SLURM_CPUS_PER_TASK:-4}
cd /data1/greenbab/users/ahunos/projects/RepeatAfterMe_q10
source /data1/greenbab/software/miniconda3/etc/profile.d/conda.sh
Q9=/data1/greenbab/users/ahunos/projects/RepeatAfterMe_q9
# Scenarios: all (every copy, q9's reads with unique names) or k3 (three copies per subfamily).
# out/mouse (q9's BAM, non-unique read names) is kept only as the first attempt; see PROGRESS.md.
if [ "$SCEN" = te100 ]; then
  SIM=$Q9/out/mouse_te100; D=out/mouse
else
  SIM=out/mouse_$SCEN; D=out/mouse_$SCEN
fi
BAM=$SIM/star_100_Aligned.out.bam
A=$D/annot; O=$D/$TOOL
mkdir -p "$A" "$O"
echo "start $(date -Is) host $(hostname) tool $TOOL scenario $SCEN bam $BAM"
case $TOOL in
  annot)
    python3 -I scripts/build_annots.py $Q9/raw/mouse/rmsk.txt.gz $SIM/sim_100.fq.gz \
      $SIM/sim_100.fq.names 100 "$A"
    md5sum $Q9/raw/mouse/rmsk.txt.gz $BAM > "$A/inputs.md5" ;;
  fc)
    conda activate envs/te
    for lvl in copy sub; do
      featureCounts -T $T -F SAF -a $A/$lvl.saf --largestOverlap -o $O/${lvl}_uniq.txt $BAM
      featureCounts -T $T -F SAF -a $A/$lvl.saf --largestOverlap -M -o $O/${lvl}_M.txt $BAM
      featureCounts -T $T -F SAF -a $A/$lvl.saf --largestOverlap -M --fraction -o $O/${lvl}_Mfrac.txt $BAM
    done ;;
  tecount)
    conda activate envs/te
    for mode in multi uniq; do
      TEcount --format BAM --mode $mode --stranded no -b $BAM --GTF $A/stub_genes.gtf --TE $A/te.gtf \
        --project $mode --outdir $O
    done ;;
  telocal)
    conda activate envs/te
    [ -s $A/te.locInd ] || python scripts/build_locind.py $A/te.gtf $A/te.locInd
    TElocal --mode multi --stranded no -b $BAM --GTF $A/stub_genes.gtf --TE $A/te.locInd --project $O/multi ;;
  telescope)
    conda activate envs/telescope
    telescope assign $BAM $A/te.gtf --outdir $O --exp_tag mouse ;;
  *) echo "unknown tool $TOOL"; exit 1 ;;
esac
echo "end $(date -Is)"
