import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })
import { SemanticChecker } from '../src/lib/ai/semantic-relevance'
import { IntentClassifier } from '../src/lib/ai/intent-classifier'
import { AIIntent } from '@prisma/client'

console.log('=== Module Tests ===\n')

// Test SemanticChecker
console.log('--- SemanticChecker ---')
const semanticTests = [
  { msg: 'Tôi mệnh Mộc nên mua máy màu gì?', expected: true },
  { msg: 'Hôm nay thời tiết thế nào?', expected: false },
  { msg: 'Viết code React cho tôi', expected: false },
  { msg: 'Máy nào nhìn sang dưới 10 triệu?', expected: true },
  { msg: 'Mua điện thoại tặng bạn gái', expected: true },
  { msg: 'Phong thủy thích màu xanh thì chọn máy đỏ được không?', expected: true },
  { msg: 'Tôi thích màu xanh nhưng muốn Samsung chơi game tốt', expected: true },
  { msg: 'thế thì sao?', expected: true }, // with history
  { msg: 'Ai vô địch World Cup?', expected: false },
  { msg: 'Giá vàng hôm nay?', expected: false },
  { msg: 'so sánh iPhone và Samsung', expected: true },
  { msg: 'kiểm tra đơn hàng của tôi', expected: true },
]

let pass = 0
let fail = 0
for (const t of semanticTests) {
  const result = SemanticChecker.isShoppingRelated(t.msg, [])
  const ok = result === t.expected
  if (ok) pass++; else fail++
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${t.msg}" → ${result} (expected ${t.expected})`)
}

// Test with history context
console.log('\n--- With History Context ---')
const historyMsg = 'thế thì sao?'
const history = [{
  userMessage: 'Tìm điện thoại dưới 10 triệu',
  botMessage: 'Bạn muốn tìm máy dưới 10 triệu. Bạn thích hãng nào?'
}]
const withHistory = SemanticChecker.isShoppingRelated(historyMsg, history)
console.log(`[${withHistory ? 'PASS' : 'FAIL'}] "thế thì sao?" with shopping history → ${withHistory} (expected true)`)

// Test IntentClassifier signals
console.log('\n--- IntentClassifier Signals ---')
const intentTests = [
  { msg: 'Tôi mệnh Mộc nên mua máy màu gì?', expectedAmbiguity: 'high' },
  { msg: 'Hôm nay thời tiết thế nào?', expectedIntent: 'OUT_OF_SCOPE' },
  { msg: 'Viết code React cho tôi', expectedIntent: 'OUT_OF_SCOPE' },
  { msg: 'Máy nào nhìn sang dưới 10 triệu?', expectedAmbiguity: 'high' },
  { msg: 'Tìm điện thoại dưới 10 triệu', expectedIntent: 'PRODUCT_SEARCH' },
  { msg: 'so sánh iPhone và Samsung', expectedIntent: 'PRODUCT_COMPARISON' },
  { msg: 'Mua điện thoại tặng bạn gái', expectedAmbiguity: 'high' },
]

for (const t of intentTests) {
  const signal = IntentClassifier.analyze(t.msg, null)
  const isOOS = signal.primaryIntent === AIIntent.OUT_OF_SCOPE

  if (t.expectedIntent) {
    const ok = signal.primaryIntent === t.expectedIntent
    if (ok) pass++; else fail++
    console.log(`[${ok ? 'PASS' : 'FAIL'}] "${t.msg}" → ${signal.primaryIntent} (expected ${t.expectedIntent}, ambiguity=${signal.ambiguityLevel})`)
  } else if (t.expectedAmbiguity) {
    const ok = signal.ambiguityLevel === t.expectedAmbiguity
    if (ok) pass++; else fail++
    console.log(`[${ok ? 'PASS' : 'FAIL'}] "${t.msg}" → ambiguity=${signal.ambiguityLevel} (expected ${t.expectedAmbiguity})`)
  }
}

// Test Truly Off Topic
console.log('\n--- Truly Off Topic ---')
const trulyOOSTests = [
  { msg: 'Hôm nay thời tiết thế nào?', expected: true },
  { msg: 'Viết code React cho tôi', expected: true },
  { msg: 'Ai vô địch World Cup?', expected: true },
  { msg: 'Giá vàng hôm nay?', expected: true },
  { msg: 'Tôi mệnh Mộc nên mua máy màu gì?', expected: false },
  { msg: 'Tìm điện thoại dưới 10 triệu', expected: false },
]
for (const t of trulyOOSTests) {
  const result = SemanticChecker.isTrulyOffTopic(t.msg)
  const ok = result === t.expected
  if (ok) pass++; else fail++
  console.log(`[${ok ? 'PASS' : 'FAIL'}] "${t.msg}" → ${result} (expected ${t.expected})`)
}

console.log(`\n=== Total: ${pass}/${pass + fail} passed ===`)
if (fail > 0) process.exit(1)
