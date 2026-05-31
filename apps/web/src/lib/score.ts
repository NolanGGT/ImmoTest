export function getScoreConfig(score: number) {
  if (score >= 70)
    return { color: 'text-green-600', label: 'Bon plan', emoji: '✅', bg: 'bg-green-50', stroke: '#16a34a', border: 'border-green-200' }
  if (score >= 40)
    return { color: 'text-orange-500', label: 'Correct', emoji: '⚠️', bg: 'bg-orange-50', stroke: '#f97316', border: 'border-orange-200' }
  return { color: 'text-red-500', label: 'À éviter', emoji: '🚨', bg: 'bg-red-50', stroke: '#ef4444', border: 'border-red-200' }
}

export function formatPrix(prix: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(prix)
}

export function formatPrixM2(prixM2: number): string {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(prixM2)} €/m²`
}

export function formatEcart(ecart: number): string {
  const sign = ecart > 0 ? '+' : ''
  return `${sign}${ecart.toFixed(1).replace('.', ',')} %`
}
