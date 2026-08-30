import { useMemo, useRef, useState } from 'react'
import { evaluateMoveDecision } from '../../decision/orchestration/furnitureDecisionOrchestrator.js'
import { createHttpAgentProvider } from '../../decision/agent/providers/httpAgentProvider.js'
import { collectDecisionReasons, collectDecisionTradeoffs, formatConfidenceLabel, formatDecisionLabel, formatNextAction, formatSourceLabel } from './decisionDisplay.js'

const UNKNOWN = ''
const toNullable = (value) => value === UNKNOWN ? null : value
const toNullableBoolean = (value) => value === UNKNOWN ? null : value === 'YES'

function SelectField({ label, value, onChange, children }) {
  return <label className="decision-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select></label>
}

function sizeClassFor(furniture) {
  const dimensions = furniture?.physical?.dimensionsM ?? {}
  const footprint = (dimensions.width ?? 0) * (dimensions.depth ?? 0)
  if (footprint >= 1.5) return 'EXTRA_LARGE'
  if (footprint >= 0.8) return 'LARGE'
  if (footprint >= 0.3) return 'MEDIUM'
  return 'SMALL'
}

export default function DecisionCard({ furniture, placement, roomDocument, spatialAnalysis, userProfile = {} }) {
  const [form, setForm] = useState({ usageFrequency: UNKNOWN, expectedFutureUse: UNKNOWN, substituteAvailable: UNKNOWN, substituteAdequacy: UNKNOWN, physicalFit: UNKNOWN, handlingBurden: UNKNOWN, sentimentalAttachment: false })
  const [result, setResult] = useState(null)
  const [phase, setPhase] = useState('IDLE')
  const [error, setError] = useState(null)
  const activeRequest = useRef(false)
  const reasons = useMemo(() => collectDecisionReasons(result ?? {}), [result])
  const tradeoffs = useMemo(() => collectDecisionTradeoffs(result ?? {}), [result])
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const evaluate = async () => {
    if (activeRequest.current) return
    activeRequest.current = true
    setPhase('RULES')
    setError(null)
    setResult(null)
    try {
      const agentProvider = createHttpAgentProvider({ onRequest: () => setPhase('AGENT') })
      const nextResult = await evaluateMoveDecision({
        furniture, placement, roomDocument, spatialAnalysis, userProfile,
        userContext: {
          usageFrequency: toNullable(form.usageFrequency), expectedFutureUse: toNullable(form.expectedFutureUse),
          substituteAvailable: toNullableBoolean(form.substituteAvailable), substituteAdequacy: toNullable(form.substituteAdequacy),
        },
        logisticsContext: {
          sizeClass: sizeClassFor(furniture), handlingBurden: toNullable(form.handlingBurden), movingBurdenLevel: toNullable(form.handlingBurden),
          source: form.handlingBurden ? 'ESTIMATED' : 'UNKNOWN',
        },
        overrides: { furniture: { sentimentalAttachment: form.sentimentalAttachment ? true : null }, newHomeContext: { physicalFit: toNullable(form.physicalFit) } },
        agentProvider,
      })
      setResult(nextResult)
      if (nextResult.source === 'AGENT_ERROR') setError('AI 决策暂时不可用。规则分析结果仍保留在下方。')
    } catch {
      setError('AI 决策暂时不可用。请稍后重试。')
    } finally {
      activeRequest.current = false
      setPhase('IDLE')
    }
  }

  return (
    <section className="decision-card" aria-label="AI 家具决策">
      <div className="decision-card-heading"><div><span className="decision-card-eyebrow">AI 决策</span><h3>{furniture?.name ?? '这件家具'} · 搬家决策</h3></div>{result?.source && <span className="decision-source">{formatSourceLabel(result.source)}</span>}</div>
      {!result && <div className="decision-form">
        <SelectField label="使用频率" value={form.usageFrequency} onChange={(value) => update('usageFrequency', value)}><option value="">未确认</option><option value="HIGH">高</option><option value="LOW">低</option></SelectField>
        <SelectField label="未来使用需求" value={form.expectedFutureUse} onChange={(value) => update('expectedFutureUse', value)}><option value="">未确认</option><option value="HIGH">高</option><option value="LOW">低</option></SelectField>
        <SelectField label="新家已有替代品" value={form.substituteAvailable} onChange={(value) => update('substituteAvailable', value)}><option value="">不确定</option><option value="YES">有</option><option value="NO">没有</option></SelectField>
        <SelectField label="替代品够用吗" value={form.substituteAdequacy} onChange={(value) => update('substituteAdequacy', value)}><option value="">不确定</option><option value="HIGH">够用</option><option value="LOW">不够用</option></SelectField>
        <SelectField label="新家是否放得下" value={form.physicalFit} onChange={(value) => update('physicalFit', value)}><option value="">不确定</option><option value="POSSIBLE">放得下</option><option value="IMPOSSIBLE">放不下</option></SelectField>
        <SelectField label="搬运负担" value={form.handlingBurden} onChange={(value) => update('handlingBurden', value)}><option value="">未确认</option><option value="LOW">低</option><option value="MEDIUM">中</option><option value="HIGH">高</option><option value="VERY_HIGH">很高</option></SelectField>
        <label className="decision-checkbox"><input type="checkbox" checked={form.sentimentalAttachment} onChange={(event) => update('sentimentalAttachment', event.target.checked)} /><span>这件家具有特殊情感价值</span></label>
      </div>}
      {phase === 'RULES' && <p className="decision-card-status">正在运行搬家规则…</p>}
      {phase === 'AGENT' && <p className="decision-card-status">存在多个因素冲突，正在进行综合判断…</p>}
      {error && <p className="decision-card-error" role="alert">{error}</p>}
      {result && <div className="decision-card-result">
        <p className="decision-main-label">{result.resolutionStatus === 'INSUFFICIENT_EVIDENCE' ? '暂时无法判断' : result.resolutionStatus === 'INELIGIBLE' ? '不属于搬家决策范围' : result.source === 'AGENT_ERROR' ? '规则发现冲突，AI 暂时不可用' : formatDecisionLabel(result.decision)}</p>
        {result.source !== 'AGENT' && result.decision && <p className="decision-rule-note">由明确规则直接判断，未调用 AI。</p>}
        {formatConfidenceLabel(result.confidence) && <span className="decision-confidence">{formatConfidenceLabel(result.confidence)}</span>}
        {reasons.length > 0 && <div className="decision-detail-block"><strong>主要依据</strong><ul>{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></div>}
        {tradeoffs.length > 0 && <div className="decision-detail-block decision-tradeoffs"><strong>冲突因素</strong><ul>{tradeoffs.map((tradeoff) => <li key={tradeoff}>{tradeoff}</li>)}</ul></div>}
        {formatNextAction(result.nextAction) && <p className="decision-next-action"><strong>下一步建议</strong>{formatNextAction(result.nextAction)}</p>}
        <button type="button" className="decision-retry" onClick={() => { setResult(null); setError(null) }}>重新评估</button>
      </div>}
      {!result && <button type="button" className="decision-action" onClick={evaluate} disabled={phase !== 'IDLE'}>{phase === 'IDLE' ? '生成搬家建议' : '正在分析…'}</button>}
    </section>
  )
}
