import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation | ImmoTest",
  description: "Conditions générales d'utilisation du service ImmoTest.",
  robots: { index: true, follow: false },
}

export default function CguPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-16 prose prose-slate dark:prose-invert">
        <h1 className="text-3xl font-bold mb-8">Conditions générales d&apos;utilisation</h1>
        <p className="text-sm text-muted-foreground mb-8">Dernière mise à jour : 2 juin 2026</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">1. Objet</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Les présentes CGU régissent l&apos;utilisation du service ImmoTest, outil d&apos;analyse immobilière
            accessible à l&apos;adresse immotest.fr. En créant un compte, vous acceptez sans réserve les présentes conditions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">2. Accès au service</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            ImmoTest propose une première analyse gratuite sans carte bancaire. L&apos;accès complet est disponible
            via un paiement unique de 29 € pour 3 mois, sans renouvellement automatique.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">3. Utilisation du service</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            L&apos;utilisateur s&apos;engage à utiliser le service à des fins personnelles et non commerciales.
            Toute utilisation automatisée, scraping ou revente des données est interdite.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">4. Données et confidentialité</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vos analyses sont privées et ne sont jamais partagées avec des tiers sans votre accord explicite.
            Consultez notre <Link href="/confidentialite" className="text-indigo-600 hover:underline">politique de confidentialité</Link> pour plus de détails.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">5. Limitation de responsabilité</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            ImmoTest est un outil d&apos;aide à la décision basé sur des données publiques. Les résultats ont une
            valeur indicative et ne constituent pas un conseil en investissement. ImmoTest ne saurait être tenu
            responsable des décisions prises sur la base de ses analyses.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">6. Résiliation</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Vous pouvez supprimer votre compte à tout moment depuis votre profil. Les données sont conservées
            pendant 6 mois après l&apos;expiration de l&apos;accès, puis supprimées.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">7. Droit applicable</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Les présentes CGU sont soumises au droit français. Tout litige sera soumis aux tribunaux compétents français.
          </p>
        </section>

        <div className="mt-10 pt-6 border-t border-border">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">← Retour à l&apos;accueil</Link>
        </div>
      </div>
    </div>
  )
}
