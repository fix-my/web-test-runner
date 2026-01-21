/**
 * @fixmyhome/test-runner
 * Jest 호환 API 테스트 러너
 */
type TestFn = () => Promise<void> | void;
export declare function describe(name: string, fn: () => void): void;
export declare function it(name: string, fn: TestFn): void;
export declare const expect: (actual: any) => {
    toBe: (expected: any) => void;
    not: {
        toBe: (expected: any) => void;
    };
    toBeTruthy: () => void;
    toBeFalsy: () => void;
    toContain: (expected: any) => void;
    toBeGreaterThan: (expected: number) => void;
    toBeLessThan: (expected: number) => void;
};
export declare const test: typeof it & {
    describe: typeof describe;
    it: typeof it;
    expect: (actual: any) => {
        toBe: (expected: any) => void;
        not: {
            toBe: (expected: any) => void;
        };
        toBeTruthy: () => void;
        toBeFalsy: () => void;
        toContain: (expected: any) => void;
        toBeGreaterThan: (expected: number) => void;
        toBeLessThan: (expected: number) => void;
    };
};
export interface TestResult {
    passed: boolean;
    results: {
        name: string;
        passed: boolean;
        error?: string;
    }[];
}
export declare function runTests(): Promise<TestResult>;
/**
 * Wraps React state updates to ensure they are flushed
 * Similar to React Testing Library's act()
 *
 * @example
 * await act(async () => {
 *   button.click();
 * });
 */
export declare function act(callback: () => void | Promise<void>): Promise<void>;
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
export declare function waitFor(callback: () => void | Promise<void>, options?: {
    timeout?: number;
    interval?: number;
}): Promise<void>;
/**
 * Registers the App component globally
 * This should be called automatically by bundleCodeWithTests()
 *
 * @param App - React component to register
 *
 * @example
 * registerApp(App);
 */
export declare function registerApp(App: React.ComponentType): void;
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
export declare function render(): HTMLElement;
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
export declare function cleanup(): void;
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
export declare function runTestsInVM(bundledCode: string): Promise<TestResult>;
export {};
