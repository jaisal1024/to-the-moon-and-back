import { definePreviewUrl } from '@sanity/preview-url-secret/define-preview-url';

// no env needed

export const usePreview = definePreviewUrl({
  draftMode: { enable: '/api/draft' },
});
