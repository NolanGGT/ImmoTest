import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Politique de confidentialité | ImmoTest',
  description: 'Comment ImmoTest collecte, utilise et protège vos données personnelles.',
  robots: { index: true, follow: false },
}

export default function ConfidentialitePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose prose-slate dark:prose-invert">
      <h1 className="text-3xl font-bold mb-8">Politique de confidentialité</h1>
      <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : 2 juin 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">1. Responsable du traitement</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          ImmoTest est le responsable du traitement de vos données personnelles au sens du RGPD.
          Contact : <a href="mailto:contact@immotest.fr" className="text-indigo-600 hover:underline">contact@immotest.fr</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">2. Données collectées</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          Nous collectons uniquement les données nécessaires au fonctionnement du service :
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li><strong>Compte :</strong> adresse email, mot de passe hashé (ou identifiant Google OAuth)</li>
          <li><strong>Analyses :</strong> URL ou caractéristiques des biens analysés, résultats d&apos;analyse</li>
          <li><strong>Paiement :</strong> traité exclusivement par Stripe — ImmoTest ne conserve aucune donnée bancaire</li>
          <li><strong>Usage :</strong> logs de connexion, utilisation du service (à des fins de sécurité et d&apos;amélioration)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">3. Finalités du traitement</h2>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Fourniture et amélioration du service ImmoTest</li>
          <li>Gestion des comptes utilisateurs et de l&apos;authentification</li>
          <li>Traitement des paiements</li>
          <li>Sécurité et prévention de la fraude</li>
          <li>Support client</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">4. Base légale</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Le traitement repose sur l&apos;exécution du contrat (CGU) et, pour les communications optionnelles, votre consentement.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">5. Conservation des données</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Vos analyses sont conservées pendant la durée de votre abonnement + 6 mois après expiration.
          Votre compte est conservé jusqu&apos;à sa suppression par vos soins.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">6. Vos droits (RGPD)</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          Conformément au RGPD, vous disposez des droits suivants :
        </p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>Droit d&apos;accès à vos données</li>
          <li>Droit de rectification</li>
          <li>Droit à l&apos;effacement (&laquo; droit à l&apos;oubli &raquo;)</li>
          <li>Droit à la portabilité</li>
          <li>Droit d&apos;opposition</li>
        </ul>
        <p className="text-muted-foreground text-sm leading-relaxed mt-2">
          Pour exercer ces droits, contactez-nous à{' '}
          <a href="mailto:contact@immotest.fr" className="text-indigo-600 hover:underline">contact@immotest.fr</a>.
          Vous pouvez également introduire une réclamation auprès de la CNIL (cnil.fr).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">7. Cookies</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          ImmoTest utilise uniquement des cookies fonctionnels nécessaires à l&apos;authentification et aux préférences
          d&apos;affichage (thème sombre/clair). Aucun cookie publicitaire ou de tracking tiers n&apos;est utilisé.
        </p>
      </section>

      <div className="mt-10 pt-6 border-t border-border">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Retour à l&apos;accueil</Link>
      </div>
    </div>
  )
}
