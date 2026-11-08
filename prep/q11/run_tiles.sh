#!/bin/bash
# Lesson 11: tile reads across every copy of one mouse subfamily and see which copies STAR can place them on.
# Usage: run_tiles.sh SUBFAMILY   (mouse, mm10; same STAR index and settings as q9's te100 run)
set -euo pipefail
SUB=$1; STEP=20; L=100
THREADS=${SLURM_CPUS_PER_TASK:-8}
STAR=/data1/greenbab/users/ahunos/apps/STAR-2.7.11b/bin/Linux_x86_64_static/STAR
SAMTOOLS=/data1/greenbab/users/ahunos/apps/samtools-1.20/samtools
Q9=/data1/greenbab/users/ahunos/projects/RepeatAfterMe_q9
IDX=$(awk -F'\t' '$1=="index"{print $2}' $Q9/out/mouse_te100/run_info.tsv)
cd /data1/greenbab/users/ahunos/projects/RepeatAfterMe_q11
P=out/mouse.mm10.${SUB}.tiles; mkdir -p out
{ echo -e "species\tmouse"; echo -e "build\tmm10"; echo -e "subfamily\t$SUB"; echo -e "read_len\t$L"; echo -e "step\t$STEP"
  echo -e "index\t$IDX"; echo -e "star_extra_settings\t--outFilterMultimapNmax 100 --winAnchorMultimapNmax 100"
  echo -e "star\t$($STAR --version)"; echo -e "samtools\t$($SAMTOOLS --version | head -1)"; echo -e "python\t$(python3 --version 2>&1)"
  echo -e "rmsk_md5\t$(md5sum $Q9/raw/mouse/rmsk.txt.gz | cut -d' ' -f1)"; echo -e "host\t$(hostname)"; echo -e "started\t$(date -Is)"; } > ${P}_info.tsv
python3 -I scripts/tile_reads.py $Q9/raw/mouse/rmsk.txt.gz $IDX/genome.fa $SUB $L $STEP ${P}.fq
$STAR --genomeDir $IDX --readFilesIn ${P}.fq --runThreadN $THREADS \
      --outSAMtype BAM Unsorted --outSAMunmapped Within --outFileNamePrefix ${P}_ \
      --outFilterMultimapNmax 100 --winAnchorMultimapNmax 100
$SAMTOOLS view ${P}_Aligned.out.bam | python3 -I scripts/tally_tiles.py ${P}.fq.rows ${P}.copy_unique.tsv
gzip -f ${P}.fq
echo -e "finished\t$(date -Is)" >> ${P}_info.tsv
