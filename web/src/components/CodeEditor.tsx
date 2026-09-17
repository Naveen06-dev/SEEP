import Editor from '@monaco-editor/react';

type Props = {
  language: string;
  value: string;
  onChange: (value: string) => void;
  theme?: 'vs-dark' | 'light';
  height?: string;
};

export function CodeEditor({ language, value, onChange, theme = 'light', height = '380px' }: Props) {
  return (
    <div className="code-editor" style={{ height: '100%', minHeight: height }}>
      <Editor
        height={height}
        language={language === 'c' ? 'c' : language}
        value={value}
        theme={theme}
        onChange={(v) => onChange(v || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          automaticLayout: true,
          tabSize: 2,
          contextmenu: false,
          scrollBeyondLastLine: false,
          fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace"
        }}
      />
    </div>
  );
}
