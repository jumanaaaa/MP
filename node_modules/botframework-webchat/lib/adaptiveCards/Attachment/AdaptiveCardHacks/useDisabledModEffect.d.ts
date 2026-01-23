import type { AdaptiveCard } from 'adaptivecards';
/**
 * Accessibility: Form fields in Adaptive Cards need to be disabled to reduce confusion for screen reader users.
 *
 * One exception is the `Action.ShowUrl`, this is because this action is expand/collapse of an accordion control.
 * Similar to `<details>`/`<summary>`, accordion must not allowed to be disabled.
 */
export default function useDisabledModEffect(adaptiveCard: AdaptiveCard): readonly [(cardElement: HTMLElement, disabled: boolean) => void, () => void];
//# sourceMappingURL=useDisabledModEffect.d.ts.map