import type { PaperGesture } from './use-note-movement';
import type { ComponentType } from 'react';

declare const PaperCrumple: ComponentType<{
  src: string; alt: string; width: number; height: number; sceneHeight: number;
  paperColor: string; detail: number; disabled: boolean; releaseDuration: number;
  gesture: PaperGesture; playback: 'gesture' | 'crumple' | 'unfold'; onPlaybackEnd: () => void; onError: () => void;
}>;
export default PaperCrumple;
