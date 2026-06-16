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

import type { ChapterImage, HomeData, MangaDetails, SearchData } from "./models";
import { NekopostParser } from "./parsers";
import type NekopostConfig from "./pbconfig";

export class NekopostExtension implements ExtensionImpl<typeof NekopostConfig> {
  parser = new NekopostParser();

  async initialise(): Promise<void> {}

  async getDiscoverSections(): Promise<DiscoverSection[]> {
    return [
      {
        id: "latest_comic",
        title: "Latest Mangas",
        type: DiscoverSectionType.simpleCarousel,
      },
    ];
  }

  async getDiscoverSectionItems(
    section: DiscoverSection,
    metadata: { page?: number } | undefined,
  ): Promise<PagedResults<DiscoverSectionItem>> {
    const page = metadata?.page ?? 0;

    if (section.id === "latest_comic") {
      const [, buffer] = await Application.scheduleRequest({
        url: `https://api.osemocphoto.com/frontAPI/getLatestChapterF3/m/0/12/${page}`,
        method: "GET",
      });

      const data = JSON.parse(Application.arrayBufferToUTF8String(buffer)) as HomeData;
      const items = this.parser.parseHomeSections(data);

      return {
        items,
        metadata: data ? { page: page + 12 } : undefined,
      };
    }

    return { items: [] };
  }

  async getSearchResults(
    query: SearchQuery<any>,
    metadata: { page?: number } | undefined,
    sortingOption: SortingOption | undefined,
  ): Promise<PagedResults<SearchResultItem>> {
    let url = "";
    let dataObj: unknown = undefined;

    // We do not have includedTags yet in new SearchQuery structure easily,
    // so we'll just handle title search for now.
    if (query.title) {
      url = "https://api.osemocphoto.com/frontAPI/getProjectSearch";
      dataObj = { ipKeyword: query.title };
    } else {
      url = "https://api.osemocphoto.com/frontAPI/getProjectExplore/0/n/1/S/";
    }

    const requestOptions: any = {
      url,
      method: dataObj ? "POST" : "GET",
    };

    if (dataObj) {
      requestOptions.body = JSON.stringify(dataObj);
      requestOptions.headers = { "Content-Type": "application/json" };
    }

    const [, buffer] = await Application.scheduleRequest(requestOptions);

    const data = JSON.parse(Application.arrayBufferToUTF8String(buffer)) as SearchData;
    const items = this.parser.parseSearch(data);

    return {
      items,
    };
  }

  async getMangaDetails(mangaId: string): Promise<SourceManga> {
    const [, buffer] = await Application.scheduleRequest({
      url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/${mangaId}`,
      method: "GET",
    });

    const data = JSON.parse(Application.arrayBufferToUTF8String(buffer)) as MangaDetails;
    const manga = this.parser.parseMangaDetails(data, mangaId);

    return {
      ...manga,
      mangaInfo: {
        ...manga.mangaInfo,
        shareUrl: `https://www.nekopost.net/manga/${mangaId}`,
      },
    };
  }

  async getChapters(sourceManga: SourceManga, sinceDate?: Date): Promise<Chapter[]> {
    const [, buffer] = await Application.scheduleRequest({
      url: `https://api.osemocphoto.com/frontAPI/getProjectInfo/${sourceManga.mangaId}`,
      method: "GET",
    });

    const data = JSON.parse(Application.arrayBufferToUTF8String(buffer)) as MangaDetails;
    return this.parser.parseChapters(data, sourceManga.mangaId);
  }

  async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
    const [, buffer] = await Application.scheduleRequest({
      url: `https://www.osemocphoto.com/collectManga/${chapter.sourceManga.mangaId}/${chapter.chapterId}/${chapter.sourceManga.mangaId}_${chapter.chapterId}.json`,
      method: "GET",
    });

    const data = JSON.parse(Application.arrayBufferToUTF8String(buffer)) as ChapterImage;
    return this.parser.parseChapterDetails(data, chapter.sourceManga.mangaId, chapter.chapterId);
  }
}

export const Nekopost = new NekopostExtension();
