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

import { MangaThaiParser } from "./parsers";
import type MangaThaiConfig from "./pbconfig";

const DOMAIN = "https://www.mangathai.com";

export class MangaThaiExtension implements ExtensionImpl<typeof MangaThaiConfig> {
  parser = new MangaThaiParser();

  async initialise(): Promise<void> {}

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "latest_comic",
        title: "Latest Manga",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "popular_manga",
        title: "Popular Manga",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "ongoing_manga",
        title: "On-going Manga",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "complete_manga",
        title: "Complete Manga",
        type: DiscoverSectionType.simpleCarousel,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: { page?: number } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = metadata?.page ?? 1;

    let param = "";
    switch (section.id) {
      case "latest_comic":
        param = `${page}`;
        break;
      case "popular_manga":
        param = `${page}/?s=mostviews`;
        break;
      case "ongoing_manga":
        param = `${page}/?s=manga-ongoing`;
        break;
      case "complete_manga":
        param = `${page}/?s=manga-end`;
        break;
      default:
        return { items: [] };
    }

    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/page/${param}`,
      method: "GET",
    });

    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    
    // In old code, getHomePageSections uses parseHomeSections for latest,
    // and getViewMoreItems uses parseViewMore.
    // For pagination/DiscoverSectionItems we can just use parseHomeSections for simple carousels.
    const items = this.parser.parseHomeSections($);
    const isLast = this.parser.isLastPage($);

    return {
      items,
      metadata: isLast ? undefined : { page: page + 1 },
    };
  }

  async getSearchResults(
    query: SearchQuery<any>,
    metadata: { page?: number } | undefined,
    sortingOption: SortingOption | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    // The old code search does not paginate.
    const url = `${DOMAIN}/?s=${encodeURIComponent(query.title ?? "")}`;

    const [, buffer] = await Application.scheduleRequest({
      url,
      method: "GET",
    });

    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    const items = this.parser.parseSearch($);

    return {
      items,
    };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/${mangaId}/`, // The legacy used MT_DOMAIN/ + mangaId
      method: "GET",
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
      url: `${DOMAIN}/${sourceManga.mangaId}/`,
      method: "GET",
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return this.parser.parseChapters($, sourceManga.mangaId);
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/${chapter.sourceManga.mangaId}/${chapter.chapterId}/`,
      method: "GET",
      headers: {
        cookie: "configPageView=all",
      },
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return this.parser.parseChapterDetails($, chapter.sourceManga.mangaId, chapter.chapterId);
  }
}

export const MangaThai = new MangaThaiExtension();
