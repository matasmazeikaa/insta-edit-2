import { TextElement } from './types';

export const DEFAULT_TEXT_STYLE: Partial<TextElement> = {
  text: '',
  positionStart: 0,
  positionEnd: 2,
  x: 540, // Center of 1080px width
  y: 960, // Center of 1920px height
  fontSize: 48,
  color: '#ffffff',
  backgroundColor: 'transparent',
  align: 'center',
  zIndex: 0,
  opacity: 100,
  rotation: 0,
  animation: 'none',
  font: 'Arial',
};

