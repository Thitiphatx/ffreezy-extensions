/* SPDX-License-Identifier: GPL-3.0-or-later */

import {
  URL,
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
  DiscoverSectionType,
} from "@paperback/types";
import * as cheerio from "cheerio";

import { NiceoppaiParser } from "./parsers";
import type NiceoppaiConfig from "./pbconfig";

const DOMAIN = "https://www.niceoppai.net";
const USER_AGENT = "Mozilla / 5.0 (compatible; MSIE 7.0; Windows; U; Windows NT 6.0; Win64; x64 Trident / 4.0)";

export class NiceoppaiExtension implements ExtensionImpl<typeof NiceoppaiConfig> {
  parser = new NiceoppaiParser();

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
        url: `${DOMAIN}/latest-chapters/${page}`,
        method: "GET",
        headers: { "user-agent": USER_AGENT },
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
    sortingOption: SortingOption | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    let param = "";
    if (query.title) {
      param = `search/${encodeURIComponent(query.title)}`;
    } else {
      // In old code: category/${query?.includedTags[0]}
      param = "search/"; 
    }

    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/manga_list/${param}`,
      method: "GET",
      headers: { "user-agent": USER_AGENT },
    });

    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    const items = this.parser.parseSearch($);

    return {
      items,
    };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/${mangaId}`,
      method: "GET",
      headers: { "user-agent": USER_AGENT },
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    const manga = this.parser.parseMangaDetails($, mangaId);

    return {
      ...manga,
      mangaInfo: {
        ...manga.mangaInfo,
        shareUrl: `${DOMAIN}/${mangaId}`,
      },
    };
  }

  async getChapters(sourceManga: SourceManga, sinceDate?: Date): Promise<Chapter[]> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/${sourceManga.mangaId}`,
      method: "GET",
      headers: { "user-agent": USER_AGENT },
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return this.parser.parseChapters($, sourceManga.mangaId);
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/${chapter.sourceManga.mangaId}/${chapter.chapterId}`,
      method: "GET",
      headers: { "user-agent": USER_AGENT },
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return this.parser.parseChapterDetails($, chapter.sourceManga.mangaId, chapter.chapterId);
  }
}

export const Niceoppai = new NiceoppaiExtension();
