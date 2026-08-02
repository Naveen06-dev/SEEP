/** Normalize output for comparison */
export function normalize(text) {
  if (text == null) return '';
  return String(text)
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

/** Compare outputs with optional float tolerance */
export function outputsMatch(actual, expected, tolerance = 1e-6) {
  const a = normalize(actual);
  const e = normalize(expected);
  if (a === e) return true;

  const aLines = a.split('\n');
  const eLines = e.split('\n');
  if (aLines.length !== eLines.length) return false;

  return aLines.every((line, i) => {
    const al = line.trim();
    const el = eLines[i].trim();
    if (al === el) return true;
    const an = Number(al);
    const en = Number(el);
    if (!Number.isNaN(an) && !Number.isNaN(en)) {
      return Math.abs(an - en) <= tolerance;
    }
    return false;
  });
}

/** Weighted partial score */
export function calculateWeightedScore(testResults, maxMarks) {
  const totalWeight = testResults.reduce((s, t) => s + t.weight, 0);
  if (totalWeight === 0) return { score: 0, passedWeight: 0, totalWeight: 0 };

  const passedWeight = testResults.filter(t => t.passed).reduce((s, t) => s + t.weight, 0);
  const score = (passedWeight / totalWeight) * maxMarks;
  return {
    score: Math.round(score * 100) / 100,
    passedWeight,
    totalWeight,
    passedCases: testResults.filter(t => t.passed).length,
    totalCases: testResults.length
  };
}
