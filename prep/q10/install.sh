#!/bin/bash
# Install the counting tools for the q10 benchmark into project-local conda environments.
# envs/te: TEtranscripts 2.2.4 (TEcount), Subread 2.1.1 (featureCounts), TElocal from GitHub at 1a168c2.
# envs/telescope: Telescope 1.0.4.1 (bioconda build for Python 3.6).
set -euo pipefail
cd /data1/greenbab/users/ahunos/projects/RepeatAfterMe_q10
source /data1/greenbab/software/miniconda3/etc/profile.d/conda.sh
export CONDA_PKGS_DIRS=$PWD/envs/pkgs
mkdir -p envs/pkgs out
# The bioconda tetranscripts package also pulls R and DESeq2 (for TEtranscripts' own differential
# step) and does not solve next to pysam here; TEcount needs only pysam, so it comes from PyPI.
[ -d envs/te ] || conda create -y -p envs/te -c conda-forge -c bioconda --override-channels \
  python=3.10 subread=2.1.1 pysam
conda activate envs/te
pip install --no-deps "TEtranscripts==2.2.4"
pip install --no-deps "git+https://github.com/mhammell-laboratory/TElocal.git@1a168c2"
conda deactivate
[ -d envs/telescope ] || conda create -y -p envs/telescope -c conda-forge -c bioconda --override-channels telescope=1.0.4.1
{
  conda activate envs/te
  echo -e "TEcount\t$(TEcount --version 2>&1 | tail -1)"
  echo -e "TElocal\t$(TElocal --version 2>&1 | tail -1)"
  echo -e "featureCounts\t$(featureCounts -v 2>&1 | grep -o 'v[0-9.]*' | head -1)"
  echo -e "python_te\t$(python --version 2>&1)"
  conda deactivate
  conda activate envs/telescope
  echo -e "telescope\t$(telescope --version 2>&1 | tail -1)"
  echo -e "python_telescope\t$(python --version 2>&1)"
} > out/versions.tsv
cat out/versions.tsv
