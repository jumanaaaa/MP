import type { AdaptiveCard, GlobalSettings as GlobalSettingsType, HostConfig as HostConfigType } from 'adaptivecards';
export default function renderAdaptiveCard(adaptiveCard: AdaptiveCard, { adaptiveCardsHostConfig, adaptiveCardsPackage: { GlobalSettings, HostConfig }, renderMarkdownAsHTML, setTabIndexAtCardRoot }: {
    adaptiveCardsHostConfig?: HostConfigType;
    adaptiveCardsPackage: {
        GlobalSettings: typeof GlobalSettingsType;
        HostConfig: typeof HostConfigType;
    };
    renderMarkdownAsHTML?: (markdown: string) => string;
    setTabIndexAtCardRoot: boolean;
}): {
    element: HTMLElement;
} | {
    errors: Error[];
};
//# sourceMappingURL=renderAdaptiveCard.d.ts.map