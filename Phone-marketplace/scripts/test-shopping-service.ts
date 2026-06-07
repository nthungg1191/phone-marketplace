import * as dotenv from 'dotenv'
dotenv.config({ path: '.env' })

import { AIShoppingService } from '../src/lib/ai/shopping-service'

async function test() {
  console.log('=== Testing AI Shopping Service ===\n')

  // Test user - you'll need to use a real user ID from your DB
  const userId = 'cmo479uu500007q1ro4brrwj7'

  const testMessages = [
    'Tôi mệnh Mộc nên mua máy màu gì?',
    '10 triệu',
    'Máy nào nhìn sang dưới 10 triệu?',
    'Mua điện thoại tặng bạn gái thì chọn máy nào?',
  ]

  console.log('Running conversation flow:\n')
  let conversationId: string | undefined

  for (let i = 0; i < testMessages.length; i++) {
    const msg = testMessages[i]
    console.log(`--- Turn ${i + 1}: "${msg}" ---`)
    try {
      const response = await AIShoppingService.chat(userId, msg, conversationId)
      conversationId = response.conversationId
      console.log(`Intent: ${response.intent}`)
      console.log(`State: ${JSON.stringify(response.state)}`)
      console.log(`Response: ${response.message.substring(0, 200)}...`)
      console.log()
    } catch (error: any) {
      console.error(`Error: ${error.message}`)
      if (error.message?.includes('state')) {
        console.error('-> Prisma state field issue - check prisma generate')
      }
      break
    }
  }
}

test().catch(console.error)
