import { ContentRating, SourceIntents, type ExtensionInfo } from "@paperback/types";

export default {
  name: "Niceoppai",
  description: "Extension that pulls content from Niceoppai.net.",
  version: "1.0.0-alpha.1",
  icon: "icon.png",
  language: "th",
  contentRating: ContentRating.MATURE,
  capabilities: [
    SourceIntents.DISCOVER_SECTION_PROVIDING,
    SourceIntents.SEARCH_RESULT_PROVIDING,
    SourceIntents.CHAPTER_PROVIDING,
  ],
  badges: [],
  developers: [
    {
      name: "Thitiphatx",
      github: "https://github.com/Thitiphatx",
    },
  ],
} satisfies ExtensionInfo;
