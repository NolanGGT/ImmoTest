import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="font-bold text-lg tracking-tight">
            ImmoTest
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t py-8 mt-8">
        <div className="max-w-2xl mx-auto px-4 flex flex-col gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/mentions-legales" className="text-muted-foreground hover:text-foreground transition-colors">
              Mentions légales
            </Link>
            <Link href="/cgu" className="text-muted-foreground hover:text-foreground transition-colors">
              CGU
            </Link>
            <Link href="/confidentialite" className="text-muted-foreground hover:text-foreground transition-colors">
              Confidentialité
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ImmoTest</p>
        </div>
      </footer>
    </div>
  )
}
