const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function createTestExecutions() {
  console.log('=== Creating Test Executions for Today ===');
  
  // Prompt for user email
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const email = await new Promise(resolve => {
    readline.question('Enter your user email address: ', resolve);
  });
  readline.close();
  
  // Get user by email
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();
    
  if (userError || !users) {
    console.error('User not found with email:', email);
    process.exit(1);
  }
  
  const userId = users.id;
  console.log('Found user ID:', userId);
  
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
      console.log('Error creating execution:', createError.message);
    } else {
      console.log('✓ Created:', exec.automation_title, '-', exec.status, '-', exec.execution_time + 'ms');
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
    
  if (todayExecs) {
    const successful = todayExecs.filter(e => e.status === 'success');
    const totalTime = successful.reduce((acc, e) => acc + (e.execution_time || 0), 0);
    
    console.log('\n=== Today\'s Stats Summary ===');
    console.log('Total Executions:', todayExecs.length);
    console.log('Success Rate:', Math.round((successful.length / todayExecs.length) * 100) + '%');
    console.log('Average Time:', successful.length > 0 ? Math.round(totalTime / successful.length) + 'ms' : '0ms');
    console.log('Time Saved:', Math.round(totalTime / 1000 * 5) + 's');
  }
  
  console.log('\n✅ Test executions created successfully!');
  console.log('Refresh your app to see the updated counters.');
  process.exit(0);
}

createTestExecutions().catch(console.error);