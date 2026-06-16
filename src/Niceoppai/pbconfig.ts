/* SPDX-License-Identifier: GPL-3.0-or-later */

import { ContentRating, SourceIntents, type ExtensionInfo } from "@paperback/types";

export default {
  name: "Niceoppai",
  description: "Extension that pulls comics from Niceoppai.net.",
  version: "1.1.0-alpha.1",
  icon: "icon.png",
  language: "th",
  contentRating: ContentRating.MATURE,
  capabilities: [
    SourceIntents.CHAPTER_PROVIDING,
    SourceIntents.DISCOVER_SECTION_PROVIDING,
    SourceIntents.SEARCH_RESULT_PROVIDING,
  ],
  badges: [{ label: "Recommend", textColor: "#FFFFFF", backgroundColor: "#00FF00" }],
  developers: [
    {
      name: "Thitiphatx",
      github: "https://github.com/Thitiphatx",
    },
  ],
} satisfies ExtensionInfo;
