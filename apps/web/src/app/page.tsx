'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

function FadeInUp({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

const features = [
  {
    emoji: '🎯',
    title: 'Score ImmoSafe',
    description:
      "Un score de 0 à 100 qui résume si le bien vaut le coup. Vert, orange ou rouge — vous savez en un coup d'œil.",
  },
  {
    emoji: '💰',
    title: 'Prix du marché réel',
    description:
      "On compare le prix demandé aux vraies transactions du quartier. Pas des estimations, des faits.",
  },
  {
    emoji: '🔍',
    title: 'Checklist complète',
    description:
      "Points de vigilance, questions à poser au vendeur, marge de négociation. Tout ce qu'un agent ne vous dira pas.",
  },
]

const stats = [
  { value: '100% objectif', label: 'Aucun agent, aucune commission' },
  { value: '10 secondes', label: 'Pour obtenir votre analyse complète' },
  { value: 'Données réelles', label: 'Prix issus des transactions officielles DVF' },
]

const pricingBenefits = [
  'Analyses illimitées',
  'Rapports PDF téléchargeables',
  'Score ImmoSafe sur chaque bien',
  'Questions vendeur personnalisées',
]

const faqs = [
  {
    question: "C'est quoi ImmoSafe exactement ?",
    answer:
      "ImmoSafe est un outil d'analyse immobilière conçu pour les acheteurs. Vous renseignez les informations d'un bien et on vous donne un score de 0 à 100 basé sur les données réelles du marché, avec les points de vigilance et les questions à poser au vendeur.",
  },
  {
    question: "Comment fonctionne l'analyse gratuite ?",
    answer:
      "Votre première analyse est entièrement gratuite, sans carte bancaire. Elle vous donne accès au score complet, à la comparaison des prix, aux points de vigilance et aux questions vendeur. Pour des analyses illimitées et les rapports PDF, l'abonnement à 29 € pour 3 mois est disponible.",
  },
  {
    question: "D'où viennent les données utilisées ?",
    answer:
      "Nous utilisons les données DVF (Demande de Valeur Foncière), la base officielle des transactions immobilières publiée par le gouvernement français. Les données DPE viennent de l'ADEME. Ce sont des sources publiques et officielles — pas des estimations.",
  },
  {
    question: "Est-ce que ça remplace un agent immobilier ?",
    answer:
      "Non, et ce n'est pas l'objectif. ImmoSafe vous donne les informations objectives pour négocier en connaissance de cause. Un agent s'occupe de la partie administrative et juridique. Nous, on s'assure que vous ne payez pas trop cher.",
  },
  {
    question: "Comment annuler mon abonnement ?",
    answer:
      "L'abonnement ImmoSafe est un paiement unique pour 3 mois — il n'y a pas de reconduction automatique. Votre accès expire simplement au bout de 3 mois. Si vous souhaitez annuler avant la fin de la période, vous pouvez le faire depuis votre page Profil.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight">
            ImmoSafe
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#fonctionnalites" className="hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="hover:text-foreground transition-colors">
              Tarifs
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Essayer gratuitement</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="py-20 md:py-32 px-4 text-center">
        <div className="container max-w-4xl mx-auto">
          <FadeInUp>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
              Achetez votre bien immobilier{' '}
              <span className="text-primary">sans vous faire avoir</span>
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Analysez n'importe quelle annonce en 10 secondes.{' '}
              Prix du marché, points de vigilance, marge de négociation.{' '}
              Sans agent. Sans conflit d'intérêt.
            </p>
          </FadeInUp>
          <FadeInUp delay={0.2}>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Button size="lg" className="w-full sm:w-auto px-8" asChild>
                <Link href="/register">Essayer gratuitement</Link>
              </Button>
              <Button size="lg" variant="ghost" className="w-full sm:w-auto" asChild>
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              1 analyse offerte, sans carte bancaire
            </p>
          </FadeInUp>
        </div>
      </section>

      {/* ── SOCIAL PROOF ── */}
      <section className="py-12 bg-muted/40 px-4">
        <div className="container max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {stats.map((stat, i) => (
              <FadeInUp key={stat.value} delay={i * 0.1}>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ── */}
      <section id="fonctionnalites" className="py-20 md:py-28 px-4">
        <div className="container max-w-5xl mx-auto">
          <FadeInUp className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold">
              Tout ce qu'il vous faut pour décider en confiance
            </h2>
          </FadeInUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FadeInUp key={feature.title} delay={i * 0.1}>
                <Card className="h-full">
                  <CardContent className="pt-6 space-y-3">
                    <span className="text-3xl">{feature.emoji}</span>
                    <h3 className="font-semibold text-base">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </FadeInUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── TARIFS ── */}
      <section id="tarifs" className="py-20 md:py-28 px-4 bg-muted/40">
        <div className="container max-w-md mx-auto text-center">
          <FadeInUp>
            <h2 className="text-3xl md:text-4xl font-bold mb-10">Tarifs</h2>
            <Card className="text-left">
              <CardContent className="pt-6 space-y-6">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Accès complet
                  </p>
                  <p className="text-5xl font-bold">29 €</p>
                  <p className="text-muted-foreground mt-1">pour 3 mois d'analyses illimitées</p>
                </div>
                <ul className="space-y-2.5">
                  {pricingBenefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2 text-sm">
                      <span className="text-green-600">✅</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-center text-muted-foreground">
                  Paiement unique. Pas d'abonnement automatique.
                </p>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/register">Commencer avec 1 analyse gratuite</Link>
                </Button>
              </CardContent>
            </Card>
          </FadeInUp>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 md:py-28 px-4">
        <div className="container max-w-2xl mx-auto">
          <FadeInUp className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold">Questions fréquentes</h2>
          </FadeInUp>
          <FadeInUp delay={0.1}>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger className="text-base">{faq.question}</AccordionTrigger>
                  <AccordionContent>{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </FadeInUp>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t bg-muted/40 py-10 px-4">
        <div className="container max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-bold">ImmoSafe</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              L'analyse immobilière 100% du côté de l'acheteur.
            </p>
          </div>
          <nav className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">CGU</a>
            <a href="#" className="hover:text-foreground transition-colors">
              Politique de confidentialité
            </a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  )
}
