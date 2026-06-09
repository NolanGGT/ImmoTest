'use client'

import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  motion, useInView, AnimatePresence,
  useMotionValue, animate, type PanInfo,
} from 'framer-motion'
import {
  MapPin, TrendingDown, Home, CreditCard,
  BarChart2, MessageSquare, Shield, Zap, Award,
  ArrowRight, ChevronLeft, ChevronRight, Check,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

// ─── Constants ────────────────────────────────────────────────────────────────

const ANALYSIS_STEPS = [
  { icon: '🏷️', title: 'Prix au m²',          desc: 'Données DVF / transactions réelles' },
  { icon: '📊', title: 'Marché local',          desc: 'Comparaison des 6 derniers mois' },
  { icon: '🏘️', title: 'Qualité du quartier',  desc: 'Données INSEE taux d\'infraction' },
  { icon: '💳', title: 'Simulateur de crédit',  desc: 'Calcul personnalisé' },
  { icon: '⚡', title: 'Points de vigilance',   desc: 'Détectés automatiquement' },
  { icon: '❓', title: 'Questions à poser',     desc: 'Générées par l\'IA' },
]

const PRICING = [
  { price: '12€',     duration: '1 mois',  label: 'Pour commencer',      badge: null,                 note: null,                                                                                                             highlight: false },
  { price: '29,99€',  duration: '3 mois',  label: 'Le plus populaire',   badge: 'LE PLUS POPULAIRE',  note: null,                                                                                                             highlight: true  },
  { price: '49,99€',  duration: '6 mois',  label: 'Le plus avantageux',  badge: 'MEILLEURE VALEUR',   note: 'La recherche immobilière prend en moyenne 6 mois — autant en profiter pleinement.',  highlight: false },
]

const FEATURE_CARDS = [
  { icon: MapPin,       title: 'Visualisez tous vos biens sur une carte.',          desc: 'Activez des calques — transports, commerces, écoles. Calculez les trajets depuis votre travail.',           id: 'map'          },
  { icon: TrendingDown, title: 'Le vrai prix du marché, pas le prix demandé.',       desc: 'Comparé aux vraies transactions DVF dans votre quartier. Sachez exactement si vous surpayez.',            id: 'price'        },
  { icon: Home,         title: 'Vivre bien, pas juste acheter.',                     desc: 'Score de quartier basé sur les données INSEE. Revenus, commodités, tranquillité.',                          id: 'neighborhood' },
  { icon: CreditCard,   title: 'Combien ça coûte vraiment chaque mois ?',           desc: 'Simulez votre crédit en temps réel. Taux, durée, mensualité — sans remplir 12 formulaires.',               id: 'credit'       },
  { icon: BarChart2,    title: 'Côte à côte. Jusqu\'à 4 biens en même temps.',      desc: 'Comparez les métriques clés, trouvez le gagnant évident. Enfin de la clarté.',                             id: 'compare'      },
  { icon: MessageSquare,title: 'Les questions que vous n\'auriez pas pensé à poser.', desc: 'L\'IA génère des questions ciblées selon le bien, le DPE, l\'ancienneté. Votre checklist de visite.',   id: 'questions'    },
]

function useCTAHref() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return isAuthenticated ? '/analyser' : '/login?redirect=/analyser&source=landing'
}

const QUESTIONS = [
  'Pourquoi le bien est-il vendu ?',
  "Y a-t-il des travaux de copropriété votés ?",
  "Quelle est l'orientation principale du bien ?",
]

// ─── Utility helpers ──────────────────────────────────────────────────────────

const playfair: React.CSSProperties = { fontFamily: 'var(--font-playfair)' }

function FadeUp({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Grain() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.025] z-0"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }}
    />
  )
}

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const iv = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) { clearInterval(iv); setDone(true) }
    }, 28)
    return () => clearInterval(iv)
  }, [text])
  return (
    <span className="text-sm text-white leading-snug">
      {displayed}
      {!done && <span className="opacity-40">|</span>}
    </span>
  )
}

// ─── Feature card visuals ─────────────────────────────────────────────────────

function MapCard() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const [showRadius, setShowRadius] = useState(false)
  useEffect(() => {
    if (!inView) return
    const t = setTimeout(() => setShowRadius(true), 700)
    return () => clearTimeout(t)
  }, [inView])
  const pins = [
    { x: '20%', y: '38%', active: true },
    { x: '52%', y: '52%', active: false },
    { x: '72%', y: '30%', active: false },
    { x: '38%', y: '65%', active: false },
    { x: '80%', y: '55%', active: false },
  ]
  return (
    <div ref={ref} className="rounded-2xl overflow-hidden relative" style={{ background: '#1a2030', height: 260 }}>
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      <div className="absolute left-0 right-0 h-px" style={{ top: '45%', background: 'rgba(255,255,255,0.05)' }} />
      <div className="absolute top-0 bottom-0 w-px" style={{ left: '25%', background: 'rgba(255,255,255,0.04)' }} />
      <div className="absolute top-0 bottom-0 w-px" style={{ left: '65%', background: 'rgba(255,255,255,0.04)' }} />

      <AnimatePresence>
        {showRadius && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute rounded-full border-2"
            style={{
              left: 'calc(20% - 56px)', top: 'calc(38% - 56px)',
              width: 112, height: 112,
              borderColor: 'rgba(249,115,22,0.35)',
              background: 'rgba(249,115,22,0.06)',
            }}
          />
        )}
      </AnimatePresence>

      {pins.map((pin, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.15 + i * 0.14, type: 'spring', stiffness: 300 }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: pin.x, top: pin.y }}
        >
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
            background: pin.active ? '#F97316' : 'rgba(255,255,255,0.14)',
            boxShadow: pin.active ? '0 0 12px rgba(249,115,22,0.55)' : 'none',
          }}>
            <MapPin size={10} color="white" />
          </div>
        </motion.div>
      ))}

      <div className="absolute bottom-3 left-3 flex gap-2">
        {['Travail', 'École'].map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + i * 0.12 }}
            className="px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: i === 0 ? 'rgba(249,115,22,0.18)' : 'rgba(255,255,255,0.07)',
              border: `1px solid ${i === 0 ? 'rgba(249,115,22,0.38)' : 'rgba(255,255,255,0.1)'}`,
              color: i === 0 ? '#F97316' : '#9CA3AF',
            }}
          >{label}</motion.div>
        ))}
      </div>
    </div>
  )
}

function PriceChart() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const bars = [
    { label: 'Jan', asked: 88, market: 74 },
    { label: 'Fév', asked: 91, market: 76 },
    { label: 'Mar', asked: 95, market: 77 },
    { label: 'Avr', asked: 93, market: 76 },
    { label: 'Mai', asked: 98, market: 79 },
    { label: 'Jun', asked: 100, market: 82 },
  ]
  return (
    <div ref={ref} className="rounded-2xl p-5" style={{ background: '#1A1A1A', height: 260 }}>
      <p className="text-xs mb-3" style={{ color: '#6B7280' }}>Prix demandé vs Prix marché DVF</p>
      <div className="flex items-end gap-2" style={{ height: 160 }}>
        {bars.map((bar, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end" style={{ height: 132 }}>
              <motion.div
                initial={{ scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{ delay: 0.08 * i, duration: 0.55, ease: 'easeOut', origin: 'bottom' }}
                className="flex-1 rounded-sm origin-bottom"
                style={{ height: `${bar.asked}%`, background: 'rgba(249,115,22,0.85)' }}
              />
              <motion.div
                initial={{ scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{ delay: 0.08 * i + 0.08, duration: 0.55, ease: 'easeOut' }}
                className="flex-1 rounded-sm origin-bottom"
                style={{ height: `${bar.market}%`, background: 'rgba(74,222,128,0.65)' }}
              />
            </div>
            <span className="text-[9px]" style={{ color: '#4B5563' }}>{bar.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        <span className="flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
          <span className="w-2.5 h-2 rounded-sm inline-block" style={{ background: 'rgba(249,115,22,0.85)' }} /> Demandé
        </span>
        <span className="flex items-center gap-1.5 text-xs" style={{ color: '#9CA3AF' }}>
          <span className="w-2.5 h-2 rounded-sm inline-block" style={{ background: 'rgba(74,222,128,0.65)' }} /> Marché réel
        </span>
        <span className="text-xs ml-auto font-semibold" style={{ color: '#F97316' }}>Gap : +18%</span>
      </div>
    </div>
  )
}

function NeighborhoodScore() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const score = 72
  const r = 72, cx = 90
  const arcLength = Math.PI * r
  const offset = arcLength * (1 - score / 100)
  const scoreColor = score >= 70 ? '#22c55e' : score >= 40 ? '#F97316' : '#ef4444'
  return (
    <div ref={ref} className="rounded-2xl p-5 flex flex-col items-center justify-center" style={{ background: '#1A1A1A', height: 260 }}>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Score de qualité du quartier</p>
      <svg width="180" height="110" viewBox="0 0 180 110">
        <path d="M 18 90 A 72 72 0 0 1 162 90" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14" strokeLinecap="round" />
        <motion.path
          d="M 18 90 A 72 72 0 0 1 162 90"
          fill="none"
          stroke={scoreColor}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={arcLength}
          initial={{ strokeDashoffset: arcLength }}
          animate={inView ? { strokeDashoffset: offset } : {}}
          transition={{ duration: 1.3, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        />
        <text x={cx} y="80" textAnchor="middle" fill="white" fontSize="30" fontWeight="700">{score}</text>
        <text x={cx} y="97" textAnchor="middle" fill="#6B7280" fontSize="12">/100</text>
      </svg>
      <div className="flex gap-4 mt-1">
        {[['#ef4444','Risqué'],['#F97316','Moyen'],['#22c55e','Bon']].map(([color, label]) => (
          <span key={label} className="flex items-center gap-1 text-xs" style={{ color: '#6B7280' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: color }} />{label}
          </span>
        ))}
      </div>
    </div>
  )
}

function CreditSimulator() {
  const [price, setPrice] = useState(280000)
  const [years, setYears] = useState(20)
  const [rate, setRate] = useState(3.5)
  const monthly = useMemo(() => {
    const rM = rate / 100 / 12
    const n = years * 12
    const capital = price * 0.9
    if (rM === 0) return Math.round(capital / n)
    return Math.round(capital * rM * Math.pow(1 + rM, n) / (Math.pow(1 + rM, n) - 1))
  }, [price, years, rate])

  const sliders = [
    { label: 'Prix du bien',  display: `${(price / 1000).toFixed(0)} k€`,  min: 80000,  max: 900000, step: 5000,  val: price, set: setPrice },
    { label: 'Durée',         display: `${years} ans`,                       min: 10,     max: 30,     step: 1,     val: years, set: setYears },
    { label: 'Taux annuel',   display: `${rate.toFixed(1)} %`,               min: 0.5,    max: 7,      step: 0.1,   val: rate,  set: setRate  },
  ]
  return (
    <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', height: 260 }}>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Simulateur de crédit</p>
      <div className="space-y-3">
        {sliders.map(({ label, display, min, max, step, val, set }) => {
          const pct = ((val - min) / (max - min)) * 100
          return (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1.5">
                <span style={{ color: '#6B7280' }}>{label}</span>
                <span className="font-semibold" style={{ color: '#F97316' }}>{display}</span>
              </div>
              <input
                type="range" min={min} max={max} step={step} value={val}
                onChange={e => set(Number(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:cursor-pointer"
                style={{ background: `linear-gradient(to right, #F97316 ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl p-3" style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.18)' }}>
        <span className="text-sm" style={{ color: '#9CA3AF' }}>Mensualité estimée</span>
        <motion.span key={monthly} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-bold text-white">
          {monthly.toLocaleString('fr-FR')} €/mois
        </motion.span>
      </div>
    </div>
  )
}

function CompareView() {
  const props = [
    { addr: 'Rue de la Paix, Paris 9e',    price: '485 k€', sqm: '8 275 €/m²', dpe: 'D', score: 68, winner: false },
    { addr: 'Av. République, Paris 11e',   price: '412 k€', sqm: '7 600 €/m²', dpe: 'B', score: 86, winner: true  },
  ]
  return (
    <div className="rounded-2xl p-5" style={{ background: '#1A1A1A', height: 260 }}>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Comparaison de biens</p>
      <div className="grid grid-cols-[1fr_20px_1fr] gap-2 items-start">
        {props.map((p, i) => (
          <>
            {i === 1 && <div key="vs" className="flex items-center justify-center self-center"><span className="text-[10px] font-bold" style={{ color: '#4B5563' }}>VS</span></div>}
            <div key={p.addr} className="rounded-xl p-3 border" style={{
              background: p.winner ? 'rgba(249,115,22,0.06)' : 'rgba(255,255,255,0.02)',
              borderColor: p.winner ? 'rgba(249,115,22,0.32)' : 'rgba(255,255,255,0.06)',
            }}>
              <p className="text-[10px] leading-tight mb-2" style={{ color: '#9CA3AF' }}>{p.addr}</p>
              {[['Prix', p.price, !p.winner], ['Prix/m²', p.sqm, !p.winner], ['DPE', p.dpe, false], ['Score', `${p.score}/100`, p.winner]].map(([lbl, val, hl]) => (
                <div key={lbl as string} className="flex justify-between text-xs py-0.5">
                  <span style={{ color: '#6B7280' }}>{lbl as string}</span>
                  <span style={{ color: hl ? '#F97316' : 'white', fontWeight: hl ? 700 : 400 }}>{val as string}</span>
                </div>
              ))}
              {p.winner && (
                <div className="mt-2 text-center">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.18)', color: '#F97316' }}>✓ Meilleure option</span>
                </div>
              )}
            </div>
          </>
        ))}
      </div>
    </div>
  )
}

function QuestionsView() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const [visibleCount, setVisibleCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    const timers = QUESTIONS.map((_, i) => setTimeout(() => setVisibleCount(i + 1), 400 + i * 1100))
    return () => timers.forEach(clearTimeout)
  }, [inView])
  return (
    <div ref={ref} className="rounded-2xl p-5" style={{ background: '#1A1A1A', height: 260 }}>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>Questions générées par l'IA</p>
      <div className="space-y-3">
        {QUESTIONS.map((q, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={visibleCount > i ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="flex gap-3 items-start p-3 rounded-xl"
            style={{ background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.14)' }}
          >
            <span className="text-orange-400 shrink-0 mt-0.5 text-sm">❓</span>
            {visibleCount > i && <TypewriterText text={q} />}
          </motion.div>
        ))}
      </div>
    </div>
  )
}

const FEATURE_VISUALS: React.FC[] = [MapCard, PriceChart, NeighborhoodScore, CreditSimulator, CompareView, QuestionsView]

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const ctaHref = useCTAHref()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b" style={{ background: 'rgba(15,15,15,0.88)', backdropFilter: 'blur(20px)', borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <span className="text-xl font-bold text-white tracking-tight" style={playfair}>ImmoTest</span>
        <nav className="hidden md:flex items-center gap-7 text-sm" style={{ color: '#6B7280' }}>
          <a href="#analyse" className="hover:text-white transition-colors">Comment ça marche</a>
          <a href="#fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</a>
          <a href="#tarifs" className="hover:text-white transition-colors">Tarifs</a>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href="/analyser" className="px-5 py-2 text-sm font-semibold text-white rounded-full transition-colors hover:bg-orange-400" style={{ background: '#F97316' }}>
              Mon espace →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm transition-colors hover:text-white" style={{ color: '#6B7280' }}>Se connecter</Link>
              <Link href={ctaHref} className="px-5 py-2 text-sm font-semibold text-white rounded-full transition-colors hover:bg-orange-400" style={{ background: '#F97316' }}>
                Essai gratuit
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Section 1: Hero ──────────────────────────────────────────────────────────

function HeroSection() {
  const ctaHref = useCTAHref()
  const lines = [
    { text: 'Trouver votre futur', color: 'white',    baseDelay: 0.20 },
    { text: 'chez vous.',          color: 'white',    baseDelay: 0.50 },
    { text: 'En toute confiance.', color: '#F97316', baseDelay: 0.65 },
  ]
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 z-0">
        <Image src="/images/hero.png" alt="Hero" fill className="object-cover object-top" priority />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <Grain />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 55% at 50% 38%, rgba(249,115,22,0.07) 0%, transparent 70%)' }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium border" style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.22)', color: '#FB923C' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            Données DVF officielles · France entière
          </span>
        </motion.div>

        <h1 className="text-5xl md:text-7xl font-bold leading-[1.08] mb-7" style={playfair}>
          {lines.map(({ text, color, baseDelay }) => (
            <div key={text} className="block">
              {text.split(' ').map((word, i) => (
                <motion.span
                  key={i}
                  className="inline-block mr-[0.22em]"
                  style={{ color }}
                  initial={{ opacity: 0, y: 36 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: baseDelay + i * 0.09, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  {word}
                </motion.span>
              ))}
            </div>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.05, duration: 0.7 }}
          className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto"
          style={{ color: '#6B7280' }}
        >
          ImmoTest analyse chaque annonce pour vous — prix, quartier, crédit, risques.
          <br className="hidden md:block" />
          Tout ce qu'un agent ne vous dira jamais.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.6 }}>
          <motion.a
            href="#tarifs"
            className="inline-flex items-center gap-2.5 px-8 py-4 text-white text-lg font-bold rounded-full"
            style={{ background: '#F97316' }}
            whileHover={{ scale: 1.04, background: '#EA6B0D' } as never}
            whileTap={{ scale: 0.97 }}
            animate={{ boxShadow: ['0 0 0 0px rgba(249,115,22,0.45)', '0 0 0 16px rgba(249,115,22,0)'] }}
            transition={{ boxShadow: { duration: 1.9, repeat: Infinity, ease: 'easeOut' } } as never}
          >
            Voir les offres <ArrowRight size={18} />
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.45 }}
          className="flex flex-wrap justify-center gap-5 mt-10 text-sm"
          style={{ color: '#6B7280' }}
        >
          {[{ icon: Shield, label: 'Sans engagement' }, { icon: Zap, label: 'Analyse en 30 s' }, { icon: Award, label: '100% indépendant' }].map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5">
              <Icon size={14} color="rgba(249,115,22,0.6)" />{label}
            </span>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-8 rounded-full border flex items-start justify-center pt-1.5"
          style={{ borderColor: 'rgba(255,255,255,0.14)' }}
        >
          <div className="w-1 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.28)' }} />
        </motion.div>
      </motion.div>
    </section>
  )
}

// ─── Section 2: Demo ──────────────────────────────────────────────────────────

function DemoSection() {
  const [clicked, setClicked] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  useEffect(() => {
    if (!inView) return
    const t = setTimeout(() => setClicked(true), 2400)
    return () => clearTimeout(t)
  }, [inView])

  return (
    <section ref={ref} className="py-32" style={{ background: '#0F0F0F' }}>
      <div className="max-w-5xl mx-auto px-4">
        <FadeUp className="text-center mb-20">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#F97316' }}>Comment ça fonctionne</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white" style={playfair}>
            L'analyse commence dès<br />que vous le décidez.
          </h2>
        </FadeUp>

        <div className="relative max-w-md mx-auto">
          {/* Mock listing card */}
          <motion.div
            animate={clicked ? { filter: 'blur(3px) brightness(0.38)', scale: 0.97 } : { filter: 'blur(0px) brightness(1)', scale: 1 }}
            transition={{ duration: 0.55 }}
            className="rounded-2xl overflow-hidden border"
            style={{ background: '#1A1A1A', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            {/* Fake photo */}
            <div className="h-44 relative" style={{ background: 'linear-gradient(135deg,#252525 0%,#1e1e1e 100%)' }}>
              <div className="absolute inset-0" style={{
                backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 28px,rgba(255,255,255,0.025) 28px,rgba(255,255,255,0.025) 29px),repeating-linear-gradient(90deg,transparent,transparent 28px,rgba(255,255,255,0.025) 28px,rgba(255,255,255,0.025) 29px)',
              }} />
              <div className="absolute bottom-3 left-3 flex gap-1.5">
                {[70,55,40].map(w => <div key={w} className="h-12 rounded-lg" style={{ width: w, background: 'rgba(255,255,255,0.06)' }} />)}
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                  <div className="h-4 rounded-full w-32" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div className="h-3 rounded-full w-20" style={{ background: 'rgba(255,255,255,0.05)' }} />
                </div>
                <div className="h-6 rounded-lg w-24" style={{ background: 'rgba(255,255,255,0.08)' }} />
              </div>
              <div className="flex gap-2">
                {[50,65,45].map(w => <div key={w} className="h-5 rounded-full" style={{ width: w, background: 'rgba(255,255,255,0.05)' }} />)}
              </div>
            </div>
          </motion.div>

          {/* Floating button */}
          <AnimatePresence>
            {!clicked && (
              <motion.button
                initial={{ opacity: 0, y: 12, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1, boxShadow: ['0 0 0 0px rgba(249,115,22,0.4)','0 0 0 10px rgba(249,115,22,0)','0 0 0 0px rgba(249,115,22,0)'] }}
                exit={{ opacity: 0, scale: 2.8, y: -22 }}
                transition={{ opacity: { delay: 0.5 }, scale: { delay: 0.5 }, y: { delay: 0.5 }, boxShadow: { delay: 1.0, duration: 1.8, repeat: 2 } }}
                onClick={() => setClicked(true)}
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 px-5 py-2.5 text-sm font-bold text-white rounded-full whitespace-nowrap cursor-pointer"
                style={{ background: '#F97316', boxShadow: '0 4px 24px rgba(249,115,22,0.42)' }}
              >
                ✦ Analyser avec ImmoTest
              </motion.button>
            )}
          </AnimatePresence>

          {/* Post-click overlay */}
          <AnimatePresence>
            {clicked && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0.78, y: 16 }} animate={{ scale: 1, y: 0 }}
                  transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 22 }}
                  className="font-bold text-xl px-8 py-4 rounded-2xl text-white"
                  style={{ background: 'rgba(249,115,22,0.14)', border: '1px solid rgba(249,115,22,0.42)', boxShadow: '0 0 48px rgba(249,115,22,0.28)' }}
                >
                  Analyse en cours ✓
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}

// ─── Section 3: Analysis ──────────────────────────────────────────────────────

function AnalysisSection() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.25 })
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    if (!inView) return
    const iv = setInterval(() => {
      setActiveIndex(prev => {
        if (prev >= ANALYSIS_STEPS.length - 1) { clearInterval(iv); return prev }
        return prev + 1
      })
    }, 560)
    return () => clearInterval(iv)
  }, [inView])

  const progress = activeIndex >= 0 ? Math.round(((activeIndex + 1) / ANALYSIS_STEPS.length) * 100) : 0

  return (
    <section id="analyse" ref={ref} className="py-28" style={{ background: '#111111' }}>
      <div className="max-w-4xl mx-auto px-4">
        <FadeUp className="text-center mb-14">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={playfair}>En 30 secondes,<br />on analyse tout pour vous.</h2>
          <p style={{ color: '#6B7280' }}>On connecte les meilleures sources publiques pour vous.</p>
        </FadeUp>

        <div className="h-0.5 rounded-full mb-8 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div className="h-full rounded-full" style={{ background: '#F97316' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.45, ease: 'easeOut' }} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ANALYSIS_STEPS.map((step, i) => {
            const isActive = activeIndex >= i
            const isCurrent = activeIndex === i
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0.14, y: 0 }}
                transition={{ duration: 0.42 }}
                className="rounded-xl p-4 border"
                style={{
                  background: isActive ? 'rgba(249,115,22,0.04)' : 'rgba(255,255,255,0.015)',
                  borderColor: isActive ? 'rgba(249,115,22,0.28)' : 'rgba(255,255,255,0.05)',
                  boxShadow: isCurrent ? '0 0 22px rgba(249,115,22,0.12)' : 'none',
                }}
              >
                <span className="text-2xl mb-2 block">{step.icon}</span>
                <p className="font-semibold text-white text-sm">{step.title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{step.desc}</p>
                {isCurrent && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1 mt-2">
                    {[0, 0.2, 0.4].map(d => <div key={d} className="w-1 h-1 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: `${d}s` }} />)}
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Section 4: Features Carousel ────────────────────────────────────────────

function FeaturesCarousel() {
  const [current, setCurrent] = useState(0)
  const x = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [cardW, setCardW] = useState(800)

  useEffect(() => {
    const update = () => { if (containerRef.current) setCardW(containerRef.current.offsetWidth) }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  const goTo = useCallback((index: number) => {
    const i = Math.max(0, Math.min(FEATURE_CARDS.length - 1, index))
    setCurrent(i)
    animate(x, -i * cardW, { type: 'spring', stiffness: 280, damping: 34 })
  }, [x, cardW])

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60 || info.velocity.x < -400) goTo(current + 1)
    else if (info.offset.x > 60 || info.velocity.x > 400) goTo(current - 1)
    else goTo(current)
  }

  return (
    <section id="fonctionnalites" className="py-24 overflow-hidden" style={{ background: '#0F0F0F' }}>
      <FadeUp className="text-center mb-12 px-4">
        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#F97316' }}>Fonctionnalités</p>
        <h2 className="text-4xl md:text-5xl font-bold text-white" style={playfair}>Tout pour décider en confiance.</h2>
        <p className="text-sm mt-3" style={{ color: '#4B5563' }}>Glissez ou utilisez les flèches pour explorer</p>
      </FadeUp>

      <div ref={containerRef} className="relative overflow-hidden">
        <motion.div
          className="flex cursor-grab active:cursor-grabbing"
          style={{ x }}
          drag="x"
          dragConstraints={{ left: -(FEATURE_CARDS.length - 1) * cardW, right: 0 }}
          dragElastic={0.07}
          onDragEnd={onDragEnd}
        >
          {FEATURE_CARDS.map((card, i) => {
            const Visual = FEATURE_VISUALS[i]
            return (
              <div key={card.id} style={{ minWidth: cardW }} className="px-4 md:px-12 select-none">
                <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10 items-center py-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.22)' }}>
                      <card.icon size={20} color="#F97316" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-3" style={playfair}>{card.title}</h3>
                    <p className="text-base leading-relaxed" style={{ color: '#6B7280' }}>{card.desc}</p>
                  </div>
                  <Visual />
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8 px-4">
        <button onClick={() => goTo(current - 1)} disabled={current === 0}
          className="w-9 h-9 rounded-full border flex items-center justify-center transition-all disabled:opacity-20 hover:border-orange-500/50"
          style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'white' }}>
          <ChevronLeft size={16} />
        </button>
        <div className="flex gap-2">
          {FEATURE_CARDS.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} className="rounded-full transition-all" style={{ width: i === current ? 24 : 8, height: 8, background: i === current ? '#F97316' : 'rgba(255,255,255,0.15)' }} />
          ))}
        </div>
        <button onClick={() => goTo(current + 1)} disabled={current === FEATURE_CARDS.length - 1}
          className="w-9 h-9 rounded-full border flex items-center justify-center transition-all disabled:opacity-20 hover:border-orange-500/50"
          style={{ borderColor: 'rgba(255,255,255,0.12)', color: 'white' }}>
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  )
}

// ─── Section 5: Social Proof ──────────────────────────────────────────────────

function SocialProofSection() {
  const stats = [
    { icon: '📊', label: '6 sources de données' },
    { icon: '⚡', label: 'Analyse en 30 secondes' },
    { icon: '🛡️', label: '100% indépendant' },
  ]
  return (
    <section className="py-28 text-center" style={{ background: '#111111' }}>
      <div className="max-w-3xl mx-auto px-4">
        <FadeUp>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5" style={playfair}>
            Votre aide à la décision,<br />pas un remplaçant.
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.88 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.13 * i, duration: 0.45 }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium text-white"
                style={{ background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.2)' }}
              >
                <span>{s.icon}</span>{s.label}
              </motion.div>
            ))}
          </div>
          <p className="text-base leading-relaxed max-w-xl mx-auto" style={{ color: '#6B7280' }}>
            ImmoTest ne vend rien, ne touche aucune commission.
            On est juste là pour vous aider à voir clair.
          </p>
        </FadeUp>
      </div>
    </section>
  )
}

// ─── Section 6: Pricing ───────────────────────────────────────────────────────

function PricingSection() {
  const ctaHref = useCTAHref()
  const included = ['Analyses illimitées', 'Carte interactive', 'Score de quartier', 'Simulateur de crédit', 'Rapports PDF']
  return (
    <section id="tarifs" className="py-28" style={{ background: '#0F0F0F' }}>
      <div className="max-w-5xl mx-auto px-4">
        <FadeUp className="text-center mb-14">
          <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: '#F97316' }}>Tarifs</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white" style={playfair}>Simple et transparent.</h2>
        </FadeUp>
        <div className="grid md:grid-cols-3 gap-5">
          {PRICING.map((plan, i) => (
            <FadeUp key={plan.duration} delay={i * 0.1}>
              <motion.div
                whileHover={{ y: -6, boxShadow: plan.highlight ? '0 24px 64px rgba(249,115,22,0.22)' : '0 14px 44px rgba(0,0,0,0.5)' }}
                transition={{ duration: 0.22 }}
                className="relative rounded-2xl p-6 border flex flex-col h-full"
                style={{ background: plan.highlight ? 'rgba(249,115,22,0.04)' : '#1A1A1A', borderColor: plan.highlight ? '#F97316' : 'rgba(255,255,255,0.07)' }}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap text-white" style={{ background: '#F97316' }}>
                    {plan.badge}
                  </div>
                )}
                <p className="text-sm font-medium mb-3" style={{ color: '#6B7280' }}>{plan.label}</p>
                <span className="text-4xl font-bold text-white mb-1">{plan.price}</span>
                <p className="text-sm mb-5" style={{ color: '#6B7280' }}>pour {plan.duration}</p>
                {plan.note && (
                  <p className="text-xs leading-relaxed p-3 rounded-xl mb-5" style={{ color: '#9CA3AF', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {plan.note}
                  </p>
                )}
                <div className="space-y-2.5 mb-6 flex-1">
                  {included.map(f => (
                    <div key={f} className="flex items-center gap-2.5 text-sm">
                      <Check size={14} className="text-orange-500 shrink-0" />
                      <span style={{ color: '#9CA3AF' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.a
                  href={ctaHref}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="block text-center py-3 rounded-full text-sm font-bold text-white"
                  style={plan.highlight ? { background: '#F97316' } : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Commencer
                </motion.a>
              </motion.div>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Section 7: Closing CTA ───────────────────────────────────────────────────

function ClosingCTASection() {
  const ctaHref = useCTAHref()
  return (
    <section
      className="py-36 text-center relative overflow-hidden"
      // TODO: replace gradient with handshake/couple image
      style={{ background: 'linear-gradient(155deg,#1a0e04 0%,#0F0F0F 45%,#140a00 100%)' }}
    >
      <Grain />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 65% 50% at 50% 50%, rgba(249,115,22,0.09) 0%, transparent 70%)' }} />
      {/* Photo placeholder — replace with real image of handshake / real estate signing */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="relative w-[520px] h-[280px] max-w-[85vw] rounded-2xl overflow-hidden opacity-25"
          style={{ background: 'linear-gradient(135deg,#1A1A1A 0%,#2A1F1A 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="absolute bottom-3 right-4 text-[11px] font-mono" style={{ color: '#4B5563' }}>
            [ Photo : serrage de main / achat immobilier ]
          </span>
        </div>
      </div>
      <div className="relative z-10 max-w-2xl mx-auto px-4">
        <FadeUp>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-5" style={playfair}>
            Prêt à faire<br />le bon choix ?
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <p className="text-lg mb-10" style={{ color: '#6B7280' }}>
            Rejoignez les acheteurs qui ne font plus confiance au hasard.
          </p>
          <motion.a
            href="#tarifs"
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 px-10 py-5 text-white text-lg font-bold rounded-full"
            style={{ background: '#F97316', boxShadow: '0 0 44px rgba(249,115,22,0.38)' }}
          >
            Voir les offres →
          </motion.a>
          <p className="text-sm mt-6" style={{ color: '#4B5563' }}>Choisissez la formule qui vous convient. Annulable à tout moment.</p>
        </FadeUp>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-10 px-4 border-t" style={{ background: '#0F0F0F', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-5">
        <span className="text-lg font-bold text-white" style={playfair}>ImmoTest</span>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm" style={{ color: '#6B7280' }}>
          <Link href="/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
          <Link href="/cgu" className="hover:text-white transition-colors">CGU</Link>
          <Link href="/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
        </nav>
        <p className="text-sm" style={{ color: '#4B5563' }}>Fait avec ❤️ pour les acheteurs français</p>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div style={{ background: '#0F0F0F', color: '#FAFAFA', overflowX: 'hidden' }}>
      <Navbar />
      <HeroSection />
      <DemoSection />
      <AnalysisSection />
      <FeaturesCarousel />
      <SocialProofSection />
      <PricingSection />
      <ClosingCTASection />
      <Footer />
    </div>
  )
}
