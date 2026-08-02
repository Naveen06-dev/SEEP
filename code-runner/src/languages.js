export const LANGUAGE_CONFIG = {
  c: {
    filename: 'main.c',
    compile: ['gcc', 'main.c', '-O2', '-o', 'main'],
    run: ['./main']
  },
  java: {
    filename: 'Main.java',
    compile: ['javac', 'Main.java'],
    run: ['java', 'Main']
  },
  python: {
    filename: 'main.py',
    compile: null,
    run: ['python3', 'main.py']
  }
};

export const SANDBOX_IMAGE = 'gcc:14-bookworm';
