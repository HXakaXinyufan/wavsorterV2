export default class TripleSBiasSorter {
  #lstMember = [];
  #parent = [];
  #equal = [];
  #rec = [];
  #cmp1 = 0;
  #cmp2 = 0;
  #head1 = 0;
  #head2 = 0;
  #nrec = 0;
  #numQuestion = 0;
  #totalSize = 0;
  #finishSize = 0;
  #finishFlag = 0;

  constructor(memberNames, memberData = {}) {
    if (!Array.isArray(memberNames)) {
      throw new Error("Member names must be an array");
    }
    if (typeof memberData !== "object" || memberData === null) {
      throw new Error("Member data must be an object");
    }

    this.memberNames = [...memberNames];
    this.memberData = memberData;

    this.initialize();
  }

  get equal() {
    return this.#equal;
  }

  initialize() {
    if (this.memberNames.length <= 1) {
      this.#finishFlag = 1;
      this.#lstMember = [this.memberNames.map((_, i) => i)];
      this.#totalSize = 0;
      this.#finishSize = 0;
      this.#numQuestion = 0;
      return;
    }

    const shuffledIndices = [...Array(this.memberNames.length).keys()];
    this.#shuffle(shuffledIndices);

    const result = this.#buildTree(shuffledIndices);
    this.#lstMember = result.tree;
    this.#parent = result.parent;
    this.#totalSize = result.totalSize;

    this.#rec = new Array(this.memberNames.length).fill(0);
    this.#nrec = 0;
    this.#equal = new Array(this.memberNames.length + 1).fill(-1);

    this.#cmp1 = this.#lstMember.length - 2;
    this.#cmp2 = this.#lstMember.length - 1;
    this.#head1 = 0;
    this.#head2 = 0;
    this.#numQuestion = 1;
    this.#finishSize = 0;
    this.#finishFlag = 0;
  }

  getCurrentComparison() {
    if (this.#cmp1 < 0) return null;

    const memberAIndex = this.#lstMember[this.#cmp1][this.#head1];
    const memberBIndex = this.#lstMember[this.#cmp2][this.#head2];

    return {
      memberA: memberAIndex,
      memberB: memberBIndex,
      memberAName: this.memberNames[memberAIndex],
      memberBName: this.memberNames[memberBIndex],
    };
  }

  preferMemberA() {
    this.#applyComparisonResult(-1);
  }

  preferMemberB() {
    this.#applyComparisonResult(1);
  }

  declareTie() {
    this.#applyComparisonResult(0);
  }

  getSortedMembers() {
    if (!this.isComplete()) return [];

    return this.#lstMember[0].map((index) => this.memberNames[index]);
  }

  isComplete() {
    return this.#finishFlag === 1 || this.memberNames.length <= 1;
  }

  getProgress() {
    const progressPercent = Math.floor(
      (this.#finishSize * 100) / this.#totalSize,
    );
    return {
      currentQuestion: this.#numQuestion,
      progressPercent,
      completedComparisons: this.#finishSize,
      totalComparisons: this.#totalSize,
      isComplete: this.isComplete(),
    };
  }

  reset() {
    this.initialize();
  }

  #shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  #buildTree(indices) {
    const tree = [indices];
    const parent = [-1];
    let totalSize = 0;
    let n = 1;

    for (let i = 0; i < tree.length; i++) {
      if (tree[i].length >= 2) {
        const mid = Math.ceil(tree[i].length / 2);

        tree[n] = tree[i].slice(0, mid);
        totalSize += tree[n].length;
        parent[n] = i;
        n++;

        tree[n] = tree[i].slice(mid);
        totalSize += tree[n].length;
        parent[n] = i;
        n++;
      }
    }

    return { tree, parent, totalSize };
  }

  #recordMember(memberIndex) {
    this.#rec[this.#nrec] = memberIndex;
    this.#nrec++;
  }

  #drainList(listIndex) {
    const list = this.#lstMember[listIndex];
    let head = listIndex === this.#cmp1 ? this.#head1 : this.#head2;

    this.#recordMember(list[head]);
    head++;
    this.#finishSize++;

    while (this.#equal[this.#rec[this.#nrec - 1]] !== -1) {
      this.#recordMember(list[head]);
      head++;
      this.#finishSize++;
    }

    if (listIndex === this.#cmp1) this.#head1 = head;
    else this.#head2 = head;
  }

  #flushRemaining(listIndex) {
    const isCmp1 = listIndex === this.#cmp1;
    const head = isCmp1 ? this.#head1 : this.#head2;
    const otherHead = isCmp1 ? this.#head2 : this.#head1;
    const list = this.#lstMember[listIndex];
    const otherList = this.#lstMember[isCmp1 ? this.#cmp2 : this.#cmp1];

    if (head < list.length && otherHead === otherList.length) {
      let h = head;
      while (h < list.length) {
        this.#recordMember(list[h]);
        h++;
        this.#finishSize++;
      }
      if (isCmp1) this.#head1 = h;
      else this.#head2 = h;
    }
  }

  #applyComparisonResult(flag) {
    if (this.isComplete()) return;

    if (![-1, 0, 1].includes(flag)) {
      throw new Error("Invalid flag: must be -1, 0, or 1");
    }

    if (flag === 0) {
      this.#drainList(this.#cmp1);
      this.#equal[this.#rec[this.#nrec - 1]] =
        this.#lstMember[this.#cmp2][this.#head2];
      this.#drainList(this.#cmp2);
    } else {
      this.#drainList(flag < 0 ? this.#cmp1 : this.#cmp2);
    }

    this.#flushRemaining(this.#cmp1);
    this.#flushRemaining(this.#cmp2);

    if (
      this.#head1 === this.#lstMember[this.#cmp1].length &&
      this.#head2 === this.#lstMember[this.#cmp2].length
    ) {
      this.#mergeLists();
    }

    this.#numQuestion++;

    if (this.#cmp1 < 0) {
      this.#finishFlag = 1;
    }
  }

  #mergeLists() {
    const parentIndex = this.#parent[this.#cmp1];

    for (
      let i = 0;
      i <
      this.#lstMember[this.#cmp1].length + this.#lstMember[this.#cmp2].length;
      i++
    ) {
      this.#lstMember[parentIndex][i] = this.#rec[i];
    }

    this.#lstMember.pop();
    this.#lstMember.pop();
    this.#parent.pop();
    this.#parent.pop();

    this.#cmp1 -= 2;
    this.#cmp2 -= 2;
    this.#head1 = 0;
    this.#head2 = 0;
    this.#nrec = 0;
  }
}
