import {
  type Chapter,
  type ChapterDetails,
  type DiscoverSectionItem,
  type SearchResultItem,
  type SourceManga,
  type Tag,
} from "@paperback/types";
import { ContentRating } from "@paperback/types";
import * as entities from "entities";

import type { ChapterImage, HomeData, MangaDetails, SearchData } from "./models";

export class NekopostParser {
  parseMangaDetails(data: MangaDetails, mangaId: string): SourceManga {
    const titles: string[] = [];
    const projectName = data.projectInfo.projectName ?? "";
    const alias = data.projectInfo.aliasName ?? "";
    const imageVersion = data.projectInfo.imageVersion ?? "";

    const image = `https://www.osemocphoto.com/collectManga/${mangaId}/${mangaId}_cover.jpg?${imageVersion}`;

    const author = data.projectInfo.authorName ?? "";
    const artist = data.projectInfo.artistName ?? "";
    const info = data.projectInfo.info ?? "";

    if (projectName) titles.push(projectName);
    if (alias) titles.push(alias);

    const arrayTags: Tag[] = [];
    for (const tag of data.listCate ?? []) {
      const label = tag.cateName ?? "";
      const id = tag.cateCode ?? "";
      if (!id || !label) continue;
      arrayTags.push({ id, title: label });
    }

    const rawStatus = data.projectInfo.status ?? "";
    const status = rawStatus === "0" ? "COMPLETED" : "ONGOING";

    return {
      mangaId,
      mangaInfo: {
        primaryTitle: titles[0] ?? "",
        secondaryTitles: titles.slice(1),
        thumbnailUrl: image,
        synopsis: info,
        author,
        artist,
        status,
        contentRating: ContentRating.MATURE,
        rating: 0,
        tagGroups: arrayTags.length > 0 ? [{ id: "genres", title: "Genres", tags: arrayTags }] : [],
      },
    };
  }

  parseChapters(data: MangaDetails, mangaId: string): Chapter[] {
    const chapters: Chapter[] = [];
    let i = 0;

    for (const chapter of data.listChapter ?? []) {
      i++;
      const title = chapter.chapterName ?? "";
      const chapterId = chapter.chapterId ?? "";

      if (!chapterId) continue;

      const chapNum = Number(chapter.chapterNo);
      const date = new Date(chapter.publishDate);

      chapters.push({
        chapterId,
        sourceManga: {
          mangaId,
          mangaInfo: {
            primaryTitle: "",
            secondaryTitles: [],
            synopsis: "",
            contentRating: ContentRating.MATURE,
            thumbnailUrl: "",
          },
        },
        title: entities.decodeHTML(title),
        langCode: "th",
        chapNum: isNaN(chapNum) ? i : chapNum,
        publishDate: date,
      });

      i--; // Based on original code logic
    }
    return chapters;
  }

  parseChapterDetails(data: ChapterImage, mangaId: string, chapterId: string): ChapterDetails {
    const pages: string[] = [];
    for (const images of data.pageItem ?? []) {
      const imageFile = images.pageName ? images.pageName : images.fileName;
      if (imageFile) {
        pages.push(`https://www.osemocphoto.com/collectManga/${mangaId}/${chapterId}/${imageFile}`);
      }
    }

    return {
      id: chapterId,
      mangaId,
      pages,
    };
  }

  parseHomeSections(data: HomeData): DiscoverSectionItem[] {
    const items: DiscoverSectionItem[] = [];

    for (const manga of data.listChapter ?? []) {
      const id = manga.projectId ?? "";
      const imageVersion = manga.imageVersion ?? "";
      const image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}`;

      const title = manga.projectName ?? "";
      const subtitle = `Ch.${manga.chapterNo} ${manga.chapterName}`.trim();

      if (!id || !title) continue;

      items.push({
        type: "simpleCarouselItem",
        mangaId: id,
        title: entities.decodeHTML(title),
        imageUrl: image,
        subtitle,
      });
    }

    return items;
  }

  parseViewMore(data: HomeData): SearchResultItem[] {
    const comics: SearchResultItem[] = [];
    const collectedIds: string[] = [];

    for (const manga of data.listChapter ?? []) {
      const id = manga.projectId ?? "";
      const imageVersion = manga.imageVersion ?? "";
      const image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}`;

      const title = manga.projectName ?? "";
      const subtitle = `Ch.${manga.chapterNo} ${manga.chapterName}`.trim();

      if (!id || !title) continue;
      if (collectedIds.includes(id)) continue;

      comics.push({
        mangaId: id,
        title: entities.decodeHTML(title),
        imageUrl: image,
        subtitle,
      });
      collectedIds.push(id);
    }
    return comics;
  }

  parseSearch(data: SearchData): SearchResultItem[] {
    const mangaItems: SearchResultItem[] = [];
    const collectedIds: string[] = [];

    if (data.listProject != null) {
      for (const manga of data.listProject) {
        const id = manga.projectId ?? "";
        const imageVersion = manga.imageVersion ?? "";
        const image = `https://www.osemocphoto.com/collectManga/${id}/${id}_cover.jpg?${imageVersion}`;
        const title = manga.projectName ?? "";
        const subtitle = `Ch.${manga.noChapter ?? ""}`.trim();

        if (!id || !title || !image) continue;
        if (collectedIds.includes(id)) continue;

        mangaItems.push({
          mangaId: id,
          title: title,
          imageUrl: image,
          subtitle,
        });
        collectedIds.push(id);
      }
    }
    return mangaItems;
  }
}
