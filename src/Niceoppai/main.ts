/* SPDX-License-Identifier: GPL-3.0-or-later */
/* Copyright © 2026 Inkdex */

import {
  BasicRateLimiter,
  DiscoverSectionType,
  type Chapter,
  type ChapterDetails,
  type DiscoverSection,
  type DiscoverSectionItem,
  type ExtensionImpl,
  type PagedResults,
  type SearchQuery,
  type SearchResultItem,
  type SourceManga,
  type TagSection,
} from "@paperback/types";
import * as cheerio from "cheerio";

import { NiceoppaiInterceptor } from "./interceptors";
import { NICEOPPAI_TAGS, type NiceoppaiSearchMetadata } from "./models";
import {
  fetchChapterDetailsPage,
  fetchHomepage,
  fetchMangaDetailsPage,
  fetchRecent,
  fetchSearchPage,
} from "./networks";
import {
  parseChapterDetails,
  parseChapterPage,
  parseChapters,
  parseMangaDetails,
  parseRecentSection,
  parseSearch,
  parseTrendingSection,
} from "./parsers";
import type MangapillConfig from "./pbconfig";

export class NiceoppaiExtension implements ExtensionImpl<typeof MangapillConfig> {
  globalRateLimiter = new BasicRateLimiter("ratelimiter", {
    numberOfRequests: 10,
    bufferInterval: 0.5,
    ignoreImages: true,
  });

  requestManager = new NiceoppaiInterceptor("main");

  async initialise(): Promise<void> {
    this.globalRateLimiter.registerInterceptor();
    this.requestManager.registerInterceptor();
    if (Application.isResourceLimited) return;
  }

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "popular",
        title: "Popular Mangas",
        type: DiscoverSectionType.featured,
      },

      {
        id: "recent",
        title: "Recently Updated",
        type: DiscoverSectionType.chapterUpdates,
      },

      { id: "genre", title: "Genres", type: DiscoverSectionType.genres },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    let items: DiscoverSectionItem[] = [];

    switch (section.id) {
      case "popular": {
        const [_, buffer] = await fetchHomepage();
        const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
        items = await parseTrendingSection($);
        break;
      }
      case "recent": {
        const [_, buffer] = await fetchRecent();
        const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
        items = await parseRecentSection($);
        break;
      }
      case "genre": {
        items = NICEOPPAI_TAGS[0].tags.map((genre) => ({
          type: "genresCarouselItem",
          searchQuery: {
            title: "",
            metadata: {
              genres: [genre.id],
            },
          },
          name: genre.title,
          metadata: metadata,
        }));
      }
    }
    return { items, metadata };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const [_, buffer] = await fetchMangaDetailsPage(mangaId);
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return await parseMangaDetails($, mangaId);
  }

  async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
    const [_, buffer] = await fetchMangaDetailsPage(sourceManga.mangaId);
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    const lastChapterPage = await parseChapterPage($);
    let allChapters: Chapter[] = [];
    if (lastChapterPage) {
      let page = 1;
      while (page <= Number(lastChapterPage)) {
        const [_, buffer] = await fetchMangaDetailsPage(sourceManga.mangaId, page.toString());
        const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
        allChapters = allChapters.concat(parseChapters($, sourceManga));
        page++;
      }
    } else {
      allChapters = parseChapters($, sourceManga);
    }
    return allChapters;
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const [_, buffer] = await fetchChapterDetailsPage(
      chapter.sourceManga.mangaId,
      chapter.chapterId,
    );
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return parseChapterDetails($, chapter.sourceManga.mangaId, chapter.chapterId);
  }

  async supportsTagExclusion(): Promise<boolean> {
    return false;
  }

  async getSearchTags(): Promise<TagSection[]> {
    return NICEOPPAI_TAGS;
  }

  async getSearchResults(
    query: SearchQuery<any>,
    metadata: NiceoppaiSearchMetadata | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    const page = metadata?.page ?? 1;
    const paths = [];

    if (query.title) {
      paths.push(query.title);
    } else if (query.metadata?.genres?.length) {
      paths.push(query.metadata.genres[0]);
    } else {
      paths.push("");
    }

    paths.push(page.toString());

    const response = await fetchSearchPage(paths, []);
    const $ = cheerio.load(Application.arrayBufferToUTF8String(response[1]));

    const items = await parseSearch($);

    let mData: NiceoppaiSearchMetadata | undefined = undefined;
    if (items.length > 0) {
      mData = { page: page + 1 };
    }

    return { items, metadata: mData };
  }
}

export const Niceoppai = new NiceoppaiExtension();
