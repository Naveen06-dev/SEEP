import { spawn, execFileSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { LANGUAGE_CONFIG, SANDBOX_IMAGE } from './languages.js';

let isDockerAvailable = false;
if (process.env.DOCKER_ENABLED === 'true') {
  try {
    execFileSync('docker', ['--version'], { stdio: 'ignore', timeout: 1500 });
    isDockerAvailable = true;
  } catch {
    isDockerAvailable = false;
  }
}

const DEFAULT_TIMEOUT_MS = parseInt(process.env.EXECUTION_TIMEOUT_MS || '5000', 10);
const MEMORY_MB = parseInt(process.env.EXECUTION_MEMORY_MB || '128', 10);

function runProcess({ command, args, cwd, stdin = '', timeoutMs = DEFAULT_TIMEOUT_MS, maxBuffer = 2 * 1024 * 1024 }) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;
    let timer = null;

    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    timer = setTimeout(() => {
      killed = true;
      try {
        if (process.platform === 'win32' && child.pid) {
          spawn('taskkill', ['/pid', child.pid.toString(), '/T', '/F']);
        } else {
          child.kill('SIGKILL');
        }
      } catch (e) {}
      resolve({
        stdout,
        stderr: stderr + (stderr ? '\n' : '') + `Execution timed out (${timeoutMs}ms)`,
        runtimeError: `Execution timed out after ${timeoutMs}ms`,
        exitCode: 124,
        timedOut: true
      });
    }, timeoutMs);

    if (stdin) {
      try {
        child.stdin.write(stdin);
      } catch (e) {}
    }
    try {
      child.stdin.end();
    } catch (e) {}

    child.stdout.on('data', (data) => {
      if (stdout.length < maxBuffer) {
        stdout += data.toString('utf8');
      }
    });

    child.stderr.on('data', (data) => {
      if (stderr.length < maxBuffer) {
        stderr += data.toString('utf8');
      }
    });

    child.on('error', (err) => {
      if (killed) return;
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: stderr + (stderr ? '\n' : '') + err.message,
        runtimeError: err.message,
        exitCode: 1,
        timedOut: false
      });
    });

    child.on('close', (code) => {
      if (killed) return;
      clearTimeout(timer);
      const hasError = code !== 0 && code !== null;
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 0,
        runtimeError: hasError ? (stderr.trim() || `Process exited with code ${code}`) : null,
        timedOut: false
      });
    });
  });
}

async function runInDocker(workDir, language, stdin, timeoutMs) {
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

  const start = Date.now();
  await runProcess({
    command: 'docker',
    args: dockerArgs,
    cwd: workDir,
    stdin,
    timeoutMs: timeoutMs + 10000
  });

  const compileError = await readOptional(path.join(workDir, 'compile.err'));
  const runtimeError = await readOptional(path.join(workDir, 'runtime.err'));
  const stdout = await readOptional(path.join(workDir, 'output.txt'));

  return {
    stdout: stdout ? stdout.trimEnd() : '',
    stderr: runtimeError || '',
    compileError: compileError || null,
    runtimeError: runtimeError || null,
    executionTimeMs: Date.now() - start,
    memoryKb: MEMORY_MB * 1024
  };
}

async function runLocal(workDir, language, stdin, timeoutMs) {
  const cfg = LANGUAGE_CONFIG[language];
  const start = Date.now();

  // 1. Compilation phase (if applicable)
  if (cfg.compile) {
    const compileCmd = cfg.compile[0];
    const compileArgs = cfg.compile.slice(1);
    const compileRes = await runProcess({
      command: compileCmd,
      args: compileArgs,
      cwd: workDir,
      timeoutMs: Math.max(timeoutMs, 6000)
    });

    if (compileRes.exitCode !== 0 || compileRes.runtimeError) {
      return {
        stdout: '',
        stderr: compileRes.stderr || '',
        compileError: compileRes.stderr || compileRes.runtimeError || 'Compilation failed',
        runtimeError: null,
        executionTimeMs: Date.now() - start,
        memoryKb: 0
      };
    }
  }

  // 2. Execution phase with piped stdin
  let runCmd = cfg.run[0];
  let runArgs = cfg.run.slice(1);

  if (language === 'c' || language === 'cpp') {
    const exeName = process.platform === 'win32' ? 'main.exe' : 'main';
    runCmd = path.resolve(workDir, exeName);
    runArgs = [];
  } else if (language === 'java') {
    runCmd = 'java';
    runArgs = ['-cp', workDir, 'Main'];
  } else if (language === 'python' || language === 'py') {
    runCmd = process.platform === 'win32' ? 'python' : 'python3';
    runArgs = [path.resolve(workDir, 'main.py')];
  } else if (language === 'javascript' || language === 'js') {
    runCmd = 'node';
    runArgs = [path.resolve(workDir, 'main.js')];
  }

  const execRes = await runProcess({
    command: runCmd,
    args: runArgs,
    cwd: workDir,
    stdin: stdin || '',
    timeoutMs
  });

  return {
    stdout: execRes.stdout ? execRes.stdout.trimEnd() : '',
    stderr: execRes.stderr ? execRes.stderr.trimEnd() : '',
    compileError: null,
    runtimeError: execRes.runtimeError || null,
    executionTimeMs: Date.now() - start,
    memoryKb: 0
  };
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

  const timeoutMs = timeLimitMs || DEFAULT_TIMEOUT_MS;
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'seep-run-'));

  try {
    await fs.writeFile(path.join(workDir, cfg.filename), sourceCode);
    await fs.writeFile(path.join(workDir, 'input.txt'), stdin);

    if (isDockerAvailable) {
      try {
        return await runInDocker(workDir, language, stdin, timeoutMs);
      } catch (dockerErr) {
        console.warn('[sandbox] Docker run error, falling back to native local:', dockerErr.message);
      }
    }

    return await runLocal(workDir, language, stdin, timeoutMs);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
