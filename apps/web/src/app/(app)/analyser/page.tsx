'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, Download, Link as LinkIcon, AlertTriangle, CheckCircle2, X, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { LoadingAnalyse } from '@/components/immosafe/LoadingAnalyse'
import { ConfirmationBien } from '@/components/immosafe/ConfirmationBien'
import { useAnalyser } from '@/hooks/useAnalyser'
import { useScrapeUrl } from '@/hooks/useScrapeUrl'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const formSchema = z.object({
  prix: z.coerce.number().int().positive('Prix requis').max(10_000_000),
  surface: z.coerce.number().positive('Surface requise').max(1000),
  typeBien: z.enum(['APPARTEMENT', 'MAISON', 'STUDIO']),
  nbPieces: z.coerce.number().int().min(1).max(20).optional().nullable().transform(val => val ?? undefined),
  ville: z.string().min(2, 'Ville requise').max(100),
  // Optional at Zod level — required visually when missing after scraping
  codePostal: z.string().regex(/^[0-9]{5}$/, 'Code postal invalide (5 chiffres)').optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  adresse: z.string().max(200).optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  dpe: z.enum(['A', 'B', 'C', 'D', 'E', 'F', 'G', '']).optional().transform(v => v === '' ? undefined : v),
  charges: z.coerce.number().int().min(0).max(10000).optional().nullable().transform(val => val ?? undefined),
  anneeConstruction: z.coerce.number().int().min(1800).max(2026).optional().nullable().transform(val => val ?? undefined),
  urlSource: z.string().optional(),
  snapshotTitre: z.string().optional(),
  snapshotDescription: z.string().optional(),
  snapshotPhotos: z.array(z.string()).optional(),
})

type FormData = z.infer<typeof formSchema>
type AnalyserStep = 'form' | 'confirm' | 'loading'
type FormMode = 'url' | 'manuel'

const SOURCE_LABEL: Record<string, string> = {
  seloger: 'SeLoger',
  leboncoin: 'LeBonCoin',
  pap: 'PAP',
}

const EMPTY_DEFAULTS = {
  prix: '' as unknown as number,
  surface: '' as unknown as number,
  typeBien: 'APPARTEMENT' as const,
  ville: '',
  codePostal: '',
  adresse: '',
  nbPieces: undefined,
  charges: undefined,
  anneeConstruction: undefined,
  urlSource: undefined,
  snapshotTitre: undefined,
  snapshotDescription: undefined,
  snapshotPhotos: undefined,
}

// Fields required for analysis that may be missing from a scrape
const REQUIRED_SCRAPED: Array<keyof FormData> = ['prix', 'surface', 'ville', 'codePostal']

function AnalyserContent() {
  const [step, setStep] = useState<AnalyserStep>('form')
  const [mode, setMode] = useState<FormMode>('url')
  const [showUpsell, setShowUpsell] = useState(false)
  const [isFirstAnalysis] = useState(() =>
    typeof window !== 'undefined' ? !localStorage.getItem('immosafe_has_analysed') : true
  )
  const [urlInput, setUrlInput] = useState('')
  const [scrapingSource, setScrapingSource] = useState<string | null>(null)
  const [scrapingPartial, setScrapingPartial] = useState(false)
  const [scrapedMissingFields, setScrapedMissingFields] = useState<string[]>([])

  const router = useRouter()
  const searchParams = useSearchParams()
  const fromLanding = searchParams.get('source') === 'landing'
  const fromExtension = searchParams.get('source') === 'extension'

  const analyser = useAnalyser(() => {
    setShowUpsell(true)
    setStep('form')
  })

  const { mutate: scrapeUrl, isPending: isScraping } = useScrapeUrl()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_DEFAULTS,
  })

  const { setValue } = form

  // Pre-fill form when coming from the Chrome extension
  useEffect(() => {
    if (!fromExtension) return

    const numericFields = ['prix', 'surface', 'nbPieces', 'charges', 'anneeConstruction'] as const
    const textFields = ['urlSource', 'ville', 'codePostal', 'adresse', 'snapshotTitre', 'snapshotDescription'] as const

    numericFields.forEach(field => {
      const value = searchParams.get(field)
      if (value) setValue(field, Number(value))
    })

    textFields.forEach(field => {
      const value = searchParams.get(field)
      if (value) setValue(field, value)
    })

    const typeBien = searchParams.get('typeBien')
    if (typeBien === 'MAISON' || typeBien === 'APPARTEMENT' || typeBien === 'STUDIO') {
      setValue('typeBien', typeBien)
    }

    const dpe = searchParams.get('dpe')
    if (dpe) setValue('dpe', dpe.toUpperCase() as FormData['dpe'])

    const photosParam = searchParams.get('snapshotPhotos')
    if (photosParam) {
      try { setValue('snapshotPhotos', JSON.parse(photosParam)) } catch {}
    }

    const urlSource = searchParams.get('urlSource') ?? ''
    const source = urlSource.includes('leboncoin') ? 'leboncoin'
      : urlSource.includes('seloger') ? 'seloger'
      : urlSource.includes('pap') ? 'pap'
      : null
    setScrapingSource(source)
    setMode('manuel')

    toast.success('Données importées depuis l\'annonce ✓')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (analyser.isSuccess && !isFirstAnalysis) {
      form.reset(EMPTY_DEFAULTS)
      setScrapingSource(null)
      setScrapingPartial(false)
      setScrapedMissingFields([])
      setUrlInput('')
      setMode('url')
      analyser.reset()
    }
  }, [analyser.isSuccess, isFirstAnalysis]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrapeSubmit = (url: string) => {
    if (!url.trim()) return

    scrapeUrl(url.trim(), {
      onSuccess: (result) => {
        setScrapingSource(result.source)
        const d = result.data

        if (d.prix)              setValue('prix', d.prix)
        if (d.surface)           setValue('surface', d.surface)
        if (d.typeBien)          setValue('typeBien', d.typeBien)
        if (d.nbPieces)          setValue('nbPieces', d.nbPieces)
        if (d.ville)             setValue('ville', d.ville)
        if (d.codePostal)        setValue('codePostal', d.codePostal)
        if (d.adresse)           setValue('adresse', d.adresse)
        if (d.dpe)               setValue('dpe', d.dpe.toUpperCase() as FormData['dpe'])
        if (d.charges)           setValue('charges', d.charges)
        if (d.anneeConstruction) setValue('anneeConstruction', d.anneeConstruction)
        setValue('urlSource', url.trim())

        if (d.snapshotTitre)              setValue('snapshotTitre', d.snapshotTitre)
        if (d.snapshotDescription)        setValue('snapshotDescription', d.snapshotDescription)
        if (d.snapshotPhotos?.length)     setValue('snapshotPhotos', d.snapshotPhotos)

        if (result.success) {
          // Check whether required fields came through
          const missing = REQUIRED_SCRAPED.filter((f) => !d[f as keyof typeof d])
          setScrapedMissingFields(missing)

          if (missing.length === 0) {
            // All required fields present → go straight to confirmation
            setScrapingPartial(false)
            setStep('confirm')
          } else {
            // Some required fields missing → form with highlights
            setScrapingPartial(false)
            setMode('manuel')
          }
        } else if (result.partial) {
          setScrapingPartial(true)
          setScrapedMissingFields([])
          setMode('manuel')
        } else {
          setScrapingPartial(false)
          setScrapedMissingFields([])
          setMode('manuel')
          if (result.error === 'blocked') {
            toast.error('LeBonCoin bloque l\'import automatique. Remplissez le formulaire manuellement.')
          } else {
            toast.error('Import impossible. Remplissez le formulaire manuellement.')
          }
        }
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { error?: { code?: string } } } }
        const code = err.response?.data?.error?.code
        if (code === 'UNSUPPORTED_SOURCE') {
          toast.error('Site non supporté. Utilisez SeLoger, LeBonCoin ou PAP.')
        } else if (code === 'RATE_LIMIT') {
          toast.error('Trop de requêtes. Attendez une minute.')
        } else {
          toast.error('Import échoué. Remplissez le formulaire manuellement.')
          setMode('manuel')
        }
      },
    })
  }

  const onSubmit = () => {
    setStep('confirm')
  }

  const onConfirm = () => {
    const data = form.getValues()
    if (isFirstAnalysis) {
      setStep('loading')
      analyser.mutate(data as Parameters<typeof analyser.mutate>[0])
    } else {
      toast('🔔 Analyse en cours...', {
        description: 'Vous recevrez une notification dès que votre analyse sera prête.',
        duration: 4000,
        icon: <Bell size={16} className="text-indigo-500" />,
        action: {
          label: 'Mes biens',
          onClick: () => router.push('/biens'),
        },
      })
      analyser.mutate(data as Parameters<typeof analyser.mutate>[0], { background: true })
      setTimeout(() => router.push('/biens'), 800)
    }
  }

  const formValues = form.getValues()

  const missingField = (name: string) => scrapedMissingFields.includes(name)

  return (
    <>
      {step === 'loading' && <LoadingAnalyse isFirstAnalysis={isFirstAnalysis} />}

      <div className="max-w-lg mx-auto">
        {/* Banner landing → analyse gratuite (friction #4) */}
        {fromLanding && isFirstAnalysis && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 mb-4">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <p className="text-sm text-green-700 dark:text-green-300">
              🎉 Votre première analyse est offerte — sans carte bancaire.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 'confirm' ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2 }}
            >
              <ConfirmationBien
                prix={formValues.prix}
                surface={formValues.surface}
                typeBien={formValues.typeBien}
                ville={formValues.ville}
                codePostal={formValues.codePostal}
                adresse={formValues.adresse}
                nbPieces={formValues.nbPieces}
                dpe={formValues.dpe}
                charges={formValues.charges}
                anneeConstruction={formValues.anneeConstruction}
                onConfirm={onConfirm}
                onModify={() => setStep('form')}
                isPending={analyser.isPending}
              />
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-6">
                <h1 className="text-2xl font-bold tracking-tight">Analyser un bien</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Renseignez les informations du bien pour obtenir votre score ImmoTest.
                </p>
              </div>

              {analyser.isPending && !isFirstAnalysis && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm">
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"
                  />
                  Analyse en cours en arrière-plan…
                </div>
              )}

              <AnimatePresence mode="wait">
                {mode === 'url' ? (
                  <motion.div
                    key="url-mode"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Card className="mb-4">
                      <CardHeader>
                        <CardTitle className="text-base">Importer depuis une annonce</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Collez l'URL d'une annonce SeLoger, LeBonCoin ou PAP.
                          Les informations seront importées automatiquement.
                        </p>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <LinkIcon
                              size={15}
                              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            />
                            <Input
                              type="url"
                              placeholder="https://www.seloger.com/annonces/…"
                              className="pl-9 text-sm"
                              value={urlInput}
                              onChange={(e) => setUrlInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !isScraping) {
                                  e.preventDefault()
                                  handleScrapeSubmit(urlInput)
                                }
                              }}
                              disabled={isScraping}
                            />
                          </div>
                          <Button
                            type="button"
                            onClick={() => handleScrapeSubmit(urlInput)}
                            disabled={!urlInput.trim() || isScraping}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[7rem] shrink-0"
                          >
                            {isScraping ? (
                              <>
                                <Loader2 size={14} className="animate-spin mr-2" />
                                Import…
                              </>
                            ) : (
                              <>
                                <Download size={14} className="mr-2" />
                                Importer
                              </>
                            )}
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>Compatible :</span>
                          {['SeLoger', 'LeBonCoin', 'PAP'].map((s) => (
                            <span key={s} className="px-1.5 py-0.5 bg-muted rounded">{s}</span>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => setMode('manuel')}
                          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                        >
                          Préférez-vous remplir manuellement ?
                        </button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : (
                  <motion.div
                    key="manuel-mode"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    {/* Missing required fields banner */}
                    {scrapedMissingFields.length > 0 && scrapingSource && (
                      <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-200 rounded-xl mb-4">
                        <AlertTriangle size={15} className="text-orange-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-800">
                            Champs requis manquants — import depuis {SOURCE_LABEL[scrapingSource] ?? scrapingSource}
                          </p>
                          <p className="text-xs text-orange-600 mt-0.5">
                            Les champs en orange n'ont pas pu être récupérés automatiquement. Complétez-les avant de lancer l'analyse.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScrapedMissingFields([])}
                          className="text-orange-400 hover:text-orange-600"
                          aria-label="Fermer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Partial import banner */}
                    {scrapingPartial && scrapingSource && (
                      <div className="flex items-start gap-2.5 p-3 bg-orange-50 border border-orange-200 rounded-xl mb-4">
                        <AlertTriangle size={15} className="text-orange-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-orange-800">
                            Import partiel depuis {SOURCE_LABEL[scrapingSource] ?? scrapingSource}
                          </p>
                          <p className="text-xs text-orange-600 mt-0.5">
                            Certains champs n'ont pas pu être récupérés.
                            Vérifiez et complétez les informations manquantes.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setScrapingPartial(false)}
                          className="text-orange-400 hover:text-orange-600"
                          aria-label="Fermer"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}

                    {/* Success badge */}
                    {scrapingSource && !scrapingPartial && scrapedMissingFields.length === 0 && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 mb-3 w-fit">
                        <CheckCircle2 size={12} />
                        Importé depuis {SOURCE_LABEL[scrapingSource] ?? scrapingSource}
                      </div>
                    )}

                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Informations du bien</CardTitle>
                          <button
                            type="button"
                            onClick={() => { setMode('url'); setScrapingSource(null); setScrapingPartial(false); setScrapedMissingFields([]) }}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            Importer une URL
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            <div className="grid grid-cols-2 gap-3">
                              <FormField control={form.control} name="prix" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={cn(missingField('prix') && 'text-orange-600')}>
                                    Prix (€){missingField('prix') && ' *'}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="250000"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                      className={cn(missingField('prix') && 'border-orange-400 focus-visible:ring-orange-400/30')}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="surface" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={cn(missingField('surface') && 'text-orange-600')}>
                                    Surface (m²){missingField('surface') && ' *'}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="65"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                      className={cn(missingField('surface') && 'border-orange-400 focus-visible:ring-orange-400/30')}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>

                            <FormField control={form.control} name="typeBien" render={({ field }) => (
                              <FormItem>
                                <FormLabel className={cn(missingField('typeBien') && 'text-orange-600')}>
                                  Type de bien{missingField('typeBien') && ' *'}
                                </FormLabel>
                                <FormControl>
                                  <div className={cn('flex gap-2 p-0.5 rounded-lg', missingField('typeBien') && 'ring-2 ring-orange-300')}>
                                    {(['APPARTEMENT', 'MAISON', 'STUDIO'] as const).map((type) => (
                                      <button
                                        key={type}
                                        type="button"
                                        onClick={() => field.onChange(type)}
                                        className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                                          field.value === type
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : 'border-border text-muted-foreground hover:border-indigo-300'
                                        }`}
                                      >
                                        {type.charAt(0) + type.slice(1).toLowerCase()}
                                      </button>
                                    ))}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-3">
                              <FormField control={form.control} name="ville" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={cn(missingField('ville') && 'text-orange-600')}>
                                    Ville{missingField('ville') && ' *'}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Paris"
                                      {...field}
                                      className={cn(missingField('ville') && 'border-orange-400 focus-visible:ring-orange-400/30')}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="codePostal" render={({ field }) => (
                                <FormItem>
                                  <FormLabel className={cn(missingField('codePostal') && 'text-orange-600')}>
                                    Code postal{missingField('codePostal') && ' *'}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="75001"
                                      maxLength={5}
                                      {...field}
                                      className={cn(missingField('codePostal') && 'border-orange-400 focus-visible:ring-orange-400/30')}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>

                            <FormField control={form.control} name="adresse" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Adresse <span className="text-muted-foreground font-normal">(optionnel)</span></FormLabel>
                                <FormControl><Input placeholder="12 rue de la Paix" {...field} value={field.value ?? ''} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <div className="grid grid-cols-2 gap-3">
                              <FormField control={form.control} name="nbPieces" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Pièces</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="3"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="dpe" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>DPE</FormLabel>
                                  <FormControl>
                                    <select
                                      {...field}
                                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    >
                                      <option value="">—</option>
                                      {['A','B','C','D','E','F','G'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </FormControl>
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="charges" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Charges €/mois</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="200"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                              <FormField control={form.control} name="anneeConstruction" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Année construction</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="1990"
                                      {...field}
                                      value={field.value ?? ''}
                                      onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )} />
                            </div>

                            {analyser.isError && (
                              <p className="text-sm text-destructive">
                                {(() => {
                                  const err = analyser.error as { response?: { data?: { error?: { message?: string } } } }
                                  return err?.response?.data?.error?.message ?? "Une erreur s'est produite"
                                })()}
                              </p>
                            )}

                            <Button
                              type="submit"
                              className="w-full bg-indigo-600 hover:bg-indigo-700"
                              size="lg"
                              disabled={analyser.isPending}
                            >
                              Analyser ce bien
                            </Button>
                          </form>
                        </Form>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog open={showUpsell} onOpenChange={setShowUpsell}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Analyse gratuite utilisée</DialogTitle>
            <DialogDescription>
              Vous avez déjà utilisé votre analyse gratuite. Passez à l'offre premium pour des analyses illimitées.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-3">
            <ul className="text-sm space-y-1.5 text-muted-foreground">
              <li>✅ Analyses illimitées</li>
              <li>✅ Rapports PDF téléchargeables</li>
              <li>✅ Score ImmoTest détaillé</li>
            </ul>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" asChild>
              <Link href="/profil">Voir les tarifs — 29 €</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function AnalyserPage() {
  return (
    <Suspense fallback={null}>
      <AnalyserContent />
    </Suspense>
  )
}
