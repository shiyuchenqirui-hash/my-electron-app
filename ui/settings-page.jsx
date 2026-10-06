import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { LabLayout } from './lab-layout'

const navigationLinks = [
  ['#navigation-section', 'Same-document hash navigation'],
  ['./navigation-target.html', 'Current-window document navigation'],
  ['./navigation-target.html', 'New-window request', '_blank'],
  ['https://www.electronjs.org/zh/docs/latest/', 'Open Electron docs in system browser'],
  ['./index.html', 'Blocked local page'],
  ['https://example.com/', 'Blocked external site']
]

export function SettingsPage ({ onClose, isNavigationTarget }) {
  return (
    <LabLayout compact section="窗口与导航" title={isNavigationTarget ? 'Navigation Target' : 'Settings'} description={isNavigationTarget
      ? 'This is a different document loaded in the existing Settings webContents.'
      : 'This modal window has its own BrowserWindow, webContents, Preload, and Renderer.'}>
      <Button id="close-settings" onClick={onClose} className="mb-5">Close</Button>
      {isNavigationTarget ? <p className="text-sm"><a href="./settings.html">Back to Settings</a></p> : <>
        <Card>
          <CardContent>
            <nav aria-label="Navigation experiment">
              <ul className="divide-y text-sm">
                {navigationLinks.map(([href, label, target]) => <li key={label} className="py-3 first:pt-0 last:pb-0"><a href={href} target={target}>{label}</a></li>)}
              </ul>
            </nav>
          </CardContent>
        </Card>
        <section id="navigation-section" className="mt-6 border-t pt-5">
          <h2 className="font-semibold">Hash navigation target</h2>
          <p className="mt-2 text-sm text-muted-foreground">This section belongs to the current document.</p>
        </section>
      </>}
    </LabLayout>
  )
}
