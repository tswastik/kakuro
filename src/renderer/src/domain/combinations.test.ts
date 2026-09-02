import { describe, expect, it } from 'vitest'
import { combinationsFor, maxSumByLength, minSumByLength } from './combinations'

describe('combinations', () => {
  it('finds the single combo for a 2-cell run summing to 3', () => {
    expect(combinationsFor(2, 3)).toEqual([[1, 2]])
  })

  it('has no combos for an impossible sum', () => {
    expect(combinationsFor(2, 100)).toEqual([])
    expect(combinationsFor(2, 2)).toEqual([])
  })

  it('every combo has the requested length and correct sum, with distinct digits', () => {
    for (let length = 2; length <= 9; length++) {
      for (let sum = minSumByLength[length]; sum <= maxSumByLength[length]; sum++) {
        for (const combo of combinationsFor(length, sum)) {
          expect(combo.length).toBe(length)
          expect(combo.reduce((a, b) => a + b, 0)).toBe(sum)
          expect(new Set(combo).size).toBe(length)
        }
      }
    }
  })

  it('min/max sums for length 3 match known Kakuro values', () => {
    expect(minSumByLength[3]).toBe(6) // 1+2+3
    expect(maxSumByLength[3]).toBe(24) // 7+8+9
  })
})
