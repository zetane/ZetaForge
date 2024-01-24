export function setDifference(setA, setB) {
  const difference = new Set(setA);
  setB.forEach((e) => {
    difference.delete(e);
  });
  return difference;
}
