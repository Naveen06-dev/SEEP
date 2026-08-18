import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { LANGUAGE_CONFIG, SANDBOX_IMAGE } from './languages.js';

const execFileAsync = promisify(execFile);
const DOCKER_ENABLED = process.env.DOCKER_ENABLED !== 'false';
const TIMEOUT_MS = parseInt(process.env.EXECUTION_TIMEOUT_MS || '5000', 10);
const MEMORY_MB = parseInt(process.env.EXECUTION_MEMORY_MB || '128', 10);

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Execution timeout')), ms))
  ]);
}

async function runInDocker(workDir, language, stdin) {
  const cfg = LANGUAGE_CONFIG[language];
  if (!cfg) throw new Error(`Unsupported language: ${language}`);

  const dockerArgs = [
    'run', '--rm',
    '--network', 'none',
    '--memory', `${MEMORY_MB}m`,
    '--cpus', '1',
    '--pids-limit', '64',
    '-i',
    '-v', `${workDir}:/sandbox:rw`,
    '-w', '/sandbox',
    SANDBOX_IMAGE,
    '/bin/bash', '-c'
  ];

  let script = '';
  if (language === 'c') {
    script = 'gcc main.c -O2 -o main 2>compile.err && ./main < input.txt > output.txt 2>runtime.err || true';
  } else if (language === 'cpp') {
    script = 'g++ main.cpp -O2 -o main 2>compile.err && ./main < input.txt > output.txt 2>runtime.err || true';
  } else if (language === 'java') {
    script = 'javac Main.java 2>compile.err && java Main < input.txt > output.txt 2>runtime.err || true';
  } else if (language === 'python' || language === 'py') {
    script = 'python3 main.py < input.txt > output.txt 2>runtime.err || true';
  } else if (language === 'javascript' || language === 'js') {
    script = 'node main.js < input.txt > output.txt 2>runtime.err || true';
  }

  dockerArgs.push(script);

  await withTimeout(execFileAsync('docker', dockerArgs, { maxBuffer: 10 * 1024 * 1024 }), TIMEOUT_MS + 30000);

  const compileError = await readOptional(path.join(workDir, 'compile.err'));
  const runtimeError = await readOptional(path.join(workDir, 'runtime.err'));
  const stdout = await readOptional(path.join(workDir, 'output.txt'));

  return {
    stdout: stdout.trimEnd(),
    stderr: '',
    compileError: compileError || null,
    runtimeError: runtimeError || null,
    executionTimeMs: TIMEOUT_MS,
    memoryKb: MEMORY_MB * 1024
  };
}

async function runLocal(workDir, language, stdin) {
  const cfg = LANGUAGE_CONFIG[language];
  const start = Date.now();

  await fs.writeFile(path.join(workDir, 'input.txt'), stdin || '');

  if (cfg.compile) {
    try {
      await withTimeout(execFileAsync(cfg.compile[0], cfg.compile.slice(1), { cwd: workDir }), TIMEOUT_MS);
    } catch (e) {
      return {
        stdout: '',
        stderr: e.stderr?.toString() || '',
        compileError: e.stderr?.toString() || e.message,
        runtimeError: null,
        executionTimeMs: Date.now() - start,
        memoryKb: 0
      };
    }
  }

  try {
    const input = await fs.readFile(path.join(workDir, 'input.txt'), 'utf8');
    const result = await withTimeout(
      execFileAsync(cfg.run[0], cfg.run.slice(1), { cwd: workDir, input, maxBuffer: 1024 * 1024 }),
      TIMEOUT_MS
    );
    return {
      stdout: result.stdout?.toString() || '',
      stderr: result.stderr?.toString() || '',
      compileError: null,
      runtimeError: null,
      executionTimeMs: Date.now() - start,
      memoryKb: 0
    };
  } catch (e) {
    return {
      stdout: e.stdout?.toString() || '',
      stderr: e.stderr?.toString() || '',
      compileError: null,
      runtimeError: e.stderr?.toString() || e.message,
      executionTimeMs: Date.now() - start,
      memoryKb: 0
    };
  }
}

async function readOptional(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content.trim() || null;
  } catch {
    return null;
  }
}

export async function executeInSandbox({ language, sourceCode, stdin = '', timeLimitMs, memoryLimitMB }) {
  const cfg = LANGUAGE_CONFIG[language];
  if (!cfg) throw new Error(`Unsupported language: ${language}`);

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'seep-run-'));
  try {
    await fs.writeFile(path.join(workDir, cfg.filename), sourceCode);
    await fs.writeFile(path.join(workDir, 'input.txt'), stdin);

    if (DOCKER_ENABLED) {
      try {
        return await runInDocker(workDir, language, stdin);
      } catch (dockerErr) {
        console.warn('[sandbox] Docker failed, falling back to local:', dockerErr.message);
      }
    }

    return await runLocal(workDir, language, stdin);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
