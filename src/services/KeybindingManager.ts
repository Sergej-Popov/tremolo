export type KeybindingHandler = (event: KeyboardEvent) => void;

export class KeybindingManager {
  private readonly target: Window | undefined;
  private handlers: Set<KeybindingHandler> = new Set();
  private attached = false;

  constructor(target: Window | undefined = typeof window !== 'undefined' ? window : undefined) {
    this.target = target;
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  register(handler: KeybindingHandler): () => void {
    this.handlers.add(handler);
    this.ensureAttached();
    return () => {
      this.handlers.delete(handler);
      if (this.handlers.size === 0) {
        this.detach();
      }
    };
  }

  private handleKeydown(event: KeyboardEvent) {
    for (const handler of this.handlers) {
      handler(event);
    }
  }

  private ensureAttached() {
    if (this.attached || !this.target) {
      return;
    }
    this.target.addEventListener('keydown', this.handleKeydown);
    this.attached = true;
  }

  private detach() {
    if (!this.attached || !this.target) {
      return;
    }
    this.target.removeEventListener('keydown', this.handleKeydown);
    this.attached = false;
  }
}

export const keybindingManager = new KeybindingManager();
