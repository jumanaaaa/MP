import type { UndoFunction } from './types/UndoFunction';
/**
 * Adds a class to the `HTMLElement` and re-add on mutations.
 *
 * @returns {function} A function, when called, will restore to previous state.
 */
export default function durableAddClassWithUndo(element: HTMLElement | undefined, className: string): UndoFunction;
//# sourceMappingURL=durableAddClassWithUndo.d.ts.map