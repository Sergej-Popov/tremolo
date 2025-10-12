import React from 'react';
import {
  BoardsProvider,
  CodeProvider,
  DrawingProvider,
  FrameProvider,
  HistoryProvider,
  ImageProvider,
  SelectionProvider,
  ToolProvider,
  UIProvider,
} from '@features/editor/application/state';
import {
  useDisableToolsOnCreate,
  useKeyboardShortcuts,
} from '@features/editor/application/state/hooks';

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
