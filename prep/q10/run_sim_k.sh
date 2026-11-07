#!/bin/bash
# Scenario 2 reads for the q10 benchmark: 2,000 perfect 100-base reads per mouse subfamily, cut from
# only K copies each, aligned with STAR 2.7.11b at the TEtranscripts settings used in q9's te100 runs.
# Usage: run_sim_k.sh K     (K = 0: every copy, q9's reads with unique names -> out/mouse_all)
set -euo pipefail
K=$1
if [ "$K" = 0 ]; then TAG=all; SEED=1100; else TAG=k$K; SEED=3100; fi
THREADS=${SLURM_CPUS_PER_TASK:-8}
STAR=/data1/greenbab/users/ahunos/apps/STAR-2.7.11b/bin/Linux_x86_64_static/STAR
IDX=/data1/greenbab/database/STARsolo_index/mm10/defualt_index
Q9=/data1/greenbab/users/ahunos/projects/RepeatAfterMe_q9
cd /data1/greenbab/users/ahunos/projects/RepeatAfterMe_q10
OUT=out/mouse_$TAG; mkdir -p "$OUT"
{
  echo "species	mouse"; echo "index	$IDX"; echo "reads_per_subfamily	2000"; echo "copies_per_subfamily	$K"
  echo "star_extra_settings	--outFilterMultimapNmax 100 --winAnchorMultimapNmax 100"
  echo "star	$($STAR --version)"; echo "python	$(python3 --version 2>&1)"
  echo "rmsk_md5	$(md5sum $Q9/raw/mouse/rmsk.txt.gz | cut -d' ' -f1)"; echo "host	$(hostname)"; echo "started	$(date -Is)"
} > "$OUT/run_info.tsv"
python3 -I scripts/sim_reads_k.py $Q9/raw/mouse/rmsk.txt.gz "$IDX/genome.fa" 100 2000 $K $SEED "$OUT/sim_100.fq"
$STAR --genomeDir "$IDX" --readFilesIn "$OUT/sim_100.fq" --runThreadN $THREADS \
      --outSAMtype BAM Unsorted --outSAMunmapped Within --outFileNamePrefix "$OUT/star_100_" \
      --outFilterMultimapNmax 100 --winAnchorMultimapNmax 100
gzip -f "$OUT/sim_100.fq"
echo "finished	$(date -Is)" >> "$OUT/run_info.tsv"
