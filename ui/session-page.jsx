import { Button } from './components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { LabLayout } from './lab-layout'

export function SessionPage ({ state, busy, error, onAction }) {
  return (
    <LabLayout section="Session / Cookie" title={state?.window ?? 'Session Lab'} description="先在 A 写入，再到 B 读取。比较同一枚 Cookie 在不同窗口中的结果。">
      <p id="experiment-mode" className="mb-6 text-sm text-muted-foreground">{!state ? '正在读取实验模式……' : state.mode === 'shared'
        ? '第一轮：两个窗口，同一个 partition。'
        : '第二轮：只改变 B 的 partition，观察 Cookie 是否隔离。'}</p>
      <div className="mb-6 flex flex-wrap gap-3" aria-busy={busy}>
        <Button id="write-cookie" disabled={busy} onClick={() => onAction('writeCookie')}>写入测试 Cookie</Button>
        <Button id="read-cookie" variant="outline" disabled={busy} onClick={() => onAction('readCookie')}>读取 Cookie</Button>
        <Button id="remove-cookie" variant="destructive" disabled={busy} onClick={() => onAction('removeCookie')}>删除测试 Cookie</Button>
      </div>
      {error && <p role="alert" className="mb-4 text-sm text-destructive">操作失败：{error}</p>}
      <Card className="border-0 bg-foreground text-background" aria-label="Session 读取结果">
        <CardHeader><CardTitle className="font-mono text-xs tracking-wider">SESSION SNAPSHOT · 读取时快照</CardTitle></CardHeader>
        <CardContent><pre id="result" aria-live="polite" className="whitespace-pre-wrap break-all font-mono text-xs leading-7">{state ? JSON.stringify(state, null, 2) : '正在读取……'}</pre></CardContent>
      </Card>
      <div className="mt-6 space-y-2 text-xs leading-6 text-muted-foreground">
        <p>输出不会自动同步；每次操作完成后，点击另一侧“读取 Cookie”进行对照。</p>
        <p>仅操作 <code>session-lab.example</code> 的 <code>study-cookie</code>，不访问网络。</p>
        <p><code>sameSessionAsPeer</code> 为 null 表示另一个窗口已关闭。</p>
      </div>
    </LabLayout>
  )
}
