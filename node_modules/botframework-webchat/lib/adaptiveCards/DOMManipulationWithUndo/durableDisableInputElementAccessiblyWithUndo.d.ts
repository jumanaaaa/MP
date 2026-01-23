import type { UndoFunction } from './types/UndoFunction';
/**
 * Disables an input element in accessible fashion with undo function.
 *
 * This is designed for accessibility and mimick the behavior of `disabled` attribute in accessible form:
 *
 * - Take away from focus ring;
 *   - If currently focused, do not move focus;
 * - Mark content as readonly.
 *
 * Thus, it should not impact hyperlinks or other contents which are not affected by `disabled` attribute.
 *
 * For simplicity, currently, we did not disable element with `contenteditable` attribute.
 *
 * We only disable these elements: `<button>`, `<input>`, `<select>`, `<textarea>`.
 *
 * We need durability as Adaptive Cards occasionally reset `tabindex="0"`.
 *
 * @returns {function} A function, when called, will restore to previous state.
 */
export default function durableDisableInputElementAccessiblyWithUndo(element: HTMLElement | undefined): UndoFunction;
//# sourceMappingURL=durableDisableInputElementAccessiblyWithUndo.d.ts.map