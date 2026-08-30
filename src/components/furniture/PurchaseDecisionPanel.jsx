import { useState } from 'react'
import { runPurchaseDecision } from '../../decision/purchase/runPurchaseDecision.js'

const EMPTY_FORM = Object.freeze({
  needStrength: '', usageFrequency: '', substituteAvailable: '', substituteAdequacy: '',
  frictionFrequency: '', frictionSeverity: '', budget: '', stayMonths: '',
  moveCertainty: '', futureReuseProbability: '', returnable: '', trialAvailable: '',
})

const DECISION_COPY = {
  BUY: { title: '建议购买', className: 'buy' },
  WAIT: { title: '建议等等', className: 'wait' },
  DONT_BUY: { title: '不建议购买', className: 'dont-buy' },
}

const nullableNumber = (value) => value === '' ? null : Number(value)
const nullableBoolean = (value) => value === '' ? null : value === 'true'
const productNumber = (value) => value === '' || value === null || value === undefined ? null : Number(value)

function SelectField({ label, value, onChange, children }) {
  return <label className="purchase-field"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="">未填写</option>{children}</select></label>
}

function Result({ result }) {
  if (!result) return null
  if (result.status === 'MISSING_INFORMATION') return <div className="purchase-result wait"><strong>还需要补充一些信息</strong><ul>{result.missingInformation.map((item) => <li key={item.field}>{item.label}：{item.reason}</li>)}</ul></div>
  if (result.status === 'INVALID_INPUT') return <div className="purchase-result error"><strong>输入暂时无法用于决策</strong><p>请检查数字与选项后重试。</p></div>
  if (result.status === 'INSUFFICIENT_EVIDENCE') return <div className="purchase-result wait"><strong>还需要补充一些信息</strong><p>现有事实还没有形成明确建议。请补充实际需求、替代方案和退货条件；系统不会用假设值代替。</p></div>
  if (result.status === 'AGENT_FAILED') return <div className="purchase-result error"><strong>暂时无法生成建议</strong><p>复杂权衡服务未返回可验证结果。本次不会生成假的购买结论，请稍后重试。</p></div>
  if (result.status !== 'RESOLVED') return null

  const output = result.agentOutput
  const decision = output?.decision ?? result.resolverResult?.decision
  const copy = DECISION_COPY[decision]
  if (!copy) return null
  const evidenceReasons = result.evidence.filter((item) => result.resolverResult?.rationaleRuleIds?.includes(item.ruleId)).map((item) => item.reason)
  const reasons = output?.primaryReasons?.length ? output.primaryReasons : evidenceReasons
  const tradeoffs = output?.tradeoffs ?? []
  return <div className={`purchase-result ${copy.className}`}><span>购买建议</span><strong>{copy.title}</strong>{output?.confidence && <small>置信度：{{ HIGH: '高', MEDIUM: '中', LOW: '低' }[output.confidence]}</small>}<h4>为什么</h4><ul>{[...reasons, ...tradeoffs].slice(0, 4).map((reason, index) => <li key={`${index}-${reason}`}>{reason}</li>)}</ul>{decision === 'WAIT' && output?.nextAction && <p>下一步：{typeof output.nextAction === 'string' ? output.nextAction : JSON.stringify(output.nextAction)}</p>}</div>
}

export default function PurchaseDecisionPanel({ furniture, roomDocument, placement, spatialAnalysis }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [profile, setProfile] = useState({ budgetCaution: 'MEDIUM', spaceSensitivity: 'MEDIUM', moveLightnessPreference: 'MEDIUM', aestheticWeight: 'MEDIUM' })
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const change = (key, value) => { setForm((current) => ({ ...current, [key]: value })); setResult(null) }

  const decide = async () => {
    setRunning(true)
    setResult(null)
    const next = await runPurchaseDecision({
      furniture, roomDocument, placement, spatialAnalysis,
      productFacts: { priceCny: productNumber(furniture.product?.price), returnable: nullableBoolean(form.returnable), trialAvailable: nullableBoolean(form.trialAvailable) },
      userSituation: {
        needStrength: form.needStrength || null, usageFrequency: form.usageFrequency || null,
        substituteAvailable: nullableBoolean(form.substituteAvailable), substituteAdequacy: form.substituteAdequacy || null,
        frictionFrequency: form.frictionFrequency || null, frictionSeverity: form.frictionSeverity || null,
      },
      userProfile: profile,
      overrides: {
        economicsContext: { availableFurnitureBudgetCny: nullableNumber(form.budget) },
        lifecycleContext: { expectedStayMonths: nullableNumber(form.stayMonths), moveCertainty: form.moveCertainty || null, futureReuseProbability: form.futureReuseProbability || null },
      },
    })
    setResult(next)
    setRunning(false)
  }

  const facts = spatialAnalysis?.byFurnitureId?.[furniture.id]
  return <section className="purchase-decision-panel">
    <button className="purchase-decision-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>购买决策 <span>{open ? '收起' : '开始'}</span></button>
    {open && <div className="purchase-decision-body">
      <p className="purchase-intro">基于这件心愿家具的真实信息与空间试摆结果生成建议。建议不会自动购买，也不会改变家具状态。</p>
      <div className="purchase-known-facts"><span>尺寸（只读）<strong>{Math.round(furniture.physical.dimensionsM.width * 100)} × {Math.round(furniture.physical.dimensionsM.depth * 100)} × {Math.round(furniture.physical.dimensionsM.height * 100)} cm</strong></span><span>商品价格<strong>{furniture.product?.price !== '' && furniture.product?.price != null ? `¥${furniture.product.price}` : '未填写'}</strong></span><span>空间试摆<strong>{placement ? (facts?.outOfBounds || facts?.collisionDetected ? '存在碰撞或越界' : '未发现碰撞或越界') : '尚未试摆'}</strong></span></div>
      <div className="purchase-form-grid">
        <SelectField label="实际需求强度" value={form.needStrength} onChange={(value) => change('needStrength', value)}><option value="LOW">低</option><option value="MEDIUM">中</option><option value="HIGH">高</option></SelectField>
        <SelectField label="预计使用频率" value={form.usageFrequency} onChange={(value) => change('usageFrequency', value)}><option value="RARELY">很少</option><option value="MONTHLY">每月</option><option value="WEEKLY">每周</option><option value="DAILY">每天</option></SelectField>
        <SelectField label="有可用替代品吗" value={form.substituteAvailable} onChange={(value) => change('substituteAvailable', value)}><option value="true">有</option><option value="false">没有</option></SelectField>
        {form.substituteAvailable === 'true' && <SelectField label="替代品够用吗" value={form.substituteAdequacy} onChange={(value) => change('substituteAdequacy', value)}><option value="LOW">不太够用</option><option value="MEDIUM">基本够用</option><option value="HIGH">很够用</option></SelectField>}
        <label className="purchase-field"><span>家具预算（元）</span><input type="number" min="0" value={form.budget} placeholder="未填写" onChange={(event) => change('budget', event.target.value)} /></label>
        <label className="purchase-field"><span>预计还会住（月）</span><input type="number" min="0" value={form.stayMonths} placeholder="未填写" onChange={(event) => change('stayMonths', event.target.value)} /></label>
        <SelectField label="近期搬家可能性" value={form.moveCertainty} onChange={(value) => change('moveCertainty', value)}><option value="LOW">低</option><option value="MEDIUM">中</option><option value="HIGH">高</option></SelectField>
        <SelectField label="以后继续使用概率" value={form.futureReuseProbability} onChange={(value) => change('futureReuseProbability', value)}><option value="LOW">低</option><option value="MEDIUM">中</option><option value="HIGH">高</option></SelectField>
        <SelectField label="是否可退货" value={form.returnable} onChange={(value) => change('returnable', value)}><option value="true">可退货</option><option value="false">不可退货</option></SelectField>
        <SelectField label="是否支持试用" value={form.trialAvailable} onChange={(value) => change('trialAvailable', value)}><option value="true">支持</option><option value="false">不支持</option></SelectField>
      </div>
      <details className="purchase-preferences"><summary>我的购买偏好</summary><div className="purchase-form-grid">{[['budgetCaution', '预算谨慎程度'], ['spaceSensitivity', '空间敏感程度'], ['moveLightnessPreference', '轻装搬家偏好'], ['aestheticWeight', '审美重视程度']].map(([key, label]) => <SelectField key={key} label={label} value={profile[key]} onChange={(value) => { setProfile((current) => ({ ...current, [key]: value })); setResult(null) }}><option value="LOW">低</option><option value="MEDIUM">中</option><option value="HIGH">高</option></SelectField>)}</div></details>
      <button className="purchase-submit" type="button" disabled={running} onClick={decide}>{running ? '正在生成…' : '生成购买建议'}</button>
      <Result result={result} />
    </div>}
  </section>
}
