import { describe, it, expect } from 'vitest'
import { calculerCoutReel, estimerLoyer } from '@/lib/coutReel'

const BASE_INPUTS = {
  prix: 285000,
  surface: 62,
  typeBien: 'APPARTEMENT',
  dpe: 'D',
  charges: 220,
  anneeConstruction: 1987,
  apport: 0,
  tauxCredit: 3.5,
  dureeAns: 20,
  haussePrixAnnuelle: 1.5,
  loyerMensuel: 950,
  chargesLocationMensuelles: 80,
  taxeFonciereAnnuelle: 0,
  travauxEstimes: 0,
}

describe('calculerCoutReel', () => {
  it('calcule les frais de notaire à 7.5% pour un bien ancien', () => {
    const result = calculerCoutReel(BASE_INPUTS)
    expect(result.fraisNotaire).toBe(Math.round(285000 * 0.075))
  })

  it('calcule les frais de notaire à 2.5% pour un bien neuf (> 2010)', () => {
    const result = calculerCoutReel({ ...BASE_INPUTS, anneeConstruction: 2015 })
    expect(result.fraisNotaire).toBe(Math.round(285000 * 0.025))
  })

  it('retourne un totalAchat supérieur au prix du bien', () => {
    const result = calculerCoutReel(BASE_INPUTS)
    expect(result.totalAchat).toBeGreaterThan(285000)
  })

  it('valeurReventeEstimee > prix si hausse positive', () => {
    const result = calculerCoutReel(BASE_INPUTS)
    expect(result.valeurReventeEstimee).toBeGreaterThan(285000)
  })

  it('coutNetAchat = max(0, totalAchat - valeurRevente)', () => {
    const result = calculerCoutReel(BASE_INPUTS)
    expect(result.coutNetAchat).toBe(
      Math.max(0, result.totalAchat - result.valeurReventeEstimee)
    )
  })

  it('mensualiteCredit est cohérente avec le montant emprunté', () => {
    const result = calculerCoutReel(BASE_INPUTS)
    const totalRembourse = result.mensualiteCredit * 20 * 12
    expect(totalRembourse).toBeGreaterThan(285000)
  })

  it('apport réduit le montant emprunté et donc la mensualité', () => {
    const sansApport = calculerCoutReel(BASE_INPUTS)
    const avecApport = calculerCoutReel({ ...BASE_INPUTS, apport: 50000 })
    expect(avecApport.mensualiteCredit).toBeLessThan(sansApport.mensualiteCredit)
    expect(avecApport.coutCredit).toBeLessThan(sansApport.coutCredit)
  })

  it('estimerLoyer retourne un montant cohérent', () => {
    const loyer = estimerLoyer(285000, 62)
    expect(loyer).toBeGreaterThan(500)
    expect(loyer).toBeLessThan(3000)
  })
})
