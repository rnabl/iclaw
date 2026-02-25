/**
 * Test OneClaw Conversational Agent
 * 
 * Sends: "Find me 5 HVAC businesses in Denver"
 * Expected: Agent calls discover-businesses workflow
 */

const DAEMON_URL = 'http://localhost:8787';

async function testAgent() {
  console.log('\n🧪 Testing OneClaw Conversational Agent\n');
  console.log('=' .repeat(60));
  
  const message = "Find me 5 HVAC businesses in Denver";
  
  console.log(`\n📤 Sending: "${message}"\n`);
  
  try {
    const response = await fetch(`${DAEMON_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        channel: 'test',
      }),
    });
    
    if (!response.ok) {
      console.error(`❌ Error: ${response.status} - ${await response.text()}`);
      return;
    }
    
    const result = await response.json();
    
    console.log('📥 Response:\n');
    console.log('─'.repeat(60));
    console.log(result.response);
    console.log('─'.repeat(60));
    
    if (result.tool_calls && result.tool_calls.length > 0) {
      console.log(`\n🛠️  Tool Calls (${result.tool_calls.length}):\n`);
      
      for (const tool of result.tool_calls) {
        console.log(`  ✓ ${tool.tool}`);
        console.log(`    Input: ${JSON.stringify(tool.input, null, 2).split('\n').join('\n    ')}`);
        console.log(`    Output: ${JSON.stringify(tool.output, null, 2).split('\n').slice(0, 10).join('\n    ')}...`);
        console.log();
      }
    }
    
    if (result.milestones && result.milestones.length > 0) {
      console.log('📊 Milestones:\n');
      result.milestones.forEach(m => console.log(`  • ${m}`));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAgent();
