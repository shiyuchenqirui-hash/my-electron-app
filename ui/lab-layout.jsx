import { Badge } from './components/ui/badge'

export function LabLayout ({ section, title, description, children, compact = false }) {
  return (
    <main className={`mx-auto w-full ${compact ? 'max-w-3xl p-5 sm:p-6' : 'max-w-6xl px-6 py-10 sm:px-10 sm:py-14'}`}>
      <header className="mb-7 border-b pb-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[11px] font-semibold tracking-[0.18em] text-primary">ELECTRON / FIELD NOTES</p>
          <Badge variant="outline">{section}</Badge>
        </div>
        <h1 id="window-title" className={`${compact ? 'text-3xl' : 'text-4xl sm:text-5xl'} font-semibold tracking-tight`}>{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
      </header>
      {children}
      <footer className="mt-8 border-t pt-4 font-mono text-[11px] leading-6 text-muted-foreground">
        LOCAL EXPERIMENT · Main / Preload / Renderer
      </footer>
    </main>
  )
}
