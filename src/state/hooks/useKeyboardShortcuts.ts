import { useCallback, useEffect } from 'react';
import { keybindingManager } from '../../services/KeybindingManager';
import { KEY_B, KEY_D, KEY_F, KEY_Z } from '../../constants/keys';
import { useTool } from '../tool';
import { useUI } from '../ui';
import { useHistory } from '../history';
import type { Tool } from '../types';

const isEditableTarget = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    return true;
  }
  return element.getAttribute('contenteditable') === 'true';
};

export const useKeyboardShortcuts = () => {
  const { setTool } = useTool();
  const { setDebug } = useUI();
  const { undo, redo } = useHistory();

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === KEY_D) {
        event.preventDefault();
        setDebug((prev) => !prev);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && key === KEY_Z) {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }
      if (key === KEY_B) {
        setTool((prev: Tool) => (prev === 'draw' ? 'select' : 'draw'));
      } else if (key === KEY_F) {
        setTool((prev: Tool) => (prev === 'frame' ? 'select' : 'frame'));
      }
    },
    [redo, setDebug, setTool, undo]
  );

  useEffect(() => {
    return keybindingManager.register(handleKeydown);
  }, [handleKeydown]);
};
