import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import { AIOrchestrator } from '../src/lib/ai/ai-orchestrator'
import type { ConversationState } from '../src/lib/ai/slot-extractor'

function assert(condition: boolean, label: string) {
  if (!condition) {
    throw new Error(label)
  }
  console.log(`[PASS] ${label}`)
}

async function testFollowUpExplanationRoute() {
  const state: Partial<ConversationState> = {
    budget: 10_000_000,
    ambiguousPreference: 'feng_shui',
    suggestedColors: ['Black', 'Blue', 'White'],
    lastAction: 'search',
    lastRecommendations: [
      { productId: 1, title: 'iPhone SE 3 Midnight', brand: 'Apple', color: 'Midnight Black', price: 8900000 },
      { productId: 2, title: 'Redmi Note 14 Pro Blue', brand: 'Xiaomi', color: 'Blue', price: 9500000 },
    ],
  }

  const decision = await AIOrchestrator.decide(
    'mấy cái này hợp tôi ở điểm nào',
    'test-user',
    undefined,
    state
  )

  console.log('Follow-up explanation decision:', {
    strategy: decision.strategy,
    reason: decision.reason,
    lastAction: decision.mergedState.lastAction,
    lastQuestionType: decision.mergedState.lastQuestionType,
  })

  assert(decision.mergedState.lastRecommendations?.length === 2, 'recommendation memory is preserved for follow-up')
  assert(decision.mergedState.lastAction === 'answer', 'follow-up explanation stores answer lastAction')
  assert(decision.mergedState.lastQuestionType === 'open_follow_up', 'follow-up explanation stores open follow-up question type')
}

async function testSearchStateMemory() {
  const state: Partial<ConversationState> = {
    budget: 10_000_000,
    brand: 'Samsung',
  }

  const decision = await AIOrchestrator.decide(
    'tôi thích màu đen',
    'test-user',
    undefined,
    state
  )

  assert(decision.strategy === 'search_products', 'budget plus preference still routes to search')
  assert(decision.mergedState.lastAction === 'search', 'search route stores search lastAction')
}

async function testComparisonFollowUp() {
  const state: Partial<ConversationState> = {
    budget: 10_000_000,
    lastAction: 'search',
    lastRecommendations: [
      { productId: 1, title: 'iPhone 12 Black', brand: 'Apple', color: 'Black', price: 9900000 },
      { productId: 2, title: 'Galaxy S21 Blue', brand: 'Samsung', color: 'Blue', price: 9700000 },
    ],
  }

  const decision = await AIOrchestrator.decide(
    '2 con trên con nào tốt hơn',
    'test-user',
    undefined,
    state
  )

  assert(decision.strategy === 'compare_products', 'relative comparison routes to compare_products')
}

async function main() {
  console.log('=== Chatbot Regression Tests ===\n')
  await testFollowUpExplanationRoute()
  await testSearchStateMemory()
  await testComparisonFollowUp()
  console.log('\nAll chatbot regression tests passed.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
