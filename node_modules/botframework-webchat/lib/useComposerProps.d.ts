import { AttachmentForScreenReaderMiddleware, AttachmentMiddleware } from 'botframework-webchat-api';
export default function useComposerProps({ attachmentForScreenReaderMiddleware, attachmentMiddleware, renderMarkdown, styleOptions, styleSet }: {
    attachmentForScreenReaderMiddleware: AttachmentForScreenReaderMiddleware[];
    attachmentMiddleware: AttachmentMiddleware[];
    renderMarkdown?: (markdown: string, newLineOptions: {
        markdownRespectCRLF: boolean;
    }, linkOptions: {
        externalLinkAlt: string;
    }) => string;
    styleOptions: any;
    styleSet: any;
}): {
    attachmentForScreenReaderMiddleware: AttachmentForScreenReaderMiddleware[];
    attachmentMiddleware: AttachmentMiddleware[];
    renderMarkdown: (markdown: string, newLineOptions: {
        markdownRespectCRLF: boolean;
    }, linkOptions: {
        externalLinkAlt: string;
    }) => string;
    extraStyleSet: any;
};
//# sourceMappingURL=useComposerProps.d.ts.map