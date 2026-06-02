const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f9fafb;
  margin: 0;
  padding: 0;
`

const WRAPPER = `
  max-width: 600px;
  margin: 40px auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`

const HEADER = `
  background: #4f46e5;
  padding: 24px 32px;
  text-align: center;
`

const BODY = `
  padding: 32px;
  color: #374151;
  font-size: 15px;
  line-height: 1.6;
`

const BUTTON = `
  display: inline-block;
  background: #4f46e5;
  color: #ffffff !important;
  text-decoration: none;
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 15px;
  margin: 20px 0;
`

const FOOTER = `
  padding: 20px 32px;
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  border-top: 1px solid #f3f4f6;
`

function layout(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${BASE_STYLE}">
  <div style="${WRAPPER}">
    <div style="${HEADER}">
      <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">ImmoSafe</span>
    </div>
    <div style="${BODY}">${content}</div>
    <div style="${FOOTER}">© 2026 ImmoSafe · <a href="#" style="color:#9ca3af;">Se désabonner</a></div>
  </div>
</body>
</html>`
}

export function confirmationPaiement(params: {
  dateExpiration: string
  montant: string
}): string {
  const appUrl = process.env.WEB_URL ?? 'http://localhost:3010'
  return layout(`
    <p>Bonjour,</p>
    <p>Votre paiement a bien été reçu. Votre accès ImmoSafe est actif jusqu'au <strong>${params.dateExpiration}</strong>.</p>
    <p>Ce que vous pouvez faire maintenant :</p>
    <ul style="padding-left:20px;margin:12px 0;">
      <li>✅ Analyses illimitées</li>
      <li>✅ Rapports PDF téléchargeables</li>
      <li>✅ Score ImmoSafe sur chaque bien</li>
    </ul>
    <div style="text-align:center;">
      <a href="${appUrl}/analyser" style="${BUTTON}">Lancer ma première analyse</a>
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">
      Montant débité : <strong>${params.montant} €</strong><br>
      Paiement unique — aucun prélèvement automatique.
    </p>
  `)
}

export function rappelExpiration(params: {
  dateExpiration: string
  nbAnalyses: number
}): string {
  const appUrl = process.env.WEB_URL ?? 'http://localhost:3010'
  return layout(`
    <p>Bonjour,</p>
    <p>Votre accès ImmoSafe expire le <strong>${params.dateExpiration}</strong>.<br>
    Vous avez effectué <strong>${params.nbAnalyses} analyse${params.nbAnalyses > 1 ? 's' : ''}</strong> pendant cette période.</p>
    <p>Pour continuer à bénéficier d'analyses illimitées :</p>
    <div style="text-align:center;">
      <a href="${appUrl}/profil" style="${BUTTON}">Renouveler mon accès — 29,99 €</a>
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">Paiement unique pour 3 mois supplémentaires.</p>
  `)
}

export function abonnementExpire(params: {
  dateExpiration: string
}): string {
  const appUrl = process.env.WEB_URL ?? 'http://localhost:3010'
  return layout(`
    <p>Bonjour,</p>
    <p>Votre accès ImmoSafe a expiré le <strong>${params.dateExpiration}</strong>.</p>
    <p>Reprenez votre recherche immobilière là où vous l'aviez laissée.<br>
    Toutes vos analyses précédentes sont toujours accessibles.</p>
    <div style="text-align:center;">
      <a href="${appUrl}/profil" style="${BUTTON}">Renouveler mon accès — 29,99 €</a>
    </div>
  `)
}

export function resetMotDePasse(params: {
  lienReset: string
}): string {
  return layout(`
    <p>Bonjour,</p>
    <p>Vous avez demandé à réinitialiser votre mot de passe.<br>
    Ce lien est valable <strong>1 heure</strong>.</p>
    <div style="text-align:center;">
      <a href="${params.lienReset}" style="${BUTTON}">Réinitialiser mon mot de passe</a>
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">
      Si vous n'avez pas fait cette demande, ignorez cet email.<br>
      Votre mot de passe ne sera pas modifié.
    </p>
  `)
}

export function invitationPartage(params: {
  ownerEmail: string
  inviteUrl: string
  expiresIn: string
}): string {
  const ownerName = params.ownerEmail.split('@')[0]
  return layout(`
    <p>Bonjour,</p>
    <p><strong>${ownerName}</strong> vous invite à rejoindre sa recherche immobilière sur ImmoSafe.</p>
    <p>En acceptant, vous pourrez :</p>
    <ul style="padding-left:20px;margin:12px 0;">
      <li>👀 Voir tous les biens analysés par ${ownerName}</li>
      <li>❤️ Voter et donner votre avis sur chaque bien</li>
      <li>💬 Laisser des commentaires</li>
    </ul>
    <div style="text-align:center;">
      <a href="${params.inviteUrl}" style="${BUTTON}">Accepter l'invitation →</a>
    </div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">
      Cette invitation expire dans <strong>${params.expiresIn}</strong>.<br>
      Si vous n'attendiez pas cet email, ignorez-le simplement.
    </p>
  `)
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
