import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { IntentClassifier } from '../src/lib/ai/intent-classifier'

console.log('=== Intent Classification Tests ===\n')

const testCases = [
  // Success criteria
  { msg: 'Tôi mệnh Mộc nên mua máy màu gì?', expected: 'SHOPPING_PREFERENCE' },
  { msg: 'Phong thủy thích màu xanh thì chọn máy đỏ được không?', expected: 'SHOPPING_PREFERENCE' },
  { msg: 'Máy nào nhìn sang dưới 10 triệu?', expected: 'SHOPPING_PREFERENCE' },
  { msg: 'Mua điện thoại tặng bạn gái thì chọn máy nào?', expected: 'SHOPPING_PREFERENCE' },
  { msg: 'Tôi thích màu xanh nhưng muốn Samsung chơi game tốt.', expected: 'SHOPPING_PREFERENCE' },

  // Should still be PRODUCT_SEARCH
  { msg: 'Tìm điện thoại dưới 10 triệu', expected: 'PRODUCT_SEARCH' },
  { msg: 'So sánh iPhone 13 và Galaxy S23', expected: 'PRODUCT_COMPARISON' },

  // Should be OUT_OF_SCOPE (truly off topic)
  { msg: 'Hôm nay thời tiết thế nào?', expected: 'OUT_OF_SCOPE' },
  { msg: 'Viết code React cho tôi', expected: 'OUT_OF_SCOPE' },
  { msg: 'Ai vô địch World Cup?', expected: 'OUT_OF_SCOPE' },
  { msg: 'Giá vàng hôm nay?', expected: 'OUT_OF_SCOPE' },
]

let passed = 0
let failed = 0

for (const tc of testCases) {
  const result = IntentClassifier.classify(tc.msg, null)
  const ok = result.intent === tc.expected
  const status = ok ? 'PASS' : 'FAIL'
  if (ok) passed++; else failed++
  console.log(`[${status}] "${tc.msg}"`)
  console.log(`  Expected: ${tc.expected}  Got: ${result.intent}`)
  if (!ok) console.log('  ^ MISMATCH')
  console.log()
}

console.log(`\n=== Results: ${passed}/${testCases.length} passed ===`)
if (failed > 0) process.exit(1)
