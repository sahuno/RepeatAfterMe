#!/bin/bash
# Lesson 12: place every RepeatMasker copy relative to genes, for one species.
# Usage: run_context.sh mouse|human
set -euo pipefail
SP=$1
Q9=/data1/greenbab/users/ahunos/projects/RepeatAfterMe_q9
IDX=$(awk -F'\t' '$1=="index"{print $2}' $Q9/out/${SP}_te100/run_info.tsv)
BUILD=$([ "$SP" = mouse ] && echo mm10 || echo hg38)
cd /data1/greenbab/users/ahunos/projects/RepeatAfterMe_q12
mkdir -p out
INFO=out/${SP}.${BUILD}.context_info.tsv
{ echo -e "species\t$SP"; echo -e "build\t$BUILD"; echo -e "rmsk\t$Q9/raw/$SP/rmsk.txt.gz"
  echo -e "rmsk_md5\t$(md5sum $Q9/raw/$SP/rmsk.txt.gz | cut -d' ' -f1)"
  echo -e "gtf\t$IDX/annotation.gtf"; echo -e "gtf_md5\t$(md5sum $IDX/annotation.gtf | cut -d' ' -f1)"
  echo -e "gtf_genes\t$(awk -F'\t' '$3=="gene"' $IDX/annotation.gtf | wc -l)"; echo -e "started\t$(date -Is)"; } > $INFO
python3 -I scripts/locus_context.py $Q9/raw/$SP/rmsk.txt.gz $IDX/annotation.gtf out/${SP}.${BUILD}.context.tsv all
python3 -I scripts/locus_context.py $Q9/raw/$SP/rmsk.txt.gz $IDX/annotation.gtf out/${SP}.${BUILD}.context_pc.tsv protein_coding
if [ "$SP" = mouse ]; then SUBS="IAPEz-int MMERVK10C-int MERVL-int MMETn-int L1Md_A L1Md_T"; else SUBS="HERVK-int HERVH-int LTR5_Hs L1HS L1PA2 AluYa5"; fi
python3 -I scripts/gene_types.py $Q9/raw/$SP/rmsk.txt.gz $IDX/annotation.gtf out/${SP}.${BUILD}.gene_types.tsv $SUBS
echo -e "finished\t$(date -Is)" >> $INFO
