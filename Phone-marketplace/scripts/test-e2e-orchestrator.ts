import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { AIShoppingService } from '../src/lib/ai/shopping-service'
import { AIIntent } from '@prisma/client'

async function testCase(
  label: string,
  message: string,
  userId: string,
  convId?: string
): Promise<{ strategy: string; response: string; convId: string }> {
  console.log(`\n--- Turn: "${message}" ---`)
  try {
    const result = await AIShoppingService.chat(userId, message, convId)
    console.log(`Strategy: ${result.strategy}`)
    console.log(`Intent: ${result.intent}`)
    console.log(`Response: ${result.response}`)
    return { strategy: result.strategy, response: result.response, convId: result.conversationId }
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : String(e)
    console.error(`Error: ${err}`)
    return { strategy: 'ERROR', response: err, convId: convId || '' }
  }
}

async function main() {
  const userId = 'test-user-1'

  console.log('=== E2E Tests for LLM-as-Router ===\n')

  // Test 1: "Tôi mệnh Mộc nên mua máy màu gì?" → clarify, not search
  const r1 = await testCase('Feng Shui + Mệnh', 'Tôi mệnh Mộc nên mua máy màu gì?', userId)
  const p1 = r1.strategy === 'clarify_and_continue' && r1.response.includes('phong thủy') === false && r1.response.length > 20
  console.log(`[${p1 ? 'PASS' : 'FAIL'}] Should clarify, NOT search, response should acknowledge but not deep feng shui`)

  // Test 2: "Dưới 10 triệu" → now should search with budget + feng shui context
  const r2 = await testCase('Budget after Feng Shui', 'Dưới 10 triệu', userId, r1.convId)
  const p2 = r2.response.includes('10 triệu') || r2.response.includes('10t') || r2.strategy === 'search_products'
  console.log(`[${p2 ? 'PASS' : 'FAIL'}] Should have budget context and search or respond appropriately`)

  // Test 3: "Máy nào nhìn sang dưới 10 triệu?" → clarify, not search immediately
  const r3 = await testCase('Premium Look', 'Máy nào nhìn sang dưới 10 triệu?', userId)
  const p3 = r3.strategy === 'clarify_and_continue' || r3.strategy === 'search_products'
  console.log(`[${p3 ? 'PASS' : 'FAIL'}] Should handle premium look + budget`)

  // Test 4: "Mua điện thoại tặng bạn gái" → clarify
  const r4 = await testCase('Gift for Girlfriend', 'Mua điện thoại tặng bạn gái thì chọn máy nào?', userId)
  const p4 = r4.strategy === 'clarify_and_continue' && r4.response.includes('bạn gái')
  console.log(`[${p4 ? 'PASS' : 'FAIL'}] Should clarify about budget, acknowledge gift`)

  // Test 5: "Tôi thích màu xanh nhưng muốn Samsung chơi game tốt" → clarify or search
  const r5 = await testCase('Color + Brand + Gaming', 'Tôi thích màu xanh nhưng muốn Samsung chơi game tốt.', userId)
  const p5 = r5.strategy !== 'off_topic'
  console.log(`[${p5 ? 'PASS' : 'FAIL'}] Should NOT be off-topic, has color+brand+usage`)

  // Test 6: Truly off topic
  const r6 = await testCase('Off Topic Weather', 'Hôm nay thời tiết thế nào?', userId)
  const p6 = r6.strategy === 'off_topic'
  console.log(`[${p6 ? 'PASS' : 'FAIL'}] Weather should be off_topic`)

  // Test 7: Truly off topic programming
  const r7 = await testCase('Off Topic Code', 'Viết code React cho tôi', userId)
  const p7 = r7.strategy === 'off_topic'
  console.log(`[${p7 ? 'PASS' : 'FAIL'}] Programming should be off_topic`)

  // Test 8: "Phong thủy thích màu xanh thì chọn máy đỏ được không?"
  const r8 = await testCase('Feng Shui Mixed', 'Phong thủy thích màu xanh thì chọn máy đỏ được không?', userId)
  const p8 = r8.strategy !== 'off_topic' && r8.response.length > 20
  console.log(`[${p8 ? 'PASS' : 'FAIL'}] Should handle feng shui question, NOT off-topic`)

  // Test 9: Normal product search
  const r9 = await testCase('Normal Search', 'Tìm điện thoại dưới 10 triệu', userId)
  const p9 = r9.strategy === 'search_products' || r9.strategy === 'clarify_and_continue'
  console.log(`[${p9 ? 'PASS' : 'FAIL'}] Normal search should work`)

  // Test 10: Contextual follow-up
  const r10 = await testCase('Follow up', 'thế thì sao?', userId, r9.convId)
  const p10 = r10.strategy !== 'off_topic'
  console.log(`[${p10 ? 'PASS' : 'FAIL'}] Follow-up should be on-topic (relates to previous)`)

  const pass = [p1, p2, p3, p4, p5, p6, p7, p8, p9, p10].filter(Boolean).length
  console.log(`\n=== Results: ${pass}/10 passed ===`)
}

main().catch(console.error)
