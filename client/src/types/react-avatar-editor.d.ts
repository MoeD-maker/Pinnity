declare module 'react-avatar-editor' {
  import React from 'react';

  export interface AvatarEditorProps {
    image: string;
    width?: number;
    height?: number;
    border?: number;
    borderRadius?: number;
    color?: number[];
    scale?: number;
    rotate?: number;
    onImageReady?: () => void;
    onImageChange?: () => void;
    onPositionChange?: () => void;
    onLoadFailure?: () => void;
    onLoadSuccess?: () => void;
    disableHiDPIScaling?: boolean;
  }

  export default class AvatarEditor extends React.Component<AvatarEditorProps> {
    getImageScaledToCanvas(): HTMLCanvasElement;
    getImage(): HTMLCanvasElement;
    getCroppingRect(): { x: number; y: number; width: number; height: number };
  }
}