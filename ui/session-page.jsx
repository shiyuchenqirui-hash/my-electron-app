import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { Card, CardContent } from './components/ui/card'
import { LabLayout } from './lab-layout'

const actionLabels = { readCookie: '读取完成', writeCookie: '写入完成', removeCookie: '删除完成' }

function SnapshotField ({ label, children, wide = false }) {
  return <div className={`min-w-0 border-l-2 border-primary/25 pl-3 ${wide ? 'col-span-2' : ''}`}>
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="mt-2 break-all font-mono text-sm font-medium">{children}</dd>
  </div>
}

export function SessionPage ({ state, busy, error, activity, onAction }) {
  const isShared = state?.mode === 'shared'
  const relation = !state ? '尚未读取' : state.sameSessionAsPeer === null ? '无对照窗口'
    : state.sameSessionAsPeer ? '共享 Session' : '独立 Session'
  const completedAt = activity ? new Date(activity.completedAt).toLocaleTimeString('zh-CN', { hour12: false }) : null

  return (
    <LabLayout compact section="03 / Browser Session" title={state?.window ?? 'Session Lab'} description="窗口是独立的，数据环境呢？改变 partition，观察同一枚 Cookie 的读写结果。">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p id="experiment-mode" className="text-sm font-medium">{!state ? '等待读取实验模式' : isShared ? '第一轮 / 同一 partition' : '第二轮 / 不同 partition'}</p>
        <Badge id="session-relation" variant={state?.sameSessionAsPeer === true ? 'default' : 'secondary'}>{relation}</Badge>
      </div>
      <Card className="mb-5" aria-label="Session 状态摘要">
        <CardContent>
          <dl className="grid grid-cols-2 gap-5">
            <SnapshotField label="Partition" wide>{state?.partition ?? '—'}</SnapshotField>
            <SnapshotField label="BrowserWindow / WebContents">{state ? `${state.windowId} / ${state.webContentsId}` : '—'}</SnapshotField>
            <SnapshotField label="存储类型">{!state ? '—' : state.persistent ? '持久 Session' : '内存 Session'}</SnapshotField>
          </dl>
          <div className="mt-5 border-t pt-4">
            <p className="mb-2 font-mono text-[11px] tracking-wide text-muted-foreground">COOKIE / study-cookie</p>
            <p id="cookie-value" className="break-all font-mono text-sm leading-6 text-primary">{!state ? '尚未读取' : state.cookie ?? '未设置（null）'}</p>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2" aria-busy={busy}>
        <Button id="write-cookie" disabled={busy} onClick={() => onAction('writeCookie')}>写入测试 Cookie</Button>
        <Button id="read-cookie" variant="outline" disabled={busy} onClick={() => onAction('readCookie')}>读取 Cookie</Button>
        <Button id="remove-cookie" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={() => onAction('removeCookie')}>删除测试 Cookie</Button>
      </div>
      <p id="action-status" role="status" className="my-3 min-h-5 text-xs text-muted-foreground">{busy ? '操作中，等待 Main 返回……' : error ? (state ? '本次操作失败；仍展示上一次成功快照。' : '本次操作失败；尚无成功快照。') : activity ? `${actionLabels[activity.action]} · ${completedAt} · 仅更新本窗口快照` : '尚无成功快照'}</p>
      {error && <p role="alert" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">操作失败：{error}。可点击“读取 Cookie”重试。</p>}
      {state && <aside className="my-5 border-l-2 border-primary bg-secondary/50 px-4 py-3 text-xs leading-6" aria-label="对照步骤">
        <h2 className="mb-1 font-semibold">先预测，再观察</h2>
        <ol className="list-inside list-decimal">
          <li>{isShared ? '在 A 删除，B 读取，确认清空。' : 'A、B 分别删除，确认两边清空。'}</li>
          <li>A 写入，B 读取：{isShared ? '预期两边值相同。' : '预期 B 仍为空。'}</li>
          <li>{isShared ? 'B 删除，A 再读取：预期为空。' : 'B 写入，再在 A 删除：预期 B 的值不变。'}</li>
        </ol>
        <p className="mt-2 text-muted-foreground">以上是预期，不是自动判定。操作完成后需在另一侧主动读取。</p>
      </aside>}
      <details className="rounded-xl border bg-foreground text-background">
        <summary className="cursor-pointer rounded-xl px-5 py-4 font-mono text-xs tracking-wide focus-visible:outline-2 focus-visible:outline-ring">原始 JSON · 同一次读取快照</summary>
        <pre id="result" className="border-t border-background/20 px-5 py-4 whitespace-pre-wrap break-all font-mono text-xs leading-6">{state ? JSON.stringify(state, null, 2) : '尚无成功快照'}</pre>
      </details>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">仅操作 <code>session-lab.example</code> 的测试 Cookie，不访问网络。关闭窗口不等于清空 Session；切换实验模式前请关闭 A、B。</p>
    </LabLayout>
  )
}
