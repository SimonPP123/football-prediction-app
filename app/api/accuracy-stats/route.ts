import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role for API routes to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get all match analyses
    const { data: analyses, error: analysisError } = await supabase
      .from('match_analysis')
      .select('*')

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
      })
    }

    // Get fixture IDs from analyses
    const fixtureIds = analyses.map(a => a.fixture_id).filter(Boolean)

    // Fetch related predictions separately
    const { data: predictions } = await supabase
      .from('predictions')
      .select('fixture_id, prediction_result, confidence_pct, confidence_level, model_used, model_version')
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
      const predResult = prediction?.prediction_result || a.predicted_outcome

      // Skip if no prediction result at all
      if (!predResult) {
        console.log(`[Accuracy Stats] Analysis ${a.fixture_id} has no prediction_result`)
        return
      }

      // Normalize the prediction result
      const normalizedResult = String(predResult).toLowerCase().trim()

      // Determine the predicted outcome category
      let category: string | null = null
      if (normalizedResult === '1' || normalizedResult.includes('home') || normalizedResult === 'home win') {
        category = 'home'
      } else if (normalizedResult === 'x' || normalizedResult.includes('draw') || normalizedResult === 'tie') {
        category = 'draw'
      } else if (normalizedResult === '2' || normalizedResult.includes('away') || normalizedResult === 'away win') {
        category = 'away'
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
      const model = prediction?.model_used || prediction?.model_version || a.model_version || 'Unknown'

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
    })
  } catch (error) {
    console.error('Error fetching accuracy stats:', error)
    return NextResponse.json({ error: 'Failed to fetch accuracy stats' }, { status: 500 })
  }
}
