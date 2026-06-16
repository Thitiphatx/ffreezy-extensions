/* SPDX-License-Identifier: GPL-3.0-or-later */

import { ContentRating, SourceIntents, type ExtensionInfo } from "@paperback/types";

export default {
  name: "Mikudoujin",
  description: "Extension that pulls comics from miku-doujin.com.",
  version: "1.0.6-alpha.1",
  icon: "icon.png",
  language: "th",
  contentRating: ContentRating.MATURE,
  capabilities: [
    SourceIntents.CHAPTER_PROVIDING,
    SourceIntents.DISCOVER_SECTION_PROVIDING,
    SourceIntents.SEARCH_RESULT_PROVIDING,
  ],
  badges: [{ label: "18+", textColor: "#FFFFFF", backgroundColor: "#FF0000" }],
  developers: [
    {
      name: "Thitiphatx",
      github: "https://github.com/Thitiphatx",
    },
  ],
} satisfies ExtensionInfo;
