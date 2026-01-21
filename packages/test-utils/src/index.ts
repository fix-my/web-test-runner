/**
 * @fixmyhome/test-utils
 * Validation utilities for problem authoring
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { runTestsInVM, TestResult } from '@fixmyhome/test-runner';

/**
 * Recursively lists all files in a directory
 */
export function listFilesRecursive(dir: string, baseDir = dir): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...listFilesRecursive(fullPath, baseDir));
    } else {
      files.push(relative(baseDir, fullPath));
    }
  }

  return files;
}

/**
 * Validates that src/ and solution/ have matching file structure
 */
export function validateFileStructureMatch(
  problemPath: string
): { valid: boolean; errors: string[] } {
  const srcPath = join(problemPath, 'src');
  const solutionPath = join(problemPath, 'solution');

  const errors: string[] = [];

  if (!existsSync(srcPath)) {
    errors.push('src/ folder does not exist');
    return { valid: false, errors };
  }

  if (!existsSync(solutionPath)) {
    errors.push('solution/ folder does not exist');
    return { valid: false, errors };
  }

  const srcFiles = listFilesRecursive(srcPath).sort();
  const solutionFiles = listFilesRecursive(solutionPath).sort();

  // Check if file lists match
  if (srcFiles.length !== solutionFiles.length) {
    errors.push(
      `File count mismatch: src/ has ${srcFiles.length} files, solution/ has ${solutionFiles.length} files`
    );
  }

  // Check for missing files in solution/
  for (const file of srcFiles) {
    if (!solutionFiles.includes(file)) {
      errors.push(`Missing file in solution/: ${file}`);
    }
  }

  // Check for extra files in solution/
  for (const file of solutionFiles) {
    if (!srcFiles.includes(file)) {
      errors.push(`Extra file in solution/: ${file}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Bundles code files with test file into a single executable string
 * Automatically registers App component for test-runner
 */
export function bundleCodeWithTests(
  codeFiles: Record<string, string>,
  testCode: string
): string {
  const bundled: string[] = [];

  // Add code files
  for (const [filepath, content] of Object.entries(codeFiles)) {
    bundled.push(`// File: ${filepath}`);
    bundled.push(content);
    bundled.push('');
  }

  // Auto-register App (rules-based: App.tsx is always the entry point)
  bundled.push('// Auto-register App');
  bundled.push('registerApp(App);');
  bundled.push('');

  // Add test code
  bundled.push('// Test file');
  bundled.push(testCode);

  return bundled.join('\n');
}

/**
 * Loads code files from a specific folder (src/ or solution/)
 */
export function loadCodeFiles(
  problemPath: string,
  folder: 'src' | 'solution'
): Record<string, string> {
  const folderPath = join(problemPath, folder);
  const files: Record<string, string> = {};

  if (!existsSync(folderPath)) {
    return files;
  }

  const filePaths = listFilesRecursive(folderPath);

  for (const filepath of filePaths) {
    const fullPath = join(folderPath, filepath);
    const content = readFileSync(fullPath, 'utf-8');
    files[filepath] = content;
  }

  return files;
}

/**
 * Runs tests with code from a specific folder (src/ or solution/)
 */
export async function runTestsWithCode(
  problemPath: string,
  folder: 'src' | 'solution'
): Promise<TestResult> {
  // Load code files
  const codeFiles = loadCodeFiles(problemPath, folder);

  // Load test file
  const testPath = join(problemPath, 'test.ts');
  if (!existsSync(testPath)) {
    return {
      passed: false,
      results: [
        {
          name: 'Load test file',
          passed: false,
          error: 'test.ts not found',
        },
      ],
    };
  }

  const testCode = readFileSync(testPath, 'utf-8');

  // Bundle code with tests
  const bundledCode = bundleCodeWithTests(codeFiles, testCode);

  // Run in VM
  try {
    return await runTestsInVM(bundledCode);
  } catch (error: any) {
    return {
      passed: false,
      results: [
        {
          name: 'Run tests in VM',
          passed: false,
          error: error.message,
        },
      ],
    };
  }
}

/**
 * Validates that solution/ code passes tests and src/ code fails
 */
export async function validateProblemTests(problemPath: string): Promise<{
  valid: boolean;
  solutionResult?: TestResult;
  srcResult?: TestResult;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check if solution/ exists
  const solutionPath = join(problemPath, 'solution');
  if (!existsSync(solutionPath)) {
    return {
      valid: true, // Solution is optional
      errors: ['No solution/ folder - skipping test validation'],
    };
  }

  // Run tests with solution/ - must pass
  const solutionResult = await runTestsWithCode(problemPath, 'solution');
  if (!solutionResult.passed) {
    errors.push('solution/ code failed tests (should pass all tests)');
    errors.push('Failed tests:');
    for (const result of solutionResult.results) {
      if (!result.passed) {
        errors.push(`  - ${result.name}: ${result.error}`);
      }
    }
  }

  // Run tests with src/ - should fail
  const srcResult = await runTestsWithCode(problemPath, 'src');
  if (srcResult.passed) {
    errors.push('src/ code passed all tests (should have bugs that fail tests)');
  }

  return {
    valid: errors.length === 0,
    solutionResult,
    srcResult,
    errors,
  };
}
