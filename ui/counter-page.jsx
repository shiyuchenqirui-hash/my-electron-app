import { LabLayout } from './lab-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'

export function CounterPage ({ value }) {
  return (
    <LabLayout section="实验索引" title="桌面实验台" description="从一个窗口、一条消息到一份 Session。每次改变一个条件，观察真实的运行结果。">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Card className="border-primary/25" aria-label="Menu Counter">
          <CardHeader>
            <CardDescription className="font-mono text-xs tracking-wider">01 / IPC COUNTER</CardDescription>
            <CardTitle>Main 与 Renderer 的消息往返</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Current value</p>
            <strong id="counter" className="block py-5 text-8xl font-medium tabular-nums tracking-tighter text-primary">{value}</strong>
            <p className="text-sm leading-7 text-muted-foreground">顶部菜单 <code>Counter → Increment / Decrement</code>，同时观察页面数字与 Main 终端输出。</p>
          </CardContent>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader><CardDescription className="font-mono text-xs">02 / WINDOW & NAVIGATION</CardDescription><CardTitle>窗口与导航</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground"><p>模态窗口、加载事件与导航安全边界。</p><p className="font-mono text-xs text-primary">Window → Open Settings</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardDescription className="font-mono text-xs">03 / BROWSER SESSION</CardDescription><CardTitle>共享与隔离</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-muted-foreground"><p>两个独立窗口，对照同一枚 Cookie。A、B 自动左右排列。</p><p className="font-mono text-xs text-primary">Session → Open Shared Windows / Open Isolated Windows</p></CardContent>
          </Card>
        </div>
      </div>
      <p className="mt-6 text-sm text-muted-foreground">通过顶部应用菜单进入实验。复现步骤与结果保存在仓库 docs/implementation/。</p>
    </LabLayout>
  )
}
