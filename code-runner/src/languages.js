export const LANGUAGE_CONFIG = {
  c: {
    filename: 'main.c',
    compile: ['gcc', 'main.c', '-O2', '-o', process.platform === 'win32' ? 'main.exe' : 'main'],
    run: [process.platform === 'win32' ? '.\\main.exe' : './main']
  },
  cpp: {
    filename: 'main.cpp',
    compile: ['g++', 'main.cpp', '-O2', '-o', process.platform === 'win32' ? 'main.exe' : 'main'],
    run: [process.platform === 'win32' ? '.\\main.exe' : './main']
  },
  java: {
    filename: 'Main.java',
    compile: ['javac', 'Main.java'],
    run: ['java', 'Main']
  },
  python: {
    filename: 'main.py',
    compile: null,
    run: process.platform === 'win32' ? ['python', 'main.py'] : ['python3', 'main.py']
  },
  py: {
    filename: 'main.py',
    compile: null,
    run: process.platform === 'win32' ? ['python', 'main.py'] : ['python3', 'main.py']
  },
  javascript: {
    filename: 'main.js',
    compile: null,
    run: ['node', 'main.js']
  },
  js: {
    filename: 'main.js',
    compile: null,
    run: ['node', 'main.js']
  }
};

export const SANDBOX_IMAGE = 'gcc:14-bookworm';
