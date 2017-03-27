function SortedList() {
  this.elements = [];
}

SortedList.prototype.add = function(el) {
  this.elements.splice(this.ceil(el), 0, el);
};

SortedList.prototype.ceil = function(pElement) {
  var start = 0, 
    end = this.elements.length, 
    i = Math.floor(end / 2);

  while (i >= start && i < end) {
    if (this.startsEarlier(pElement, this.elements[i])) {
      end = i;
      i = Math.floor(((i - start) / 2) + start);
    } else {
      start = i;
      i = Math.ceil(((end - i) / 2) + i);
    }
  }

  return i;
};

SortedList.prototype.startsEarlier = function(pLeft, pRight) {
  return pLeft.begin <= pRight.begin;
};

SortedList.prototype.get = function(pIndex) {
  return this.elements[pIndex];
};

SortedList.prototype.asArray = function() {
  return this.elements;
}
