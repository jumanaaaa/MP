import type { AdaptiveCard } from 'adaptivecards';
/**
 * Accessibility: Action in ActionSet/CardElement should be push button.
 *
 * Pressing the action button is a decision-making process. The decision made by the end-user need to be read by the screen reader.
 * Thus, we need to indicate what decision the end-user made.
 *
 * Since action buttons are button, the intuitive way to indicate selection of a button is marking it as pressed.
 *
 * One exception is the `Action.ShowUrl` action. This button represents expand/collapse header of an accordion.
 * Thus, their state is indicated by `aria-expanded`, instead of `aria-pressed`.
 * However, we still need to remove other unnecessary ARIA fields.
 */
export default function useActionShouldBePushButtonModEffect(adaptiveCard: AdaptiveCard): readonly [(cardElement: HTMLElement, actionPerformedClassName?: string) => void, () => void];
//# sourceMappingURL=useActionShouldBePushButtonModEffect.d.ts.map