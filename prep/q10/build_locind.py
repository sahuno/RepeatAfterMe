"""Build a TElocal .locInd index from a TE GTF, with TElocal's own build code.

    python build_locind.py te.gtf te.locInd

A .locInd file is a pickled TElocal_Toolkit.TEindex.TEfeatures object; TElocal loads it with
pickle.load. TEfeatures.build checks `ele_name not in self._elements` on a plain list, and in TElocal
every copy is its own element, so on 3.7 million mouse rows that check takes quadratic time. Here
the list is swapped for one with a set behind its `in` test while build() runs, then turned back
into a plain list, so the pickled object is what build() would have made, in the same order.
"""
import pickle, sys
from TElocal_Toolkit import TEindex


class FastList(list):
    def __init__(self):
        super().__init__()
        self._seen = set()

    def append(self, x):
        self._seen.add(x)
        super().append(x)

    def __contains__(self, x):
        return x in self._seen


def main(gtf, out):
    idx = TEindex.TEfeatures()
    idx._elements = FastList()
    idx.build(gtf)
    idx._elements = list(idx._elements)
    with open(out, "wb") as fh:
        pickle.dump(idx, fh)
    print(f"instances {idx.numInstances()}; elements {len(idx._elements)}")


if __name__ == "__main__":
    main(*sys.argv[1:3])
