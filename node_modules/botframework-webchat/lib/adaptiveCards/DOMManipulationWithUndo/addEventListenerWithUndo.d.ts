import type { UndoFunction } from './types/UndoFunction';
/**
 * Listens to event. Returns a function, when called, will stop listening.
 */
export default function addEventListenerWithUndo(element: HTMLElement | undefined, name: string, handler: EventListener, options?: AddEventListenerOptions | boolean): UndoFunction;
//# sourceMappingURL=addEventListenerWithUndo.d.ts.map