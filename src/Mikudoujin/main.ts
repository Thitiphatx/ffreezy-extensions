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

import { MikudoujinParser } from "./parsers";
import type MikudoujinConfig from "./pbconfig";

const DOMAIN = "https://www.miku-doujin.com";

export class MikudoujinExtension implements ExtensionImpl<typeof MikudoujinConfig> {
  parser = new MikudoujinParser();

  async initialise(): Promise<void> {}

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "latest_doujin",
        title: "Latest Doujin",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "random_52e6d",
        title: "Random 1",
        type: DiscoverSectionType.simpleCarousel,
      },
      {
        id: "random_wfxsq",
        title: "Random 2",
        type: DiscoverSectionType.simpleCarousel,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: { page?: number } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = metadata?.page ?? 1;

    if (section.id === "latest_doujin") {
      const [, buffer] = await Application.scheduleRequest({
        url: `${DOMAIN}/?page=${page}`,
        method: "GET",
      });
      const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
      const items = this.parser.parseHomeSections($);
      const isLast = this.parser.isLastPage($);

      return {
        items,
        metadata: isLast ? undefined : { page: page + 1 },
      };
    } else if (section.id.startsWith("random_")) {
      const id = section.id.replace("random_", "");
      const [, buffer] = await Application.scheduleRequest({
        url: `${DOMAIN}/${id}/`,
        method: "GET",
      });
      const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
      const items = this.parser.parseRandomManga($);

      return {
        items,
      };
    }

    return { items: [] };
  }

  async getSearchResults(
    query: SearchQuery<any>,
    _metadata: { page?: number } | undefined,
    _sortingOption: SortingOption | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    if (query.title) {
      const [, buffer] = await Application.scheduleRequest({
        url: encodeURI(query.title),
        method: "GET",
      });
      const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
      const id = query.title.split("/")[3] ?? "";
      const items = this.parser.parseSearch($, id);

      return { items };
    }

    // Advanced search logic could go here but it's complex in original.
    return { items: [] };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/${mangaId}/`,
      method: "GET",
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    const manga = this.parser.parseMangaDetails($, mangaId);

    return {
      ...manga,
      mangaInfo: {
        ...manga.mangaInfo,
        shareUrl: `${DOMAIN}/${mangaId}/`,
      },
    };
  }

  async getChapters(sourceManga: SourceManga, _sinceDate?: Date): Promise<Chapter[]> {
    const [, buffer] = await Application.scheduleRequest({
      url: `${DOMAIN}/${sourceManga.mangaId}/`,
      method: "GET",
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return this.parser.parseChapters($, sourceManga.mangaId);
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const url =
      chapter.chapterId !== "null"
        ? `${DOMAIN}/${chapter.sourceManga.mangaId}/${chapter.chapterId}/`
        : `${DOMAIN}/${chapter.sourceManga.mangaId}/`;

    const [, buffer] = await Application.scheduleRequest({
      url,
      method: "GET",
    });
    const $ = cheerio.load(Application.arrayBufferToUTF8String(buffer));
    return this.parser.parseChapterDetails($, chapter.sourceManga.mangaId, chapter.chapterId);
  }
}

export const Mikudoujin = new MikudoujinExtension();
