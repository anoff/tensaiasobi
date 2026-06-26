import React from 'react';

/**
 * Normalizes and extracts pointer coordinates (clientX/clientY) relative to a `<canvas>` element,
 * dynamically scaling them to map perfectly to the canvas's internal drawing width and height coordinates.
 * Supports both React synthetic events and standard DOM events.
 */
export function getCanvasCoords(
  canvas: HTMLCanvasElement | null,
  e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent
): { x: number; y: number } | null {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  let clientX: number;
  let clientY: number;

  if ('touches' in e) {
    const touches = (e as TouchEvent).touches;
    const changedTouches = (e as TouchEvent).changedTouches;
    const targetTouch = touches && touches.length > 0 ? touches[0] : (changedTouches && changedTouches.length > 0 ? changedTouches[0] : null);
    
    if (!targetTouch) return null;
    clientX = targetTouch.clientX;
    clientY = targetTouch.clientY;
  } else {
    // Mouse/Pointer event handling
    clientX = (e as MouseEvent).clientX;
    clientY = (e as MouseEvent).clientY;
  }

  // Calculate scaling factor to map layout (CSS) coordinates to canvas coordinate space
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  };
}
