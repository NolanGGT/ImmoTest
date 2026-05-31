import { describe, it, expect } from 'vitest'
import { getMarkerColor, calculateScoreLocalisation } from '@/lib/map'

describe('getMarkerColor', () => {
  it('returns green for score >= 70', () => {
    expect(getMarkerColor(70)).toBe('#22c55e')
    expect(getMarkerColor(100)).toBe('#22c55e')
  })

  it('returns orange for score between 40 and 69', () => {
    expect(getMarkerColor(40)).toBe('#f97316')
    expect(getMarkerColor(69)).toBe('#f97316')
  })

  it('returns red for score < 40', () => {
    expect(getMarkerColor(0)).toBe('#ef4444')
    expect(getMarkerColor(39)).toBe('#ef4444')
  })
})

describe('calculateScoreLocalisation', () => {
  it('gives max score for short commute with good amenities', () => {
    const score = calculateScoreLocalisation({
      distanceTravailKm: 1,
      nbTransports: 4,
      nbCommerces: 4,
      nbEcoles: 3,
      hasRisques: false,
    })
    expect(score).toBeGreaterThanOrEqual(90)
    expect(score).toBeLessThanOrEqual(100)
  })

  it('penalizes risk zones by 15 points', () => {
    const base = calculateScoreLocalisation({
      distanceTravailKm: 1,
      nbTransports: 0,
      nbCommerces: 0,
      nbEcoles: 0,
      hasRisques: false,
    })
    const risky = calculateScoreLocalisation({
      distanceTravailKm: 1,
      nbTransports: 0,
      nbCommerces: 0,
      nbEcoles: 0,
      hasRisques: true,
    })
    expect(base - risky).toBe(15)
  })

  it('uses a neutral commute bonus when distanceTravailKm is not provided', () => {
    const withoutCommute = calculateScoreLocalisation({
      nbTransports: 0,
      nbCommerces: 0,
      nbEcoles: 0,
      hasRisques: false,
    })
    // neutral bonus is 17 (midpoint of the commute range)
    expect(withoutCommute).toBe(17)
  })

  it('clamps score between 0 and 100', () => {
    const low = calculateScoreLocalisation({
      distanceTravailKm: 100,
      nbTransports: 0,
      nbCommerces: 0,
      nbEcoles: 0,
      hasRisques: true,
    })
    expect(low).toBeGreaterThanOrEqual(0)

    const high = calculateScoreLocalisation({
      distanceTravailKm: 0.5,
      nbTransports: 100,
      nbCommerces: 100,
      nbEcoles: 100,
      hasRisques: false,
    })
    expect(high).toBeLessThanOrEqual(100)
  })
})
