import { useEffect } from 'react';
import { eventBus } from '@core/events';
import { useTool } from '../tool';

const EVENTS = ['createsticky', 'createcodeblock', 'createline', 'createboard'] as const;

type DisableEvents = (typeof EVENTS)[number];

export const useDisableToolsOnCreate = () => {
  const { setTool } = useTool();

  useEffect(() => {
    const handle: EventListener = () => setTool('select');
    const unsubscribers = EVENTS.map((eventName) =>
      eventBus.on(eventName as DisableEvents, handle)
    );
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [setTool]);
};
