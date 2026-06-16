/* SPDX-License-Identifier: GPL-3.0-or-later */

import { ContentRating, SourceIntents, type ExtensionInfo } from "@paperback/types";

export default {
  name: "Manga168",
  description: "Extension that pulls comics from manga168.com",
  version: "1.0.0-alpha.1",
  icon: "icon.png",
  language: "th",
  contentRating: ContentRating.EVERYONE,
  capabilities: [
    SourceIntents.CHAPTER_PROVIDING,
    SourceIntents.DISCOVER_SECTION_PROVIDING,
    SourceIntents.SEARCH_RESULT_PROVIDING,
  ],
  badges: [],
  developers: [
    {
      name: "Thitiphatx",
      github: "https://github.com/Thitiphatx",
    },
  ],
} satisfies ExtensionInfo;
