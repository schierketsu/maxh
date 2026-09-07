import type { CompanyProfile, MatchedProgram } from '../types'
import { Panel } from '@maxhub/max-ui'
import { FitText } from './FitText'
import { formatMoney } from '../lib/matching'

interface OpportunitySummaryProps {
  company: CompanyProfile
  matches: MatchedProgram[]
}

export function OpportunitySummary({ company, matches }: OpportunitySummaryProps) {
  const totalPotential = matches.reduce((sum, m) => sum + m.amountPotential, 0)

  return (
    <Panel mode="secondary" className="summary">
      <div className="summary__business">
        <h2>{company.name}</h2>
      </div>
      <FitText text={formatMoney(totalPotential)} min={24} max={88} className="summary__amount" />
    </Panel>
  )
}
