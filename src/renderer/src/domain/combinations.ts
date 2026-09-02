const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function combosOfSize(size: number): number[][] {
  const result: number[][] = []
  const current: number[] = []

  function backtrack(start: number): void {
    if (current.length === size) {
      result.push([...current])
      return
    }
    for (let i = start; i < DIGITS.length; i++) {
      current.push(DIGITS[i])
      backtrack(i + 1)
      current.pop()
    }
  }

  backtrack(0)
  return result
}

/** combosByLength[length][sum] = every subset of {1..9} of that length summing to `sum`. */
const combosByLength: number[][][][] = new Array(10).fill(null).map(() => [])
/** minSumByLength[length] / maxSumByLength[length] for length in [2,9]. */
export const minSumByLength: number[] = new Array(10).fill(0)
export const maxSumByLength: number[] = new Array(10).fill(0)

for (let length = 2; length <= 9; length++) {
  const table: number[][][] = []
  const combos = combosOfSize(length)
  let min = Infinity
  let max = -Infinity
  for (const combo of combos) {
    const sum = combo.reduce((a, b) => a + b, 0)
    if (!table[sum]) table[sum] = []
    table[sum].push(combo)
    if (sum < min) min = sum
    if (sum > max) max = sum
  }
  combosByLength[length] = table
  minSumByLength[length] = min
  maxSumByLength[length] = max
}

/** All digit subsets of the given length that sum to `sum`. Empty array if none exist. */
export function combinationsFor(length: number, sum: number): number[][] {
  if (length < 2 || length > 9) return []
  const bySum = combosByLength[length]
  return bySum[sum] ?? []
}

export function isSumPossible(length: number, sum: number): boolean {
  return combinationsFor(length, sum).length > 0
}

export function uniqueCombinationCount(length: number, sum: number): number {
  return combinationsFor(length, sum).length
}
