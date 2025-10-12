import React from 'react';
import { UIProvider } from '../state/ui';
import { ToolProvider } from '../state/tool';
import { SelectionProvider } from '../state/selection';
import { DrawingProvider } from '../state/drawing';
import { FrameProvider } from '../state/frame';
import { CodeProvider } from '../state/code';
import { ImageProvider } from '../state/image';
import { BoardsProvider } from '../state/boards';
import { HistoryProvider } from '../state/history';
import { useKeyboardShortcuts } from '../state/hooks/useKeyboardShortcuts';
import { useDisableToolsOnCreate } from '../state/hooks/useDisableToolsOnCreate';

const AppEffects: React.FC = () => {
  useKeyboardShortcuts();
  useDisableToolsOnCreate();
  return null;
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <HistoryProvider>
    <BoardsProvider>
      <UIProvider>
        <ToolProvider>
          <SelectionProvider>
            <DrawingProvider>
              <FrameProvider>
                <CodeProvider>
                  <ImageProvider>
                    {children}
                    <AppEffects />
                  </ImageProvider>
                </CodeProvider>
              </FrameProvider>
            </DrawingProvider>
          </SelectionProvider>
        </ToolProvider>
      </UIProvider>
    </BoardsProvider>
  </HistoryProvider>
);
