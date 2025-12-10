/**
 * Global type definitions for YigiCoin project
 */

declare global {
  interface Window {
    YigiToast?: {
      success?: (message: string) => void;
      error?: (message: string) => void;
      info?: (message: string) => void;
      warning?: (message: string) => void;
    };
  }
}

export {};
