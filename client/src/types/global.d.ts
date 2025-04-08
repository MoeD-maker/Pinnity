// Type definitions for DOM APIs
interface HTMLImageElement {
  width: number;
  height: number;
}

interface Image {
  new(): HTMLImageElement;
  new(width: number, height: number): HTMLImageElement;
  prototype: HTMLImageElement;
}

declare var Image: Image;