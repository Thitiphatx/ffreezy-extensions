/* SPDX-License-Identifier: GPL-3.0-or-later */

import {
  DiscoverSectionType,
  type Chapter,
  type ChapterDetails,
  type DiscoverSection,
  type DiscoverSectionItem,
  type ExtensionImpl,
  type PagedResults,
  type SearchQuery,
  type SearchResultItem,
  type SortingOption,
  type SourceManga,
} from "@paperback/types";
import * as cheerio from "cheerio";

import { Manga168Parser } from "./parsers";
import type Manga168Config from "./pbconfig";

const DOMAIN = "https://manga168.com";

export class Manga168Extension implements ExtensionImpl<typeof Manga168Config> {
  parser = new Manga168Parser();

  async initialise(): Promise<void> {}

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "latest_comic",
        title: "Latest Manga",
        type: DiscoverSectionType.simpleCarousel,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: { page?: number } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = metadata?.page ?? 1;

    if (section.id === "latest_comic") {
      const [, buffer] = await Application.scheduleRequest({
        url: `${DOMAIN}/page/${page}/`,
        method: "GET",
      });
      const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
      const items = this.parser.parseHomeSections($);

      const isLast = this.parser.isLastPage($);

      return {
        items,
        metadata: isLast ? undefined : { page: page + 1 },
      };
    }

    return { items: [] };
  }

  async getSearchResults(
    query: SearchQuery<any>,
    metadata: { page?: number } | undefined,
    _sortingOption: SortingOption | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    const page = metadata?.page ?? 1;
    let url = DOMAIN;

    if (query.title) {
      url = `${DOMAIN}/page/${page}/?s=${encodeURIComponent(query.title)}`;
    }

    const [, buffer] = await Application.scheduleRequest({
      url,
      method: "GET",
    });

    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    const items = this.parser.parseSearch($);
    const isLast = this.parser.isLastPage($);

    return {
      items,
      metadata: isLast ? undefined : { page: page + 1 },
    };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/manga/${mangaId}/`,
      method: "GET",
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    const manga = this.parser.parseMangaDetails($, mangaId);

    return {
      ...manga,
      mangaInfo: {
        ...manga.mangaInfo,
        shareUrl: `${DOMAIN}/manga/${mangaId}/`,
      },
    };
  }

  async getChapters(sourceManga: SourceManga, _sinceDate?: Date): Promise<Chapter[]> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/manga/${sourceManga.mangaId}/`,
      method: "GET",
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return this.parser.parseChapters($, sourceManga.mangaId);
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/${chapter.chapterId}/`,
      method: "GET",
      headers: {
        cookie: "configPageView=all",
      },
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return this.parser.parseChapterDetails($, chapter.sourceManga.mangaId, chapter.chapterId);
  }
}

export const Manga168 = new Manga168Extension();
