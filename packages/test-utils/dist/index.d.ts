/**
 * @fixmyhome/test-utils
 * Validation utilities for problem authoring
 */
import { TestResult } from '@fixmyhome/test-runner';
/**
 * Recursively lists all files in a directory
 */
export declare function listFilesRecursive(dir: string, baseDir?: string): string[];
/**
 * Validates that src/ and solution/ have matching file structure
 */
export declare function validateFileStructureMatch(problemPath: string): {
    valid: boolean;
    errors: string[];
};
/**
 * Bundles code files with test file into a single executable string
 * Automatically registers App component for test-runner
 */
export declare function bundleCodeWithTests(codeFiles: Record<string, string>, testCode: string): string;
/**
 * Loads code files from a specific folder (src/ or solution/)
 */
export declare function loadCodeFiles(problemPath: string, folder: 'src' | 'solution'): Record<string, string>;
/**
 * Runs tests with code from a specific folder (src/ or solution/)
 */
export declare function runTestsWithCode(problemPath: string, folder: 'src' | 'solution'): Promise<TestResult>;
/**
 * Validates that solution/ code passes tests and src/ code fails
 */
export declare function validateProblemTests(problemPath: string): Promise<{
    valid: boolean;
    solutionResult?: TestResult;
    srcResult?: TestResult;
    errors: string[];
}>;
