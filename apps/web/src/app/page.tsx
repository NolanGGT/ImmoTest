'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useInView } from 'framer-motion'
import {
  Target, TrendingDown, HandshakeIcon, ClipboardList,
  BarChart3, Users, Search, Link2, BarChart2,
  ChevronDown, Shield, Mail, CheckCircle2,
} from 'lucide-react'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { useAuthStore } from '@/stores/auth.store'
import { CTAButton } from '@/lib/cta'

// ─── Utils ───────────────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

const serif = { fontFamily: 'var(--font-playfair)' } as React.CSSProperties

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ImmoTest',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Web',
  url: 'https://immotest.fr',
  description: "Outil d'analyse immobilière pour primo-accédants français. Données DVF officielles, score de pertinence, prix du marché.",
  offers: { '@type': 'Offer', price: '29', priceCurrency: 'EUR', description: "3 mois d'accès complet" },
  featureList: ['Analyse DVF des prix immobiliers', 'Score ImmoTest 0-100', 'Stratégie de négociation', 'Carte interactive Mapbox', 'Score de quartier INSEE', 'Rapport PDF exportable'],
  inLanguage: 'fr',
  author: { '@type': 'Organization', name: 'ImmoTest', url: 'https://immotest.fr' },
}

// ─── Data ────────────────────────────────────────────────────────────────────

const dataSources = [
  {
    icon: '📊',
    title: 'DVF — Demandes de Valeurs Foncières',
    desc: '6 millions de transactions immobilières réelles enregistrées par le gouvernement français. Votre prix comparé au marché réel, pas estimé.',
    source: 'data.gouv.fr · Ministère des Finances',
  },
  {
    icon: '⚡',
    title: 'ADEME — Diagnostics Énergétiques',
    desc: 'Base nationale des DPE certifiés. Impact réel sur vos charges et la valeur future du bien.',
    source: 'data.ademe.fr',
  },
  {
    icon: '🏘️',
    title: 'INSEE IRIS — Données socio-économiques',
    desc: 'Revenus médians par quartier (unités de ~2 000 habitants). Criminalité officielle par commune.',
    source: 'insee.fr · données.gouv.fr',
  },
  {
    icon: '🗺️',
    title: 'OpenStreetMap + Mapbox',
    desc: "Transports, commerces, écoles, parcs — tous les équipements à portée de votre bien.",
    source: 'openstreetmap.org',
  },
]

const features = [
  { icon: Target,       title: 'Score ImmoTest 0–100',       desc: "Évaluation objective de chaque annonce. Prix, DPE, potentiel, risques — tout en un chiffre." },
  { icon: TrendingDown, title: 'Analyse du prix au m²',       desc: "Comparé aux vraies transactions DVF dans le quartier. Sachez exactement si vous surpayez." },
  { icon: HandshakeIcon,title: 'Stratégie de négociation',    desc: "Arguments précis et fourchette de prix à proposer. Personnalisés selon les faiblesses du bien." },
  { icon: ClipboardList,title: 'Checklist de visite mobile',  desc: "Générée selon le type de bien, le DPE, l'année. Cochable depuis votre téléphone." },
  { icon: BarChart3,    title: 'Coût réel sur 20 ans',        desc: "Prix + notaire + crédit + charges + travaux. Comparé à la location. La vraie vérité financière." },
  { icon: Users,        title: 'Partagez avec votre partenaire', desc: "Invitez votre moitié en lecture seule. Votez et commentez chaque bien ensemble." },
]

const steps = [
  { icon: Search, n: 1, title: 'Trouvez une annonce', desc: "Sur SeLoger, LeBonCoin ou PAP. Ou saisissez les caractéristiques manuellement." },
  { icon: Link2,  n: 2, title: 'Collez l\'URL ou remplissez', desc: "L'import automatique pré-remplit tout. Vérifiez et lancez en 30 secondes." },
  { icon: BarChart2, n: 3, title: 'Recevez votre analyse', desc: "Score, prix du marché, négociation, points de vigilance. Sauvegardé dans votre tableau de bord." },
]

const pricingFeatures = [
  'Analyses illimitées',
  'Carte interactive complète',
  'Rapports PDF téléchargeables',
  'Score de quartier (INSEE)',
  'Coût réel sur 20 ans',
  'Partage avec votre partenaire',
  'Alertes de prix',
]

const faqs = [
  {
    q: "ImmoTest remplace-t-il un agent immobilier ?",
    a: "Non. ImmoTest vous donne des données objectives pour prendre une décision éclairée. Un agent gère la partie juridique et administrative. ImmoTest vous aide à savoir si un bien vaut le coup avant même de contacter un agent.",
  },
  {
    q: "D'où viennent vos données de prix ?",
    a: "Nous utilisons les DVF (Demandes de Valeurs Foncières), la base officielle du gouvernement français qui recense toutes les transactions immobilières réelles. Pas d'estimation — des prix de vente réels.",
  },
  {
    q: "Mon analyse est-elle confidentielle ?",
    a: "Oui. Vos analyses ne sont jamais partagées. Seul vous (et les personnes que vous invitez explicitement) pouvez les voir.",
  },
  {
    q: "Fonctionne-t-il pour toutes les villes de France ?",
    a: "Oui. Les données DVF couvrent toute la France métropolitaine. La précision est meilleure dans les grandes villes où les transactions sont plus nombreuses.",
  },
  {
    q: "Que se passe-t-il après 3 mois ?",
    a: "Votre accès expire. Vos analyses restent sauvegardées pendant 6 mois. Vous pouvez renouveler à tout moment pour 29 €.",
  },
]

// ─── Composants ──────────────────────────────────────────────────────────────

function LandingNavbar() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const router = useRouter()
  return (
    <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-white/8">
      <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-white" style={serif}>
          ImmoTest
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
          <a href="#donnees" className="hover:text-white transition-colors">Données</a>
          <a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a>
          <a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <button
              onClick={() => router.push('/analyser')}
              className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
            >
              Mon espace →
            </button>
          ) : (
            <>
              <Link href="/login" className="px-3 py-1.5 text-sm text-slate-300 hover:text-white transition-colors">
                Se connecter
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors">
                Essai gratuit
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// Mock analyse card — friction #4
function MockAnalyseCard() {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 shadow-2xl backdrop-blur-sm max-w-sm mx-auto md:mx-0">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Score ImmoTest</span>
        <span className="text-xs text-slate-500">Paris 11e · 58 m²</span>
      </div>
      {/* Score ring + number */}
      <div className="flex items-center gap-3 mb-3">
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#1e293b" strokeWidth="6" />
            <circle
              cx="32" cy="32" r="28" fill="none"
              stroke="#f59e0b" strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 28 * 0.74} ${2 * Math.PI * 28}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-amber-400">74</span>
        </div>
        <div>
          <p className="text-base font-bold text-white">Bon plan</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Prix légèrement surévalué<br/>Bonne localisation
          </p>
        </div>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
          <span className="text-slate-400">Prix annoncé</span>
          <span className="text-white font-medium">485 000 €</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-slate-700/50">
          <span className="text-slate-400">Prix marché (DVF)</span>
          <span className="text-emerald-400 font-medium">449 000 €</span>
        </div>
        <div className="flex justify-between items-center py-1">
          <span className="text-slate-400">Marge de négociation</span>
          <span className="text-amber-400 font-medium">~5% — 24 000 €</span>
        </div>
      </div>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingNavbar />

      {/* ── SECTION 1 — HERO ────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 text-white overflow-hidden">
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22/%3E%3C/svg%3E')]" />
        {/* Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-slate-950" />

        <div className="relative container max-w-6xl mx-auto px-4 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">

            {/* Left — texte */}
            <div>
              <FadeIn>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 text-xs font-medium mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Données DVF officielles · 6 millions de transactions
                </div>
              </FadeIn>

              <FadeIn delay={0.05}>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.12] mb-6" style={serif}>
                  Achetez votre premier bien{' '}
                  <em className="not-italic text-indigo-400">sans vous faire avoir.</em>
                </h1>
              </FadeIn>

              <FadeIn delay={0.1}>
                <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-lg">
                  ImmoTest analyse n'importe quelle annonce en&nbsp;10&nbsp;secondes.
                  Score de pertinence, prix du marché, marge de négociation.
                  Sans agent. Sans commission.
                </p>
              </FadeIn>

              <FadeIn delay={0.15}>
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                  <CTAButton size="large" />
                  <a
                    href="#fonctionnalites"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 text-base font-medium text-white border border-white/20 rounded-xl hover:bg-white/5 transition-all"
                  >
                    Voir comment ça marche
                    <ChevronDown size={16} />
                  </a>
                </div>

                {/* Friction #3 — badges confiance */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Shield size={12} className="text-emerald-400" />
                    Aucune CB requise pour l'essai
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail size={12} className="text-emerald-400" />
                    Pas de spam · Désabonnement en 1 clic
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-400" />
                    1ère analyse offerte
                  </span>
                </div>
              </FadeIn>
            </div>

            {/* Right — mock analyse (friction #4) */}
            <FadeIn delay={0.2} className="hidden md:block">
              <MockAnalyseCard />
            </FadeIn>
          </div>

          {/* Friction #1 — couverture France */}
          <FadeIn delay={0.25}>
            <div className="mt-12 pt-8 border-t border-slate-800 flex flex-wrap gap-6 text-sm text-slate-400 justify-center md:justify-start">
              {[
                '🇫🇷 Disponible dans toutes les villes de France métropolitaine',
                '📊 Plus de 6 millions de transactions en base',
                '⚡ Analyse en moins de 10 secondes',
              ].map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION 2 — DONNÉES OFFICIELLES ────────────────────────────── */}
      <section id="donnees" className="py-20 md:py-24 bg-slate-50">
        <div className="container max-w-6xl mx-auto px-4">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Sources officielles</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900" style={serif}>
              Des analyses basées sur des données officielles
            </h2>
            <p className="mt-3 text-slate-500 max-w-xl mx-auto">
              Pas d'estimations, pas d'algorithmes opaques — uniquement des données
              publiées par le gouvernement français.
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {dataSources.map((src, i) => (
              <FadeIn key={src.title} delay={i * 0.07}>
                <div className="bg-white rounded-2xl border border-slate-200 p-5 h-full hover:border-indigo-200 hover:shadow-md transition-all">
                  <span className="text-3xl mb-3 block">{src.icon}</span>
                  <h3 className="font-semibold text-slate-900 text-sm mb-2 leading-tight">{src.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{src.desc}</p>
                  <p className="text-xs text-indigo-600 font-medium">{src.source}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3 — CARTE ───────────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-slate-950 text-white">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Mockup carte */}
            <FadeIn>
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden aspect-[4/3] relative">
                {/* Fond pseudo-carte */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900" />
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 opacity-10">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div key={i} className="border border-slate-600" />
                  ))}
                </div>
                {/* Marqueurs biens */}
                {[
                  { x: '22%', y: '35%', score: 82, color: 'bg-emerald-500' },
                  { x: '55%', y: '45%', score: 74, color: 'bg-amber-400' },
                  { x: '70%', y: '28%', score: 61, color: 'bg-amber-400' },
                  { x: '38%', y: '60%', score: 45, color: 'bg-orange-500' },
                  { x: '80%', y: '58%', score: 31, color: 'bg-red-500' },
                ].map((m, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{ left: m.x, top: m.y, transform: 'translate(-50%,-50%)' }}
                  >
                    <div className={`w-8 h-8 rounded-full ${m.color} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                      {m.score}
                    </div>
                  </div>
                ))}
                {/* Zone confort */}
                <div className="absolute" style={{ left: '45%', top: '40%', transform: 'translate(-50%,-50%)' }}>
                  <div className="w-32 h-24 rounded-full border-2 border-violet-400/40 bg-violet-500/10" />
                </div>
                {/* Label */}
                <div className="absolute bottom-3 left-3 right-3 bg-slate-900/80 backdrop-blur-sm rounded-xl px-3 py-2 text-xs text-slate-300">
                  Carte interactive · Marqueurs colorés par score · Calques activables
                </div>
              </div>
            </FadeIn>

            {/* Texte */}
            <div>
              <FadeIn delay={0.08}>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">Carte interactive</p>
                <h2 className="text-3xl md:text-4xl font-bold mb-5" style={serif}>
                  Visualisez votre recherche sur la carte
                </h2>
                <div className="space-y-3 mb-6">
                  {[
                    { dot: 'bg-emerald-500', label: 'Score ≥ 70', sub: 'Bon plan' },
                    { dot: 'bg-amber-400',  label: 'Score 40–69', sub: 'Correct' },
                    { dot: 'bg-red-500',    label: 'Score < 40',  sub: 'À éviter' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${r.dot} shrink-0`} />
                      <span className="text-sm font-medium text-white">{r.label}</span>
                      <span className="text-sm text-slate-400">— {r.sub}</span>
                    </div>
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">
                  Activez les calques : métro, bus, commerces, écoles, pharmacies.
                  Calculez un itinéraire depuis votre lieu de travail.
                </p>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4 — FEATURES ────────────────────────────────────────── */}
      <section id="fonctionnalites" className="py-20 md:py-24 bg-white">
        <div className="container max-w-6xl mx-auto px-4">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Fonctionnalités</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900" style={serif}>
              Tout ce dont vous avez besoin pour bien acheter
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon: Icon, title, desc }, i) => (
              <FadeIn key={title} delay={i * 0.06}>
                <div className="rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-md transition-all h-full">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-3">
                    <Icon size={20} className="text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5 — PROCESSUS ───────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-indigo-50">
        <div className="container max-w-5xl mx-auto px-4">
          <FadeIn className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Simple</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900" style={serif}>
              Analyser un bien en 3 étapes
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Ligne de connexion desktop */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-indigo-200" />

            {steps.map(({ icon: Icon, n, title, desc }, i) => (
              <FadeIn key={n} delay={i * 0.1}>
                <div className="text-center relative">
                  <div className="w-16 h-16 rounded-2xl bg-white border-2 border-indigo-200 flex items-center justify-center mx-auto mb-4 shadow-sm relative z-10">
                    <Icon size={24} className="text-indigo-600" />
                  </div>
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold z-20 -mt-0.5">
                    {n}
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6 — TARIF ───────────────────────────────────────────── */}
      <section id="tarifs" className="py-20 md:py-24 bg-white">
        <div className="container max-w-md mx-auto px-4">
          <FadeIn className="text-center mb-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">Tarif</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900" style={serif}>
              Simple et transparent
            </h2>
          </FadeIn>

          {/* Friction #2 — CTA avant le tarif */}
          <FadeIn delay={0.05}>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center mb-6">
              <p className="text-sm font-semibold text-emerald-800 mb-2">
                🎉 Commencez avec 1 analyse entièrement gratuite
              </p>
              <p className="text-xs text-emerald-700 mb-3">
                Sans carte bancaire. Sans engagement.
              </p>
              <CTAButton label="Essayer gratuitement maintenant →" />
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="rounded-2xl border-2 border-slate-200 overflow-hidden shadow-xl">
              <div className="bg-slate-900 text-white p-6 text-center">
                <p className="text-sm font-medium text-slate-400 mb-1">ImmoTest Complet</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">29 €</span>
                </div>
                <p className="text-slate-400 mt-1">pour 3 mois d'accès</p>
              </div>
              <div className="p-6 space-y-3">
                {pricingFeatures.map((f) => (
                  <div key={f} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span className="text-slate-700">{f}</span>
                  </div>
                ))}
              </div>
              <div className="px-6 pb-6">
                <CTAButton label="Commencer avec 1 analyse offerte →" className="w-full justify-center" />
                <p className="text-xs text-center text-slate-400 mt-3">
                  Paiement unique · Pas d'abonnement automatique
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Shield size={12} />Paiement sécurisé Stripe</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={12} />1ère analyse gratuite</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION 7 — FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="py-20 md:py-24 bg-slate-50">
        <div className="container max-w-2xl mx-auto px-4">
          <FadeIn className="text-center mb-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 mb-3">FAQ</p>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900" style={serif}>
              Questions fréquentes
            </h2>
          </FadeIn>
          <FadeIn delay={0.05}>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="bg-white border border-slate-200 rounded-xl px-4 data-[state=open]:border-indigo-200"
                >
                  <AccordionTrigger className="text-sm font-medium text-slate-900 py-4 text-left hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-slate-500 leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeIn>
        </div>
      </section>

      {/* ── SECTION 8 — FOOTER ──────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-white py-12 px-4">
        <div className="container max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
            <div>
              <p className="font-bold text-xl mb-1.5" style={serif}>ImmoTest</p>
              <p className="text-sm text-slate-400">Achetez mieux, sans intermédiaire.</p>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
              <a href="#" className="hover:text-white transition-colors">CGU</a>
              <a href="#" className="hover:text-white transition-colors">Confidentialité</a>
              <a href="mailto:contact@immotest.fr" className="hover:text-white transition-colors">
                contact@immotest.fr
              </a>
            </nav>
          </div>
          <div className="pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between gap-3 text-xs text-slate-500">
            <p>Données DVF © Ministère des Finances · ADEME · INSEE · OpenStreetMap contributors</p>
            <p>© 2026 ImmoTest · immotest.fr</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
