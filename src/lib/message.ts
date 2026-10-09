/** A stored translation key and values, independent of the selected language. */
export type TranslationMessage = {
  key: string;
  values: Record<string, unknown>;
};
