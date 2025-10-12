import React, { createContext, useContext, useMemo, useState } from 'react';

interface CodeContextValue {
  codeLanguage: string;
  setCodeLanguage: React.Dispatch<React.SetStateAction<string>>;
  codeTheme: string;
  setCodeTheme: React.Dispatch<React.SetStateAction<string>>;
  codeFontSize: number;
  setCodeFontSize: React.Dispatch<React.SetStateAction<number>>;
}

const CodeContext = createContext<CodeContextValue | undefined>(undefined);

export const CodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [codeLanguage, setCodeLanguage] = useState<string>('typescript');
  const [codeTheme, setCodeTheme] = useState<string>('github-dark');
  const [codeFontSize, setCodeFontSize] = useState<number>(14);

  const value = useMemo(
    () => ({ codeLanguage, setCodeLanguage, codeTheme, setCodeTheme, codeFontSize, setCodeFontSize }),
    [codeLanguage, codeTheme, codeFontSize]
  );

  return <CodeContext.Provider value={value}>{children}</CodeContext.Provider>;
};

export const useCode = (): CodeContextValue => {
  const context = useContext(CodeContext);
  if (!context) {
    throw new Error('useCode must be used within a CodeProvider');
  }
  return context;
};
