import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Mentions légales | ImmoTest',
  description: 'Mentions légales obligatoires du site ImmoTest.',
  robots: { index: true, follow: false },
}

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose prose-slate dark:prose-invert">
      <h1 className="text-3xl font-bold mb-8">Mentions légales</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Éditeur du site</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          ImmoTest<br />
          Site web : <strong>immotest.fr</strong><br />
          Contact : <a href="mailto:contact@immotest.fr" className="text-indigo-600 hover:underline">contact@immotest.fr</a>
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Hébergement</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Le site ImmoTest est hébergé sur des serveurs cloud situés dans l&apos;Union Européenne.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Propriété intellectuelle</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          L&apos;ensemble des contenus présents sur le site ImmoTest (textes, graphiques, logiciels, images) est
          protégé par le droit de la propriété intellectuelle. Toute reproduction, représentation ou diffusion,
          en tout ou partie, sur quelque support que ce soit, est interdite sans l&apos;autorisation préalable de l&apos;éditeur.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Sources des données</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Les données utilisées par ImmoTest proviennent de sources officielles françaises :
        </p>
        <ul className="text-sm text-muted-foreground mt-2 space-y-1">
          <li>DVF (Demandes de Valeurs Foncières) — Ministère des Finances / data.gouv.fr</li>
          <li>ADEME — Base nationale des diagnostics de performance énergétique</li>
          <li>INSEE — Données socio-économiques IRIS</li>
          <li>OpenStreetMap contributors</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Limitation de responsabilité</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Les analyses fournies par ImmoTest sont basées sur des données publiques et ont une valeur indicative.
          Elles ne constituent pas un conseil en investissement immobilier. L&apos;utilisateur est seul responsable
          de ses décisions d&apos;achat.
        </p>
      </section>

      <div className="mt-10 pt-6 border-t border-border">
        <Link href="/" className="text-sm text-indigo-600 hover:underline">← Retour à l&apos;accueil</Link>
      </div>
    </div>
  )
}
