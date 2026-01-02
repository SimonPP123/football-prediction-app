import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLeagueFromRequest } from '@/lib/league-context'

export const dynamic = 'force-dynamic'

// Use service role for API routes to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    // Get league from request (query param or cookie)
    const league = await getLeagueFromRequest(request)

    // Get match analyses with fixture details, optionally filtered by league
    let analysisQuery = supabase
      .from('match_analysis')
      .select(`
        *,
        fixture:fixtures!inner(
          id,
          league_id,
          kickoff,
          status,
          home_team:teams!fixtures_home_team_id_fkey(id, name, short_name, logo),
          away_team:teams!fixtures_away_team_id_fkey(id, name, short_name, logo),
          home_score,
          away_score
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by league if available (join through fixtures table)
    if (league?.id) {
      analysisQuery = analysisQuery.eq('fixture.league_id', league.id)
    }

    const { data: analyses, error: analysisError } = await analysisQuery

    if (analysisError) throw analysisError

    if (!analyses || analyses.length === 0) {
      return NextResponse.json({
        total: 0,
        correct: 0,
        incorrect: 0,
        accuracy: 0,
        result_accuracy: 0,
        score_accuracy: 0,
        over_under_accuracy: 0,
        btts_accuracy: 0,
        average_accuracy: 0,
        byOutcome: null,
        byConfidence: null,
        byModel: null,
        scoreIndex: null,
        confidenceStats: null,
        scorePrediction: null,
        matches: [],
      })
    }

    // Get fixture IDs from analyses
    const fixtureIds = analyses.map(a => a.fixture_id).filter(Boolean)

    // Fetch related predictions separately with more fields
    const { data: predictions } = await supabase
      .from('predictions')
      .select('fixture_id, prediction_result, confidence_pct, confidence_level, model_used, model_version, overall_index, certainty_score, most_likely_score')
      .in('fixture_id', fixtureIds)

    // Create a map of predictions by fixture_id
    const predictionMap = new Map(
      (predictions || []).map(p => [p.fixture_id, p])
    )

    const total = analyses.length
    const correct = analyses.filter(a => a.prediction_correct).length
    const incorrect = total - correct
    const accuracy = (correct / total) * 100

    // Calculate basic accuracy stats
    const resultCorrect = analyses.filter(a => a.prediction_correct).length
    const scoreCorrect = analyses.filter(a => a.score_correct).length
    const ouCorrect = analyses.filter(a => a.over_under_correct).length
    const bttsCorrect = analyses.filter(a => a.btts_correct).length
    const avgAccuracy = analyses.reduce((sum, a) => sum + (a.accuracy_score || 0), 0) / total

    // Group by predicted outcome (1, X, 2)
    const byOutcome: Record<string, { total: number; correct: number; accuracy: number }> = {
      home: { total: 0, correct: 0, accuracy: 0 },
      draw: { total: 0, correct: 0, accuracy: 0 },
      away: { total: 0, correct: 0, accuracy: 0 },
    }

    analyses.forEach(a => {
      const prediction = predictionMap.get(a.fixture_id)
      // Use match_analysis.predicted_result as primary source (stored at analysis time)
      // Falls back to predictions table if available
      const predResult = a.predicted_result || prediction?.prediction_result

      // Skip if no prediction result at all
      if (!predResult) {
        console.log(`[Accuracy Stats] Analysis ${a.fixture_id} has no predicted_result`)
        return
      }

      // Normalize the prediction result
      const normalizedResult = String(predResult).toLowerCase().trim()

      // Determine the predicted outcome category
      // Handle single outcomes: 1, X, 2
      // Handle double-chance: 1X (home or draw), X2 (draw or away), 12 (home or away)
      let category: string | null = null

      if (normalizedResult === '1' || normalizedResult.includes('home') || normalizedResult === 'home win') {
        category = 'home'
      } else if (normalizedResult === 'x' || normalizedResult.includes('draw') || normalizedResult === 'tie') {
        category = 'draw'
      } else if (normalizedResult === '2' || normalizedResult.includes('away') || normalizedResult === 'away win') {
        category = 'away'
      } else if (normalizedResult === '1x' || normalizedResult === 'x1') {
        // Double-chance: home or draw - categorize as home (primary)
        category = 'home'
      } else if (normalizedResult === 'x2' || normalizedResult === '2x') {
        // Double-chance: draw or away - categorize as away (primary)
        category = 'away'
      } else if (normalizedResult === '12' || normalizedResult === '21') {
        // Double-chance: home or away - categorize as home (primary)
        category = 'home'
      }

      if (category && byOutcome[category]) {
        byOutcome[category].total++
        if (a.prediction_correct) {
          byOutcome[category].correct++
        }
      } else {
        console.log(`[Accuracy Stats] Unknown prediction result format: "${predResult}" for fixture ${a.fixture_id}`)
      }
    })

    // Calculate accuracy for each outcome
    Object.keys(byOutcome).forEach(key => {
      if (byOutcome[key].total > 0) {
        byOutcome[key].accuracy = (byOutcome[key].correct / byOutcome[key].total) * 100
      }
    })

    // Group by confidence level
    const byConfidence: Record<string, { total: number; correct: number; accuracy: number }> = {
      high: { total: 0, correct: 0, accuracy: 0 },
      medium: { total: 0, correct: 0, accuracy: 0 },
      low: { total: 0, correct: 0, accuracy: 0 },
    }

    analyses.forEach(a => {
      const prediction = predictionMap.get(a.fixture_id)
      const confidencePct = prediction?.confidence_pct || a.confidence_pct || 0
      let level: string

      if (confidencePct >= 70) {
        level = 'high'
      } else if (confidencePct >= 55) {
        level = 'medium'
      } else {
        level = 'low'
      }

      byConfidence[level].total++
      if (a.prediction_correct) {
        byConfidence[level].correct++
      }
    })

    // Calculate accuracy for each confidence level
    Object.keys(byConfidence).forEach(key => {
      if (byConfidence[key].total > 0) {
        byConfidence[key].accuracy = (byConfidence[key].correct / byConfidence[key].total) * 100
      }
    })

    // Group by model
    const byModel: Record<string, { total: number; correct: number; accuracy: number }> = {}

    analyses.forEach(a => {
      const prediction = predictionMap.get(a.fixture_id)
      // Use match_analysis.model_version as primary source (stored at analysis time)
      // Falls back to predictions table if available
      const model = a.model_version || prediction?.model_used || prediction?.model_version || 'Unknown'

      if (!byModel[model]) {
        byModel[model] = { total: 0, correct: 0, accuracy: 0 }
      }

      byModel[model].total++
      if (a.prediction_correct) {
        byModel[model].correct++
      }
    })

    // Calculate accuracy for each model
    Object.keys(byModel).forEach(key => {
      if (byModel[key].total > 0) {
        byModel[key].accuracy = (byModel[key].correct / byModel[key].total) * 100
      }
    })

    // Calculate Score Index statistics
    const scoreIndexStats = {
      count: 0,
      average: 0,
      correctAvg: 0,
      incorrectAvg: 0,
      byRange: {
        strong_home: { range: '70-100', total: 0, correct: 0, accuracy: 0 }, // Strongly favors home
        lean_home: { range: '55-69', total: 0, correct: 0, accuracy: 0 },    // Leans home
        balanced: { range: '45-54', total: 0, correct: 0, accuracy: 0 },     // Balanced
        lean_away: { range: '31-44', total: 0, correct: 0, accuracy: 0 },    // Leans away
        strong_away: { range: '1-30', total: 0, correct: 0, accuracy: 0 },   // Strongly favors away
      } as Record<string, { range: string; total: number; correct: number; accuracy: number }>
    }

    let totalIndex = 0
    let correctIndexSum = 0
    let correctIndexCount = 0
    let incorrectIndexSum = 0
    let incorrectIndexCount = 0

    analyses.forEach(a => {
      const prediction = predictionMap.get(a.fixture_id)
      const overallIndex = prediction?.overall_index

      if (overallIndex !== undefined && overallIndex !== null) {
        scoreIndexStats.count++
        totalIndex += overallIndex

        if (a.prediction_correct) {
          correctIndexSum += overallIndex
          correctIndexCount++
        } else {
          incorrectIndexSum += overallIndex
          incorrectIndexCount++
        }

        // Categorize by range
        let rangeKey: string
        if (overallIndex >= 70) rangeKey = 'strong_home'
        else if (overallIndex >= 55) rangeKey = 'lean_home'
        else if (overallIndex >= 45) rangeKey = 'balanced'
        else if (overallIndex >= 31) rangeKey = 'lean_away'
        else rangeKey = 'strong_away'

        scoreIndexStats.byRange[rangeKey].total++
        if (a.prediction_correct) {
          scoreIndexStats.byRange[rangeKey].correct++
        }
      }
    })

    if (scoreIndexStats.count > 0) {
      scoreIndexStats.average = Math.round(totalIndex / scoreIndexStats.count)
    }
    if (correctIndexCount > 0) {
      scoreIndexStats.correctAvg = Math.round(correctIndexSum / correctIndexCount)
    }
    if (incorrectIndexCount > 0) {
      scoreIndexStats.incorrectAvg = Math.round(incorrectIndexSum / incorrectIndexCount)
    }

    // Calculate accuracy for each score index range
    Object.keys(scoreIndexStats.byRange).forEach(key => {
      const range = scoreIndexStats.byRange[key]
      if (range.total > 0) {
        range.accuracy = Math.round((range.correct / range.total) * 100)
      }
    })

    // Calculate detailed Confidence (certainty_score) statistics
    const confidenceStats = {
      count: 0,
      average: 0,
      correctAvg: 0,
      incorrectAvg: 0,
    }

    let totalConfidence = 0
    let correctConfidenceSum = 0
    let correctConfidenceCount = 0
    let incorrectConfidenceSum = 0
    let incorrectConfidenceCount = 0

    analyses.forEach(a => {
      const prediction = predictionMap.get(a.fixture_id)
      const confidence = prediction?.certainty_score || prediction?.confidence_pct || a.confidence_pct

      if (confidence !== undefined && confidence !== null && confidence > 0) {
        confidenceStats.count++
        totalConfidence += confidence

        if (a.prediction_correct) {
          correctConfidenceSum += confidence
          correctConfidenceCount++
        } else {
          incorrectConfidenceSum += confidence
          incorrectConfidenceCount++
        }
      }
    })

    if (confidenceStats.count > 0) {
      confidenceStats.average = Math.round(totalConfidence / confidenceStats.count)
    }
    if (correctConfidenceCount > 0) {
      confidenceStats.correctAvg = Math.round(correctConfidenceSum / correctConfidenceCount)
    }
    if (incorrectConfidenceCount > 0) {
      confidenceStats.incorrectAvg = Math.round(incorrectConfidenceSum / incorrectConfidenceCount)
    }

    // Calculate Score Prediction statistics
    const scorePredictionStats = {
      total: 0,
      correct: 0,
      accuracy: 0,
      closeCount: 0, // Within 1 goal total
      closeAccuracy: 0,
    }

    analyses.forEach(a => {
      const prediction = predictionMap.get(a.fixture_id)
      if (prediction?.most_likely_score && a.actual_score) {
        scorePredictionStats.total++

        if (a.score_correct) {
          scorePredictionStats.correct++
        }

        // Check if close (within 1 goal total difference)
        const [predHome, predAway] = prediction.most_likely_score.split('-').map(Number)
        const [actHome, actAway] = a.actual_score.split('-').map(Number)

        if (!isNaN(predHome) && !isNaN(predAway) && !isNaN(actHome) && !isNaN(actAway)) {
          const goalDiff = Math.abs((predHome + predAway) - (actHome + actAway))
          if (goalDiff <= 1) {
            scorePredictionStats.closeCount++
          }
        }
      }
    })

    if (scorePredictionStats.total > 0) {
      scorePredictionStats.accuracy = Math.round((scorePredictionStats.correct / scorePredictionStats.total) * 100)
      scorePredictionStats.closeAccuracy = Math.round((scorePredictionStats.closeCount / scorePredictionStats.total) * 100)
    }

    // Build matches array with key info for display
    const matches = analyses.map(a => {
      const prediction = predictionMap.get(a.fixture_id)
      return {
        id: a.fixture_id,
        kickoff: a.fixture?.kickoff,
        homeTeam: a.fixture?.home_team,
        awayTeam: a.fixture?.away_team,
        actualScore: a.actual_score,
        predictedResult: a.predicted_result || prediction?.prediction_result,
        predictedScore: prediction?.most_likely_score,
        resultCorrect: a.prediction_correct,
        scoreCorrect: a.score_correct,
        overUnderCorrect: a.over_under_correct,
        bttsCorrect: a.btts_correct,
        certainty: prediction?.certainty_score || prediction?.confidence_pct,
        model: a.model_version || prediction?.model_used || prediction?.model_version,
      }
    })

    return NextResponse.json({
      total,
      correct,
      incorrect,
      accuracy,
      result_accuracy: (resultCorrect / total) * 100,
      score_accuracy: (scoreCorrect / total) * 100,
      over_under_accuracy: (ouCorrect / total) * 100,
      btts_accuracy: (bttsCorrect / total) * 100,
      average_accuracy: avgAccuracy,
      byOutcome: Object.values(byOutcome).some(v => v.total > 0) ? byOutcome : null,
      byConfidence: Object.values(byConfidence).some(v => v.total > 0) ? byConfidence : null,
      byModel: Object.keys(byModel).length > 0 ? byModel : null,
      // New comprehensive stats
      scoreIndex: scoreIndexStats.count > 0 ? scoreIndexStats : null,
      confidenceStats: confidenceStats.count > 0 ? confidenceStats : null,
      scorePrediction: scorePredictionStats.total > 0 ? scorePredictionStats : null,
      matches,
    })
  } catch (error) {
    console.error('Error fetching accuracy stats:', error)
    return NextResponse.json({ error: 'Failed to fetch accuracy stats' }, { status: 500 })
  }
}
