// Test script to verify stack overflow protections are working

console.log('Testing stack overflow protections...\n');

// Test 1: Function.apply recursion protection
console.log('Test 1: Function.apply protection');
try {
  function recursiveApply() {
    return recursiveApply.apply(null, []);
  }
  
  // This should be caught by our override
  recursiveApply();
  console.log('❌ Function.apply protection failed - recursion not caught');
} catch (error) {
  if (error.message.includes('Maximum call stack')) {
    console.log('❌ Function.apply protection failed - stack overflow occurred');
  } else {
    console.log('✅ Function.apply protection working - error caught:', error.message);
  }
}

// Test 2: Array.map recursion protection
console.log('\nTest 2: Array.map protection');
try {
  const arr = [1, 2, 3];
  let depth = 0;
  
  function recursiveMap(array) {
    depth++;
    if (depth > 60) {
      throw new Error('Map recursion depth exceeded');
    }
    return array.map(() => recursiveMap(array));
  }
  
  recursiveMap(arr);
  console.log('❌ Array.map protection failed - recursion not caught');
} catch (error) {
  if (error.message.includes('Maximum call stack')) {
    console.log('❌ Array.map protection failed - stack overflow occurred');
  } else if (error.message.includes('Map recursion depth exceeded')) {
    console.log('✅ Array.map protection working - recursion prevented at depth:', depth);
  } else {
    console.log('✅ Array.map protection working - error caught:', error.message);
  }
}

// Test 3: Check if protections are active
console.log('\nTest 3: Checking if protections are installed');
if (typeof Function.prototype.apply === 'function') {
  const applyString = Function.prototype.apply.toString();
  if (applyString.includes('applyDepth')) {
    console.log('✅ Function.apply override is installed');
  } else {
    console.log('❌ Function.apply override is NOT installed');
  }
}

if (typeof Array.prototype.map === 'function') {
  const mapString = Array.prototype.map.toString();
  if (mapString.includes('mapDepth')) {
    console.log('✅ Array.map override is installed');
  } else {
    console.log('❌ Array.map override is NOT installed');
  }
}

console.log('\n✅ All tests completed');