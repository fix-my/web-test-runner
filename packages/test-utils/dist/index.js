"use strict";
/**
 * @fixmyhome/test-utils
 * Validation utilities for problem authoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFilesRecursive = listFilesRecursive;
exports.validateFileStructureMatch = validateFileStructureMatch;
exports.bundleCodeWithTests = bundleCodeWithTests;
exports.loadCodeFiles = loadCodeFiles;
exports.runTestsWithCode = runTestsWithCode;
exports.validateProblemTests = validateProblemTests;
const fs_1 = require("fs");
const path_1 = require("path");
const test_runner_1 = require("@fixmyhome/test-runner");
/**
 * Recursively lists all files in a directory
 */
function listFilesRecursive(dir, baseDir = dir) {
    const files = [];
    if (!(0, fs_1.existsSync)(dir)) {
        return files;
    }
    const entries = (0, fs_1.readdirSync)(dir);
    for (const entry of entries) {
        const fullPath = (0, path_1.join)(dir, entry);
        const stat = (0, fs_1.statSync)(fullPath);
        if (stat.isDirectory()) {
            files.push(...listFilesRecursive(fullPath, baseDir));
        }
        else {
            files.push((0, path_1.relative)(baseDir, fullPath));
        }
    }
    return files;
}
/**
 * Validates that src/ and solution/ have matching file structure
 */
function validateFileStructureMatch(problemPath) {
    const srcPath = (0, path_1.join)(problemPath, 'src');
    const solutionPath = (0, path_1.join)(problemPath, 'solution');
    const errors = [];
    if (!(0, fs_1.existsSync)(srcPath)) {
        errors.push('src/ folder does not exist');
        return { valid: false, errors };
    }
    if (!(0, fs_1.existsSync)(solutionPath)) {
        errors.push('solution/ folder does not exist');
        return { valid: false, errors };
    }
    const srcFiles = listFilesRecursive(srcPath).sort();
    const solutionFiles = listFilesRecursive(solutionPath).sort();
    // Check if file lists match
    if (srcFiles.length !== solutionFiles.length) {
        errors.push(`File count mismatch: src/ has ${srcFiles.length} files, solution/ has ${solutionFiles.length} files`);
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
function bundleCodeWithTests(codeFiles, testCode) {
    const bundled = [];
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
function loadCodeFiles(problemPath, folder) {
    const folderPath = (0, path_1.join)(problemPath, folder);
    const files = {};
    if (!(0, fs_1.existsSync)(folderPath)) {
        return files;
    }
    const filePaths = listFilesRecursive(folderPath);
    for (const filepath of filePaths) {
        const fullPath = (0, path_1.join)(folderPath, filepath);
        const content = (0, fs_1.readFileSync)(fullPath, 'utf-8');
        files[filepath] = content;
    }
    return files;
}
/**
 * Runs tests with code from a specific folder (src/ or solution/)
 */
async function runTestsWithCode(problemPath, folder) {
    // Load code files
    const codeFiles = loadCodeFiles(problemPath, folder);
    // Load test file
    const testPath = (0, path_1.join)(problemPath, 'test.ts');
    if (!(0, fs_1.existsSync)(testPath)) {
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
    const testCode = (0, fs_1.readFileSync)(testPath, 'utf-8');
    // Bundle code with tests
    const bundledCode = bundleCodeWithTests(codeFiles, testCode);
    // Run in VM
    try {
        return await (0, test_runner_1.runTestsInVM)(bundledCode);
    }
    catch (error) {
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
async function validateProblemTests(problemPath) {
    const errors = [];
    // Check if solution/ exists
    const solutionPath = (0, path_1.join)(problemPath, 'solution');
    if (!(0, fs_1.existsSync)(solutionPath)) {
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
