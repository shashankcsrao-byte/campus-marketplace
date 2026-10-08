// Types for the vendored scroll engine (scrollcraft.js sets window.ScrollCraft).
export interface ScrollCraftInstance {
  layout: () => void;
  read: () => void;
  destroy: () => void;
}

declare global {
  interface Window {
    ScrollCraft: {
      mount: (root: Element | string, opts?: { lerp?: number }) => ScrollCraftInstance;
      reduce: boolean;
      instances: ScrollCraftInstance[];
    };
  }
}
