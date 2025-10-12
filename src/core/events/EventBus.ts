export type EventBusTarget = Pick<Window, 'addEventListener' | 'removeEventListener' | 'dispatchEvent'>;

export class EventBus {
  private readonly target: EventBusTarget | undefined;

  constructor(target: EventBusTarget | undefined = typeof window !== 'undefined' ? window : undefined) {
    this.target = target;
  }

  on(type: string, listener: EventListenerOrEventListenerObject): () => void {
    if (!this.target) {
      return () => {};
    }
    this.target.addEventListener(type, listener as EventListener);
    return () => {
      this.target?.removeEventListener(type, listener as EventListener);
    };
  }

  dispatch<T>(type: string, detail?: T): void {
    if (!this.target) return;
    const event = new CustomEvent(type, { detail });
    this.target.dispatchEvent(event);
  }
}

export const eventBus = new EventBus();
