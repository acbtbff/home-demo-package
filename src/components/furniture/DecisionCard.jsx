import { useMemo, useRef, useState } from 'react'
import { collectDecisionReasons, collectDecisionTradeoffs, formatConfidenceLabel, formatDecisionLabel, formatNextAction, formatSourceLabel, getDecisionType, DECISION_TYPE_LABELS } from './decisionDisplay.js'

const sessionResults = new Map()

function readableMissing(item) {
  if (typeof item === 'string') return item
  return item?.label || item?.reason || null
}

export default function DecisionCard({ furniture, placement, roomDocument, spatialAnalysis, userProfile = {}, spatialFacts = null }) {
  const decisionType = getDecisionType(furniture)
  const cacheKey = `${furniture?.id ?? 'unknown'}:${decisionType}`
  const [result, setResult] = useState(() => sessionResults.get(cacheKey) ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const activeRequest = useRef(null)

  const reasons = useMemo(() => collectDecisionReasons(result ?? {}), [result])
  const tradeoffs = useMemo(() => collectDecisionTradeoffs(result ?? {}), [result])
  const decisionTypeLabel = DECISION_TYPE_LABELS[decisionType]
  const buttonLabel = decisionType === 'MOVE' ? '获取搬家建议' : '获取购买建议'

  const evaluate = async () => {
    if (loading || sessionResults.has(cacheKey) || activeRequest.current) return
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    activeRequest.current = controller
    try {
      const response = await fetch('/api/decision/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decisionType, furniture, placement, roomDocument, spatialAnalysis, userProfile, spatialFacts }),
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('decision request failed')
      const payload = await response.json()
      sessionResults.set(cacheKey, payload)
      setResult(payload)
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') setError('暂时无法生成建议，请稍后重试。')
    } finally {
      activeRequest.current = null
      setLoading(false)
    }
  }

  const reset = () => {
    sessionResults.delete(cacheKey)
    setResult(null)
    setError(null)
  }

  return (
    <section className="decision-card" aria-label="家具决策建议">
      <div className="decision-card-heading">
        <div>
          <span className="decision-card-eyebrow">DECISION</span>
          <h3>{decisionTypeLabel}</h3>
        </div>
        {result?.source && <span className="decision-source">{formatSourceLabel(result.source)}</span>}
      </div>
      {!result && !loading && !error && <p className="decision-card-hint">基于空间、家具状态和你的偏好生成建议。</p>}
      {loading && <p className="decision-card-status">正在分析…</p>}
      {error && <p className="decision-card-error" role="alert">{error}</p>}
      {result && !loading && (
        <div className="decision-card-result">
          <p className="decision-main-label">{result.resolutionStatus === 'INSUFFICIENT_EVIDENCE' ? '暂时无法判断' : result.resolutionStatus === 'INELIGIBLE' ? '该家具不属于你的搬家决策范围' : formatDecisionLabel(result.decision)}</p>
          {formatConfidenceLabel(result.confidence) && <span className="decision-confidence">{formatConfidenceLabel(result.confidence)}</span>}
          {reasons.length > 0 && <div className="decision-detail-block"><strong>主要依据</strong><ul>{reasons.map((reason, index) => <li key={`${reason}-${index}`}>{reason}</li>)}</ul></div>}
          {tradeoffs.length > 0 && <div className="decision-detail-block decision-tradeoffs"><strong>同时需要考虑</strong><ul>{tradeoffs.map((tradeoff, index) => <li key={`${tradeoff}-${index}`}>{tradeoff}</li>)}</ul></div>}
          {Array.isArray(result.missingInformation) && result.missingInformation.length > 0 && <div className="decision-detail-block"><strong>还需要确认</strong><ul>{result.missingInformation.map((item, index) => { const text = readableMissing(item); return text ? <li key={`${text}-${index}`}>{text}</li> : null })}</ul></div>}
          {result.resolutionStatus === 'INSUFFICIENT_EVIDENCE' && result.unresolvedReason && <p className="decision-unresolved">{result.unresolvedReason}</p>}
          {formatNextAction(result.nextAction) && <p className="decision-next-action"><strong>下一步建议</strong>{formatNextAction(result.nextAction)}</p>}
          {result.source === 'INELIGIBLE' && <p className="decision-unresolved">该家具不属于你的搬家决策范围。</p>}
          <button type="button" className="decision-retry" onClick={reset}>重新评估</button>
        </div>
      )}
      {!result && <button type="button" className="decision-action" onClick={evaluate} disabled={loading}>{loading ? '正在分析…' : buttonLabel}</button>}
    </section>
  )
}
