'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Target, BarChart3, TrendingUp, AlertTriangle, Star, DollarSign, BookOpen, Home, Plane } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostMatchAnalysisSection } from './post-match-analysis-section'
import { FactorBreakdown } from './factor-breakdown'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import type { Prediction, OddsMarket, OddsOutcome } from '@/types'

interface ScorePrediction {
  score: string
  probability: number
}

// Factor metadata for display (6-factor system A-F matching NEW_AI_AGENT_PROMPT.txt)
const FACTOR_INFO: Record<string, { name: string; weight: string }> = {
  // Current 6-factor system (totals 100%)
  A_base_strength: { name: 'Base Strength', weight: '24%' },
  B_form: { name: 'Recent Form', weight: '22%' },
  C_key_players: { name: 'Key Players', weight: '11%' },
  D_tactical: { name: 'Tactical Matchup', weight: '20%' },
  E_table_position: { name: 'Table Position', weight: '13%' },
  F_h2h: { name: 'Head-to-Head', weight: '10%' },
  // Legacy factors for backward compatibility with older predictions
  C_squad: { name: 'Squad', weight: '14%' },
  D_load: { name: 'Load & Calendar', weight: '10%' },
  E_tactical: { name: 'Tactical', weight: '12%' },
  F_motivation: { name: 'Motivation', weight: '10%' },
  G_referee: { name: 'Referee', weight: '5%' },
  H_stadium_weather: { name: 'Stadium/Weather', weight: '8%' },
  I_h2h: { name: 'H2H', weight: '7%' },
}

// Get score color based on value
const getScoreColor = (score: number) => {
  if (score >= 70) return 'text-green-500'
  if (score >= 50) return 'text-yellow-500'
  if (score >= 30) return 'text-orange-500'
  return 'text-red-500'
}

const getScoreBgColor = (score: number) => {
  if (score >= 70) return 'bg-green-500/10 border-green-500/20'
  if (score >= 50) return 'bg-yellow-500/10 border-yellow-500/20'
  if (score >= 30) return 'bg-orange-500/10 border-orange-500/20'
  return 'bg-red-500/10 border-red-500/20'
}

// Check if actual result matches prediction (including compound predictions like X2, 1X, 12)
const isPredictionCorrect = (actual: '1' | 'X' | '2' | null, predicted: string | null): boolean => {
  if (!actual || !predicted) return false
  // Direct match
  if (actual === predicted) return true
  // Compound predictions: X2 matches X or 2, 1X matches 1 or X, 12 matches 1 or 2
  if (predicted.includes(actual)) return true
  return false
}

interface RecentResultCardProps {
  fixture: any
}

export function RecentResultCard({ fixture }: RecentResultCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [showFactors, setShowFactors] = useState(false)
  const [showScores, setShowScores] = useState(false)
  const [showKeyRiskFactors, setShowKeyRiskFactors] = useState(false)
  const [showHomeNews, setShowHomeNews] = useState(false)
  const [showAwayNews, setShowAwayNews] = useState(false)
  const [showOdds, setShowOdds] = useState(false)

  // Handle both array and object formats from Supabase
  // Sort by updated_at DESC to ensure we always show the most recent prediction
  const prediction = Array.isArray(fixture.prediction)
    ? fixture.prediction.slice().sort((a: Prediction, b: Prediction) =>
        new Date(b.updated_at || b.created_at || 0).getTime() -
        new Date(a.updated_at || a.created_at || 0).getTime()
      )[0]
    : fixture.prediction

  // Get score predictions from prediction data - sort by probability descending and exclude "other"
  const scorePredictons: ScorePrediction[] = (prediction?.score_predictions || [])
    .slice()
    .filter((sp: ScorePrediction) => sp.score?.toLowerCase() !== 'other')
    .sort((a: ScorePrediction, b: ScorePrediction) => (b.probability || 0) - (a.probability || 0))

  // Determine actual result from goals
  const getActualResult = (): '1' | 'X' | '2' | null => {
    if (fixture.goals_home === null || fixture.goals_away === null) return null
    if (fixture.goals_home > fixture.goals_away) return '1'
    if (fixture.goals_home < fixture.goals_away) return '2'
    return 'X'
  }

  const actualResult = getActualResult()
  const predictedResult = prediction?.prediction_result
  const wasCorrect = isPredictionCorrect(actualResult, predictedResult)

  // Check score prediction accuracy
  const actualScore = `${fixture.goals_home}-${fixture.goals_away}`
  const predictedScore = prediction?.most_likely_score
  const scoreCorrect = predictedScore === actualScore

  // BTTS check
  const actualBtts = fixture.goals_home > 0 && fixture.goals_away > 0
  const predictedBtts = prediction?.btts === 'Yes' || prediction?.factors?.btts === 'Yes'
  const bttsCorrect = actualBtts === predictedBtts

  // Over/Under 2.5 check
  const totalGoals = (fixture.goals_home || 0) + (fixture.goals_away || 0)
  const actualOverUnder = totalGoals > 2.5 ? 'Over' : 'Under'
  const predictedOverUnder = prediction?.over_under_2_5 || prediction?.factors?.over_under
  const overUnderCorrect = actualOverUnder === predictedOverUnder

  const getResultBadgeColor = (result: string | null) => {
    switch (result) {
      case '1': return 'bg-home text-white'
      case 'X': return 'bg-draw text-white'
      case '2': return 'bg-away text-white'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  // Use certainty_score (AI's confidence) not overall_index (factor points)
  const confidence = prediction?.certainty_score || prediction?.confidence_pct || 0

  // Odds handling (same as PredictionCard)
  const odds: OddsMarket[] = fixture.odds || []
  const h2hOdds = odds.filter(o => o.bet_type === 'h2h')
  const totalOdds = odds.filter(o => o.bet_type === 'totals')
  const spreadOdds = odds.filter(o => o.bet_type === 'spreads')
  const hasOdds = odds.length > 0

  const homeTeamName = fixture.home_team?.name?.toLowerCase() || ''
  const awayTeamName = fixture.away_team?.name?.toLowerCase() || ''

  const findOutcome = (values: OddsOutcome[] | undefined, type: 'home' | 'draw' | 'away'): OddsOutcome | undefined => {
    if (!values) return undefined
    if (type === 'draw') {
      return values.find(v => v.name?.toLowerCase() === 'draw')
    }
    if (type === 'home') {
      return values.find(v => {
        const name = v.name?.toLowerCase() || ''
        if (name === 'draw') return false
        return name.includes(homeTeamName.split(' ')[0]) || homeTeamName.includes(name.split(' ')[0])
      }) || values.find(v => v.name?.toLowerCase() !== 'draw' && !v.name?.toLowerCase().includes(awayTeamName.split(' ')[0]))
    }
    return values.find(v => {
      const name = v.name?.toLowerCase() || ''
      if (name === 'draw') return false
      return name.includes(awayTeamName.split(' ')[0]) || awayTeamName.includes(name.split(' ')[0])
    }) || values.find(v => v.name?.toLowerCase() !== 'draw' && !v.name?.toLowerCase().includes(homeTeamName.split(' ')[0]))
  }

  const getBestOdds = (oddsArr: OddsMarket[], type: 'home' | 'draw' | 'away') => {
    let best = { price: 0, bookmaker: '' }
    oddsArr.forEach(o => {
      const val = findOutcome(o.values, type)
      if (val && val.price > best.price) {
        best = { price: val.price, bookmaker: o.bookmaker }
      }
    })
    return best
  }

  const bestHome = h2hOdds.length > 0 ? getBestOdds(h2hOdds, 'home') : { price: 0, bookmaker: '' }
  const bestDraw = h2hOdds.length > 0 ? getBestOdds(h2hOdds, 'draw') : { price: 0, bookmaker: '' }
  const bestAway = h2hOdds.length > 0 ? getBestOdds(h2hOdds, 'away') : { price: 0, bookmaker: '' }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  // Handle card click - navigate only if not clicking an interactive element
  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button, input, a, [role="button"]')) {
      return
    }
    router.push(`/matches/${fixture.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className="bg-card border border-border rounded-lg overflow-hidden transition-colors hover:border-primary/50 cursor-pointer"
    >
      {/* Match Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground">
            {fixture.round || 'Premier League'}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(fixture.match_date).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}
          </span>
        </div>

        {/* Teams and Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Home Team */}
          <div className="flex-1 text-center">
            {fixture.home_team?.logo && (
              <img
                src={fixture.home_team.logo}
                alt={fixture.home_team.name}
                className="w-12 h-12 mx-auto mb-2 object-contain"
              />
            )}
            <p className={cn(
              "font-medium text-sm",
              actualResult === '1' && "text-green-500"
            )}>
              {fixture.home_team?.name || 'TBD'}
            </p>
          </div>

          {/* Final Score */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">
              {fixture.goals_home} - {fixture.goals_away}
            </div>
            <span className="text-xs text-muted-foreground mt-1">FT</span>
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center">
            {fixture.away_team?.logo && (
              <img
                src={fixture.away_team.logo}
                alt={fixture.away_team.name}
                className="w-12 h-12 mx-auto mb-2 object-contain"
              />
            )}
            <p className={cn(
              "font-medium text-sm",
              actualResult === '2' && "text-green-500"
            )}>
              {fixture.away_team?.name || 'TBD'}
            </p>
          </div>
        </div>

        {/* Prediction Comparison */}
        {prediction ? (
          <div className="mt-4 space-y-3">
            {/* Main Result Comparison */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Prediction:</span>
                <span className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                  getResultBadgeColor(predictedResult)
                )}>
                  {predictedResult || '?'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({confidence}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {wasCorrect ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  wasCorrect ? "text-green-500" : "text-red-500"
                )}>
                  {wasCorrect ? 'Correct' : 'Wrong'}
                </span>
              </div>
            </div>

            {/* Probability Bars */}
            {prediction.factors && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-8">1</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-home"
                      style={{ width: `${prediction.factors.home_win_pct || prediction.home_win_pct || 0}%` }}
                    />
                  </div>
                  <span className="w-10 text-right">{prediction.factors.home_win_pct || prediction.home_win_pct || 0}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-8">X</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-draw"
                      style={{ width: `${prediction.factors.draw_pct || prediction.draw_pct || 0}%` }}
                    />
                  </div>
                  <span className="w-10 text-right">{prediction.factors.draw_pct || prediction.draw_pct || 0}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-8">2</span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-away"
                      style={{ width: `${prediction.factors.away_win_pct || prediction.away_win_pct || 0}%` }}
                    />
                  </div>
                  <span className="w-10 text-right">{prediction.factors.away_win_pct || prediction.away_win_pct || 0}%</span>
                </div>
              </div>
            )}

            {/* Secondary Predictions */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {/* Score Prediction */}
              {predictedScore && (
                <div className={cn(
                  "p-2 rounded",
                  scoreCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50"
                )}>
                  <p className="text-muted-foreground mb-1">Score</p>
                  <div className="flex items-center justify-center gap-1">
                    <Target className="w-3 h-3" />
                    <span className="font-medium">{predictedScore}</span>
                    {scoreCorrect && <CheckCircle className="w-3 h-3 text-green-500" />}
                  </div>
                </div>
              )}

              {/* O/U 2.5 */}
              {predictedOverUnder && (
                <div className={cn(
                  "p-2 rounded",
                  overUnderCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50"
                )}>
                  <p className="text-muted-foreground mb-1">O/U 2.5</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-medium">{predictedOverUnder}</span>
                    {overUnderCorrect ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
              )}

              {/* BTTS */}
              {(prediction.btts || prediction.factors?.btts) && (
                <div className={cn(
                  "p-2 rounded",
                  bttsCorrect ? "bg-green-500/10 border border-green-500/20" : "bg-muted/50"
                )}>
                  <p className="text-muted-foreground mb-1">BTTS</p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-medium">
                      {prediction.btts || prediction.factors?.btts}
                    </span>
                    {bttsCorrect ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <XCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Value Bet */}
            {(prediction.value_bet || prediction.factors?.value_bet) && (
              <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-500 shrink-0" />
                <span className="font-medium text-green-600">Value Bet: </span>
                <span className="text-foreground">{prediction.value_bet || prediction.factors?.value_bet}</span>
              </div>
            )}

            {/* Score Predictions with Probability Bars - Collapsible */}
            {(scorePredictons.length > 0 || predictedScore) && (
              <div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowScores(!showScores) }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
                >
                  <Target className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">Score Predictions:</span>
                  {predictedScore && (
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded font-medium",
                      scoreCorrect ? "bg-green-500 text-white" : "bg-primary text-primary-foreground"
                    )}>
                      {predictedScore}
                    </span>
                  )}
                  {scoreCorrect && <CheckCircle className="w-3 h-3 text-green-500" />}
                  <ChevronDown className={cn(
                    "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                    showScores && "rotate-180"
                  )} />
                </button>

                {showScores && scorePredictons.length > 0 && (
                  <div className="mt-2 space-y-1.5 p-2 bg-muted/30 rounded-lg">
                    {scorePredictons.map((sp, idx) => (
                      <div key={sp.score} className="flex items-center gap-2 text-xs">
                        <span className={cn(
                          "w-10 font-mono font-medium",
                          actualScore === sp.score && "text-green-500"
                        )}>
                          {sp.score}
                        </span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              actualScore === sp.score ? "bg-green-500" : idx === 0 ? "bg-primary" : "bg-primary/50"
                            )}
                            style={{ width: `${Math.min(sp.probability * 3, 100)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-muted-foreground">{sp.probability}%</span>
                        {actualScore === sp.score && <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />}
                        {idx === 0 && actualScore !== sp.score && <Star className="w-3 h-3 text-yellow-500 shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Key & Risk Factors - Collapsible */}
            {((prediction.key_factors && prediction.key_factors.length > 0) ||
              (prediction.risk_factors && prediction.risk_factors.length > 0)) && (
              <div>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowKeyRiskFactors(!showKeyRiskFactors) }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
                >
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium">Key & Risk Factors</span>
                  <ChevronDown className={cn(
                    "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                    showKeyRiskFactors && "rotate-180"
                  )} />
                </button>

                {showKeyRiskFactors && (
                  <div className="mt-2 space-y-3 p-2 bg-muted/30 rounded-lg">
                    {/* Key Factors */}
                    {prediction.key_factors && prediction.key_factors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium flex items-center gap-1 mb-2">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          Key Factors
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {prediction.key_factors.map((factor: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-500 shrink-0">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risk Factors */}
                    {prediction.risk_factors && prediction.risk_factors.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium flex items-center gap-1 mb-2">
                          <AlertTriangle className="w-3 h-3 text-yellow-500" />
                          Risk Factors
                        </h4>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {prediction.risk_factors.map((factor: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-yellow-500 shrink-0">•</span>
                              <span>{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Historical Learning Adjustments */}
                    {prediction.historical_adjustments?.applied && (
                      <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <h4 className="text-xs font-medium text-purple-500 mb-1 flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          Historical Adjustments
                        </h4>
                        {prediction.historical_adjustments.confidence_adjusted_by !== 0 && (
                          <p className="text-[10px] text-muted-foreground mb-1">
                            Confidence: {prediction.historical_adjustments.confidence_adjusted_by > 0 ? '+' : ''}
                            {prediction.historical_adjustments.confidence_adjusted_by}%
                          </p>
                        )}
                        <p className="text-xs text-foreground">{prediction.historical_adjustments.reason}</p>
                        {prediction.historical_adjustments.factors_adjusted?.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Adjusted: {prediction.historical_adjustments.factors_adjusted.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Expand/Collapse Analysis */}
            {prediction.analysis_text && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded) }}
                className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground py-2"
              >
                {expanded ? 'Hide' : 'Show'} Analysis
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {expanded && prediction.analysis_text && (
              <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                {prediction.analysis_text}
              </div>
            )}

            {/* Factor Breakdown - using shared component, collapsed by default */}
            {prediction.factors && Object.keys(prediction.factors).some(k => k.match(/^[A-I]_/)) && (
              <FactorBreakdown
                factors={prediction.factors}
                overallIndex={prediction.overall_index}
                alwaysExpanded={false}
              />
            )}

            {/* Team News - Collapsible */}
            {(prediction.home_team_news || prediction.away_team_news) && (
              <div className="mt-4 space-y-2">
                {/* Home Team News */}
                {prediction.home_team_news && (
                  <div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowHomeNews(!showHomeNews) }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-home/10 hover:bg-home/20 transition-colors text-left"
                    >
                      <Home className="w-4 h-4 text-home" />
                      <span className="text-xs font-medium">{fixture.home_team?.name || 'Home'} News</span>
                      <ChevronDown className={cn(
                        "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                        showHomeNews && "rotate-180"
                      )} />
                    </button>
                    {showHomeNews && (
                      <div className="mt-1 p-3 bg-muted/30 rounded-lg prose prose-sm dark:prose-invert max-w-none prose-p:text-xs prose-p:text-muted-foreground prose-p:my-1 prose-ul:text-xs prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:my-1 prose-table:text-xs prose-table:w-full prose-th:px-2 prose-th:py-1 prose-th:bg-muted prose-th:text-left prose-th:font-medium prose-td:px-2 prose-td:py-1 prose-td:border-t prose-td:border-border">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{prediction.home_team_news}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}

                {/* Away Team News */}
                {prediction.away_team_news && (
                  <div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAwayNews(!showAwayNews) }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg bg-away/10 hover:bg-away/20 transition-colors text-left"
                    >
                      <Plane className="w-4 h-4 text-away" />
                      <span className="text-xs font-medium">{fixture.away_team?.name || 'Away'} News</span>
                      <ChevronDown className={cn(
                        "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                        showAwayNews && "rotate-180"
                      )} />
                    </button>
                    {showAwayNews && (
                      <div className="mt-1 p-3 bg-muted/30 rounded-lg prose prose-sm dark:prose-invert max-w-none prose-p:text-xs prose-p:text-muted-foreground prose-p:my-1 prose-ul:text-xs prose-ul:my-1 prose-li:my-0 prose-strong:text-foreground prose-headings:text-sm prose-headings:font-medium prose-headings:my-1 prose-table:text-xs prose-table:w-full prose-th:px-2 prose-th:py-1 prose-th:bg-muted prose-th:text-left prose-th:font-medium prose-td:px-2 prose-td:py-1 prose-td:border-t prose-td:border-border">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{prediction.away_team_news}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Betting Odds - Collapsible */}
            {hasOdds && (
              <div className="mt-4">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowOdds(!showOdds) }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors text-left"
                >
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-xs font-medium">Pre-Match Odds:</span>
                  <div className="flex gap-3 text-xs">
                    {bestHome.price > 0 && (
                      <span>1: <strong className="text-foreground">{bestHome.price.toFixed(2)}</strong></span>
                    )}
                    {bestDraw.price > 0 && (
                      <span>X: <strong className="text-foreground">{bestDraw.price.toFixed(2)}</strong></span>
                    )}
                    {bestAway.price > 0 && (
                      <span>2: <strong className="text-foreground">{bestAway.price.toFixed(2)}</strong></span>
                    )}
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 ml-auto text-muted-foreground transition-transform",
                    showOdds && "rotate-180"
                  )} />
                </button>

                {showOdds && (
                  <div className="mt-2 space-y-3 p-3 bg-muted/30 rounded-lg max-h-72 overflow-y-auto">
                    {/* H2H Market */}
                    {h2hOdds.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium mb-2 text-muted-foreground">Match Result (1X2)</h5>
                        <div className="grid grid-cols-4 gap-1 text-xs mb-1 px-1">
                          <span className="text-muted-foreground">Bookmaker</span>
                          <span className="text-center text-muted-foreground">1</span>
                          <span className="text-center text-muted-foreground">X</span>
                          <span className="text-center text-muted-foreground">2</span>
                        </div>
                        <div className="space-y-1">
                          {h2hOdds.map(o => {
                            const homeOdds = findOutcome(o.values, 'home')
                            const drawOdds = findOutcome(o.values, 'draw')
                            const awayOdds = findOutcome(o.values, 'away')
                            return (
                              <div key={o.id} className="grid grid-cols-4 gap-1 text-xs bg-card rounded p-1">
                                <span className="text-muted-foreground text-xs whitespace-normal">{o.bookmaker}</span>
                                <span className={cn(
                                  "text-center font-medium",
                                  homeOdds?.price === bestHome.price && bestHome.price > 0 && "text-green-500"
                                )}>
                                  {homeOdds?.price?.toFixed(2) || '-'}
                                </span>
                                <span className={cn(
                                  "text-center font-medium",
                                  drawOdds?.price === bestDraw.price && bestDraw.price > 0 && "text-green-500"
                                )}>
                                  {drawOdds?.price?.toFixed(2) || '-'}
                                </span>
                                <span className={cn(
                                  "text-center font-medium",
                                  awayOdds?.price === bestAway.price && bestAway.price > 0 && "text-green-500"
                                )}>
                                  {awayOdds?.price?.toFixed(2) || '-'}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Totals Market */}
                    {totalOdds.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium mb-2 text-muted-foreground">Over/Under Goals</h5>
                        <div className="space-y-1">
                          {totalOdds.map(o => {
                            const overOutcome = o.values?.find((v: OddsOutcome) => v.name?.toLowerCase().includes('over'))
                            const underOutcome = o.values?.find((v: OddsOutcome) => v.name?.toLowerCase().includes('under'))
                            return (
                              <div key={o.id} className="flex items-center gap-2 text-xs bg-card rounded p-1">
                                <span className="w-20 text-muted-foreground text-xs whitespace-normal">{o.bookmaker}</span>
                                <span className="flex-1 text-center">
                                  O{(overOutcome as OddsOutcome)?.point || '2.5'}: <strong>{(overOutcome as OddsOutcome)?.price?.toFixed(2) || '-'}</strong>
                                </span>
                                <span className="flex-1 text-center">
                                  U{(underOutcome as OddsOutcome)?.point || '2.5'}: <strong>{(underOutcome as OddsOutcome)?.price?.toFixed(2) || '-'}</strong>
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Spreads Market */}
                    {spreadOdds.length > 0 && (
                      <div>
                        <h5 className="text-xs font-medium mb-2 text-muted-foreground">Asian Handicap</h5>
                        <div className="space-y-1">
                          {spreadOdds.map(o => (
                            <div key={o.id} className="flex items-center gap-2 text-xs bg-card rounded p-1">
                              <span className="w-20 text-muted-foreground text-xs whitespace-normal">{o.bookmaker}</span>
                              {o.values?.slice(0, 2).map((v: OddsOutcome, idx: number) => (
                                <span key={idx} className="flex-1 text-center">
                                  {v.name?.split(' ').pop() || 'Home'} ({v.point?.toFixed(1)}): <strong>{v.price?.toFixed(2)}</strong>
                                </span>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Last updated */}
                    <div className="text-[10px] text-muted-foreground pt-2 border-t border-border/50 flex items-center gap-1">
                      <span>Updated: {formatRelativeTime(odds[0]?.updated_at || new Date().toISOString())}</span>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{h2hOdds.length} bookmaker{h2hOdds.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Post-Match Analysis */}
            <PostMatchAnalysisSection fixtureId={fixture.id} />

            {/* Model info */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Predicted with {prediction.model_used || prediction.model_version || 'AI'}
            </div>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
            No prediction was made for this match
          </div>
        )}
      </div>
    </div>
  )
}
