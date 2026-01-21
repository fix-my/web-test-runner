/**
 * @fixmyhome/test-runner
 * Jest 호환 API 테스트 러너
 */

// React and ReactDOM will be provided externally:
// - Browser mode: window.React, window.ReactDOM
// - VM mode: injected via sandbox
declare const React: any;
declare const ReactDOM: any;

type TestFn = () => Promise<void> | void;

interface Test {
  name: string;
  fn: TestFn;
}

const tests: Test[] = [];
let currentDescribe = '';
let registeredApp: React.ComponentType | null = null;

export function describe(name: string, fn: () => void): void {
  currentDescribe = name;
  fn();
  currentDescribe = '';
}

export function it(name: string, fn: TestFn): void {
  tests.push({
    name: currentDescribe ? `${currentDescribe} > ${name}` : name,
    fn,
  });
}

export const expect = (actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(
        `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
      );
    }
  },
  not: {
    toBe: (expected: any) => {
      if (actual === expected) {
        throw new Error(`Expected not ${JSON.stringify(expected)}`);
      }
    },
  },
  toBeTruthy: () => {
    if (!actual) throw new Error(`Expected truthy, got ${actual}`);
  },
  toBeFalsy: () => {
    if (actual) throw new Error(`Expected falsy, got ${actual}`);
  },
  toContain: (expected: any) => {
    if (!actual.includes(expected)) {
      throw new Error(`Expected to contain ${expected}`);
    }
  },
  toBeGreaterThan: (expected: number) => {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} > ${expected}`);
    }
  },
  toBeLessThan: (expected: number) => {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} < ${expected}`);
    }
  },
});

// Playwright 호환성을 위한 test 객체
export const test = Object.assign(it, {
  describe,
  it,
  expect,
});

export interface TestResult {
  passed: boolean;
  results: {
    name: string;
    passed: boolean;
    error?: string;
  }[];
}

export async function runTests(): Promise<TestResult> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  for (const test of tests) {
    try {
      await test.fn();
      results.push({ name: test.name, passed: true });
    } catch (e: any) {
      results.push({ name: test.name, passed: false, error: e.message });
    }
  }

  tests.length = 0; // 초기화

  return {
    passed: results.every((r) => r.passed),
    results,
  };
}

/**
 * Wraps React state updates to ensure they are flushed
 * Similar to React Testing Library's act()
 *
 * @example
 * await act(async () => {
 *   button.click();
 * });
 */
export async function act(callback: () => void | Promise<void>): Promise<void> {
  const result = callback();

  // If callback returns a Promise, wait for it
  if (result instanceof Promise) {
    await result;
  }

  // Wait for React to flush updates
  // React 18's automatic batching requires multiple ticks
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));
  await new Promise(resolve => setTimeout(resolve, 0));

  // Add a small delay to ensure DOM updates are complete
  await new Promise(resolve => setTimeout(resolve, 10));
}

/**
 * Waits for a condition to become true
 * Polls the callback until it succeeds or timeout is reached
 *
 * @example
 * await waitFor(() => {
 *   const element = document.querySelector('.loaded');
 *   expect(element).toBeTruthy();
 * });
 *
 * @example with options
 * await waitFor(() => {
 *   expect(counter.textContent).toBe('5');
 * }, { timeout: 3000, interval: 100 });
 */
export async function waitFor(
  callback: () => void | Promise<void>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();
  let lastError: Error | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      const result = callback();
      if (result instanceof Promise) {
        await result;
      }
      return; // Success!
    } catch (e) {
      lastError = e as Error;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }

  // Timeout reached, throw the last error
  throw lastError || new Error(`waitFor timeout after ${timeout}ms`);
}

/**
 * Registers the App component globally
 * This should be called automatically by bundleCodeWithTests()
 *
 * @param App - React component to register
 *
 * @example
 * registerApp(App);
 */
export function registerApp(App: React.ComponentType): void {
  registeredApp = App;
}

/**
 * Renders the registered App component
 * Uses the App component registered via registerApp()
 *
 * @returns The container element with rendered App
 * @throws Error if no App is registered
 *
 * @example
 * const container = render();
 * const button = container.querySelector('button');
 */
export function render(): HTMLElement {
  if (!registeredApp) {
    throw new Error('No App registered. Call registerApp(App) first.');
  }

  const container = document.createElement('div');
  container.id = 'test-root';
  document.body.appendChild(container);

  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(registeredApp));

  return container;
}

/**
 * Cleans up the rendered App and resets state
 * Should be called after each test for isolation
 *
 * @example
 * afterEach(() => {
 *   cleanup();
 * });
 *
 * @example
 * it('should work', async () => {
 *   const container = render();
 *   // ... assertions
 *   cleanup();
 * });
 */
export function cleanup(): void {
  const container = document.getElementById('test-root');
  if (container) {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  }
  registeredApp = null;
}

/**
 * Runs bundled code in a VM context (Node.js only)
 * This is used for validation scripts to test code without executing in the main process
 *
 * @param bundledCode - The bundled JavaScript code to execute (code + tests)
 * @returns Test results
 *
 * @example
 * const code = bundleCodeWithTests(solutionFiles, testFile);
 * const result = await runTestsInVM(code);
 * console.log(result.passed); // true/false
 */
export async function runTestsInVM(bundledCode: string): Promise<TestResult> {
  // Check if we're in Node.js environment
  if (typeof process === 'undefined' || typeof require === 'undefined') {
    throw new Error('runTestsInVM can only be used in Node.js environment');
  }

  // Dynamically import vm module (Node.js only)
  const vm = require('vm') as typeof import('vm');

  // Create a sandbox with test runner globals
  const sandbox: any = {
    console,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Promise,
    // Test results collector
    __testResults: { tests: [], describe: '', passed: true },
  };

  // Add test-runner API to sandbox
  sandbox.describe = (name: string, fn: () => void) => {
    sandbox.__testResults.describe = name;
    fn();
    sandbox.__testResults.describe = '';
  };

  sandbox.it = (name: string, fn: TestFn) => {
    sandbox.__testResults.tests.push({
      name: sandbox.__testResults.describe
        ? `${sandbox.__testResults.describe} > ${name}`
        : name,
      fn,
    });
  };

  sandbox.test = Object.assign(sandbox.it, {
    describe: sandbox.describe,
    it: sandbox.it,
  });

  sandbox.expect = expect;
  sandbox.act = act;
  sandbox.waitFor = waitFor;
  sandbox.registerApp = registerApp;
  sandbox.cleanup = cleanup;

  // Inject React and ReactDOM (must be provided by caller)
  // Note: These should be passed from the environment running the VM
  try {
    sandbox.React = require('react');
    sandbox.ReactDOM = require('react-dom/client');
  } catch (error) {
    // React/ReactDOM not available - will fail if render() is called
    console.warn('React/ReactDOM not available in VM context');
  }

  // Create VM context
  const context = vm.createContext(sandbox);

  // Run the bundled code in the VM
  try {
    vm.runInContext(bundledCode, context, {
      timeout: 30000, // 30 second timeout
      displayErrors: true,
    });
  } catch (error: any) {
    return {
      passed: false,
      results: [
        {
          name: 'Code execution',
          passed: false,
          error: `Failed to execute code: ${error.message}`,
        },
      ],
    };
  }

  // Run all collected tests
  const results: { name: string; passed: boolean; error?: string }[] = [];

  for (const test of sandbox.__testResults.tests) {
    try {
      const result = test.fn();
      // Handle async tests
      if (result instanceof Promise) {
        await result;
      }
      results.push({ name: test.name, passed: true });
    } catch (e: any) {
      results.push({ name: test.name, passed: false, error: e.message });
    }
  }

  return {
    passed: results.every((r) => r.passed),
    results,
  };
}
