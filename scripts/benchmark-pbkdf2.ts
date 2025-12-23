/**
 * PBKDF2 Performance Benchmark Script
 * 
 * Tests key derivation performance with different iteration counts.
 * Goal: Verify 100K iterations complete in <3 seconds.
 * 
 * Run with: npx tsx scripts/benchmark-pbkdf2.ts
 */

// Utility to encode string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Utility to generate random salt
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

// Convert Uint8Array to BufferSource for Web Crypto API
function toBufferSource(arr: Uint8Array): BufferSource {
  return arr.buffer as ArrayBuffer;
}

// PBKDF2 key derivation function
async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<{ key: CryptoKey; duration: number }> {
  const startTime = performance.now();

  const passwordBuffer = stringToUint8Array(password);
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const endTime = performance.now();
  const duration = endTime - startTime;

  return { key, duration };
}

// Run benchmark for a specific iteration count
async function runBenchmark(
  iterations: number,
  runs: number = 5
): Promise<void> {
  console.log(`\n📊 Testing PBKDF2 with ${iterations.toLocaleString()} iterations (${runs} runs):`);
  console.log('─'.repeat(60));

  const durations: number[] = [];
  const testPassword = 'TestPassword123!@#';
  const salt = generateSalt();

  for (let i = 0; i < runs; i++) {
    const { duration } = await deriveKey(testPassword, salt, iterations);
    durations.push(duration);
    console.log(`  Run ${i + 1}: ${duration.toFixed(2)}ms`);
  }

  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  console.log('─'.repeat(60));
  console.log(`  Average: ${avgDuration.toFixed(2)}ms`);
  console.log(`  Min:     ${minDuration.toFixed(2)}ms`);
  console.log(`  Max:     ${maxDuration.toFixed(2)}ms`);

  // Check against 3 second target
  const targetMs = 3000;
  const status = avgDuration < targetMs ? '✅ PASS' : '❌ FAIL';
  console.log(`  Status:  ${status} (target: <${targetMs}ms)`);
}

// Main benchmark execution
async function main() {
  console.log('🔐 PBKDF2 Key Derivation Performance Benchmark');
  console.log('='.repeat(60));
  console.log(`Platform: ${typeof process !== 'undefined' ? process.platform : 'browser'}`);
  console.log(`User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js'}`);
  console.log('='.repeat(60));

  try {
    // Test different iteration counts
    await runBenchmark(10000, 5);   // 10K iterations
    await runBenchmark(50000, 5);   // 50K iterations
    await runBenchmark(100000, 5);  // 100K iterations (target)
    await runBenchmark(200000, 3);  // 200K iterations (optional)

    console.log('\n📝 Recommendations:');
    console.log('─'.repeat(60));
    console.log('  • If 100K iterations < 3s: Use 100K iterations (recommended)');
    console.log('  • If 100K iterations > 3s: Consider 50K iterations as fallback');
    console.log('  • Desktop performance is typically better than mobile');
    console.log('  • Add loading indicator for key derivation in UI');
    console.log('─'.repeat(60));

    console.log('\n✅ Benchmark completed successfully');
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Check if Web Crypto API is available
if (typeof crypto === 'undefined' || !crypto.subtle) {
  console.error('❌ Web Crypto API not available in this environment');
  console.error('   Please run in a browser or Node.js 15+ environment');
  process.exit(1);
}

main().catch(console.error);
