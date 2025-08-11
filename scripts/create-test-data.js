const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function createTestData() {
  console.log('=== Creating Test Execution Data ===');
  
  // First, try to find the user ID from existing executions
  const { data: existingExec, error: execError } = await supabase
    .from('automation_executions')
    .select('user_id')
    .eq('status', 'success')
    .limit(1)
    .single();
    
  let userId;
  
  if (existingExec && existingExec.user_id) {
    userId = existingExec.user_id;
    console.log('Found existing user ID from executions:', userId);
  } else {
    // If no existing executions, we need to get the auth user ID
    // This would need to be run in the browser context
    console.log('No existing executions found.');
    console.log('Please run this in the browser console instead:');
    console.log(`
// Run this in your browser console while logged in:
const { supabase } = window;
const user = (await supabase.auth.getUser()).data.user;
if (user) {
  const testExecutions = [
    { status: 'success', execution_time: 1250 },
    { status: 'success', execution_time: 980 },
    { status: 'success', execution_time: 1450 },
    { status: 'failed', execution_time: 520 },
    { status: 'success', execution_time: 2100 },
    { status: 'success', execution_time: 750 },
    { status: 'success', execution_time: 1800 },
    { status: 'success', execution_time: 1320 }
  ];
  
  for (const exec of testExecutions) {
    await supabase.from('automation_executions').insert({
      user_id: user.id,
      automation_id: null,
      status: exec.status,
      execution_time: exec.execution_time,
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
  }
  console.log('Created test executions!');
  window.location.reload();
}
    `);
    process.exit(0);
  }
  
  // Create test executions for today
  const testExecutions = [
    { status: 'success', execution_time: 1250, automation_title: 'Morning Routine' },
    { status: 'success', execution_time: 980, automation_title: 'Focus Mode' },
    { status: 'success', execution_time: 1450, automation_title: 'Smart Home Evening' },
    { status: 'failed', execution_time: 520, automation_title: 'Weather Update' },
    { status: 'success', execution_time: 2100, automation_title: 'Workout Companion' },
    { status: 'success', execution_time: 750, automation_title: 'Travel Assistant' },
    { status: 'success', execution_time: 1800, automation_title: 'Social Media Manager' },
    { status: 'success', execution_time: 1320, automation_title: 'Email Organizer' }
  ];
  
  console.log('\nCreating', testExecutions.length, 'test executions for today...');
  
  let successCount = 0;
  for (const exec of testExecutions) {
    const { data: newExec, error: createError } = await supabase
      .from('automation_executions')
      .insert({
        user_id: userId,
        automation_id: null,
        status: exec.status,
        execution_time: exec.execution_time,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (createError) {
      console.log('✗ Error:', exec.automation_title, '-', createError.message);
    } else {
      console.log('✓ Created:', exec.automation_title, '-', exec.status, '-', exec.execution_time + 'ms');
      successCount++;
    }
  }
  
  // Verify the stats
  const today = new Date().toISOString().split('T')[0];
  const { data: todayExecs, error } = await supabase
    .from('automation_executions')
    .select('status, execution_time')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);
    
  if (todayExecs && todayExecs.length > 0) {
    const successful = todayExecs.filter(e => e.status === 'success');
    const totalTime = successful.reduce((acc, e) => acc + (e.execution_time || 0), 0);
    
    console.log('\n=== Today\'s Stats Summary ===');
    console.log('Total Executions:', todayExecs.length);
    console.log('Success Rate:', Math.round((successful.length / todayExecs.length) * 100) + '%');
    console.log('Average Time:', successful.length > 0 ? Math.round(totalTime / successful.length) + 'ms' : '0ms');
    console.log('Time Saved:', Math.round(totalTime / 1000 * 5) + 's');
  }
  
  if (successCount > 0) {
    console.log('\n✅ Test executions created successfully!');
    console.log('Refresh your app to see the updated counters.');
  }
  
  process.exit(0);
}

createTestData().catch(console.error);