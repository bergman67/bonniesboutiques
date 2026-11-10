/**
 * tests/e2e/harness/test-utils.mjs
 *
 * Unified Test Harness & Utilities for Bonnie's Boutique E2E Test Suite.
 * Provides test runner primitives, assertions, mock NextRequest/Response wrappers,
 * file inspection helpers, and formatted reporting.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

export const ROOT_DIR = process.cwd();

export class TestRunner {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.totalPassed = 0;
    this.totalFailed = 0;
    this.totalSkipped = 0;
    this.startTime = Date.now();
  }

  describe(name, fn) {
    const suite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    const start = Date.now();
    try {
      fn();
    } finally {
      suite.duration = Date.now() - start;
      this.currentSuite = prevSuite;
    }
  }

  async describeAsync(name, fn) {
    const suite = {
      name,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    };
    this.suites.push(suite);
    const prevSuite = this.currentSuite;
    this.currentSuite = suite;
    const start = Date.now();
    try {
      await fn();
    } finally {
      suite.duration = Date.now() - start;
      this.currentSuite = prevSuite;
    }
  }

  async test(name, fn) {
    const suite = this.currentSuite;
    const start = Date.now();
    try {
      await fn();
      const duration = Date.now() - start;
      const testRecord = { name, passed: true, duration, error: null };
      if (suite) {
        suite.tests.push(testRecord);
        suite.passed++;
      }
      this.totalPassed++;
      console.log(`    ✔ [PASS] ${name} (${duration}ms)`);
      return testRecord;
    } catch (err) {
      const duration = Date.now() - start;
      const testRecord = { name, passed: false, duration, error: err };
      if (suite) {
        suite.tests.push(testRecord);
        suite.failed++;
      }
      this.totalFailed++;
      console.error(`    ✖ [FAIL] ${name} (${duration}ms)`);
      console.error(`       Error: ${err.message}`);
      if (err.stack && process.env.VERBOSE) {
        console.error(err.stack);
      }
      return testRecord;
    }
  }

  skip(name, reason = 'Skipped') {
    const suite = this.currentSuite;
    const testRecord = { name, passed: true, skipped: true, duration: 0, reason };
    if (suite) {
      suite.tests.push(testRecord);
      suite.skipped++;
    }
    this.totalSkipped++;
    console.log(`    ↷ [SKIP] ${name} (${reason})`);
    return testRecord;
  }

  printSummary() {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    console.log('\n══════════════════════════════════════════════════════════════════════════');
    console.log(`TEST RUN SUMMARY: ${this.totalPassed} Passed, ${this.totalFailed} Failed, ${this.totalSkipped} Skipped (${duration}s)`);
    console.log('══════════════════════════════════════════════════════════════════════════');
    for (const suite of this.suites) {
      const statusIcon = suite.failed === 0 ? '✔' : '✖';
      console.log(`  ${statusIcon} ${suite.name}: ${suite.passed}/${suite.tests.length} passed (${suite.duration}ms)`);
      if (suite.failed > 0) {
        for (const t of suite.tests.filter(x => !x.passed)) {
          console.log(`      ✖ ${t.name} -> ${t.error?.message}`);
        }
      }
    }
    console.log('══════════════════════════════════════════════════════════════════════════\n');
    return this.totalFailed === 0;
  }
}

export const defaultRunner = new TestRunner();

/**
 * Creates a mock NextRequest / Web Request object for route testing
 */
export function createMockRequest(urlStr, options = {}) {
  const url = new URL(urlStr, 'http://localhost:3000');
  const headers = new Headers(options.headers || {});
  const method = options.method || 'GET';
  let body = null;
  if (options.body) {
    body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }

  return {
    nextUrl: url,
    url: url.toString(),
    method,
    headers,
    async json() {
      if (!body) return {};
      return JSON.parse(body);
    },
    async text() {
      return body || '';
    },
  };
}

/**
 * Reads a JSON file safely from the repository
 */
export function loadJsonFile(relativePath) {
  const fullPath = path.resolve(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

/**
 * Reads a UTF8 text file safely from the repository
 */
export function loadTextFile(relativePath) {
  const fullPath = path.resolve(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

/**
 * Assertion helpers
 */
export { assert };

export function assertEqual(actual, expected, message) {
  assert.strictEqual(actual, expected, message);
}

export function assertDeepEqual(actual, expected, message) {
  assert.deepStrictEqual(actual, expected, message);
}

export function assertIncludes(haystack, needle, message) {
  assert(
    typeof haystack === 'string' && haystack.includes(needle),
    message || `Expected string to include "${needle}"`
  );
}

export function assertNotIncludes(haystack, needle, message) {
  assert(
    typeof haystack === 'string' && !haystack.includes(needle),
    message || `Expected string NOT to include "${needle}"`
  );
}

export function assertApprox(actual, expected, epsilon = 0.01, message) {
  const diff = Math.abs(actual - expected);
  assert(
    diff <= epsilon,
    message || `Expected ${actual} to be within ${epsilon} of ${expected} (diff: ${diff})`
  );
}

/**
 * Reference Classification Formula (Authoritative Specification from PROJECT.md)
 */
export function classifyProduct(title, description = '') {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  if (text.includes('pen')) {
    return 'Beaded Pens';
  }
  if (text.includes('bookmark')) {
    return 'Charms & Bookmarks';
  }
  if (text.includes('keychain') || text.includes('wristlet') || text.includes('loop')) {
    return 'Keychains';
  }
  if (text.includes('charm') || text.includes('tassel')) {
    return 'Charms & Bookmarks';
  }
  return 'Keychains';
}
