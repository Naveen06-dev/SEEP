import Editor from '@monaco-editor/react';

type Props = {
  language: string;
  value: string;
  onChange: (value: string) => void;
  theme?: 'vs-dark' | 'light';
};

export function CodeEditor({ language, value, onChange, theme = 'vs-dark' }: Props) {
  return (
    <div className="code-editor">
      <Editor
        height="360px"
        language={language === 'c' ? 'c' : language}
        value={value}
        theme={theme}
        onChange={(v) => onChange(v || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          automaticLayout: true,
          tabSize: 2
        }}
      />
    </div>
  );
}
