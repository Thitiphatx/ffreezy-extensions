import type { CheerioAPI } from "cheerio";
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

export class MikudoujinParser {
  parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
    const title = entities.decodeHTML($("div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b").first().text().trim());
    const row = $("div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row");
    
    const image = $("div.col-12.col-md-4 > img", row).attr("src") ?? "https://i.imgur.com/GYUxEX8.png";
    const story = $("div.col-12.col-md-8 > p:nth-child(3) > small > a", row).text().trim() ?? "";
    const author = $("div.col-12.col-md-8 > p:nth-child(4) > small > a", row).text().trim() ?? "";
    const description = $("div.col-12.col-md-8", row).contents().first().text().trim() ?? "";

    const arrayTags: Tag[] = [];
    for (const tag of $("div.tags", "div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > small:nth-child(12)").toArray()) {
      const label = $("a.badge.badge-secondary.badge-up", tag).text().trim();
      if (!label) continue;
      arrayTags.push({ id: label, title: label });
    }
    arrayTags.push({ id: encodeURI(author), title: author });
    if (!story.includes("ทั่วไป")) {
      arrayTags.push({ id: encodeURI(story), title: `เรื่อง ${story}` });
    }

    return {
      mangaId,
      mangaInfo: {
        primaryTitle: title,
        secondaryTitles: [],
        thumbnailUrl: image,
        synopsis: description,
        author: author,
        artist: author,
        status: "ONGOING",
        contentRating: ContentRating.MATURE,
        rating: 0,
        tagGroups: arrayTags.length > 0 ? [{ id: "genres", title: "Genres", tags: arrayTags }] : [],
      },
    };
  }

  parseChapters($: CheerioAPI, mangaId: string): Chapter[] {
    const chapters: Chapter[] = [];
    let i = 0;

    const tableRows = $("tr", "div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.no-padding > table.table.table-hover.table-episode > tbody");

    if (tableRows.length !== 0) {
      for (const chapter of tableRows.toArray()) {
        i++;
        const title = $("td > a", chapter).text().trim() ?? "";
        const chapterId = $("td > a", chapter).attr("href")?.split("/")[4] ?? "";
        const timeStr = $("div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small").text().trim();
        const date = this.parseDate(timeStr);

        if (!chapterId || !title) continue;

        const chapNum = Number(chapterId.replace("ep-", ""));

        chapters.push({
          chapterId,
          sourceManga: { mangaId, mangaInfo: { primaryTitle: "", secondaryTitles: [], synopsis: "", contentRating: ContentRating.MATURE, thumbnailUrl: "" } },
          title: entities.decodeHTML(title),
          langCode: "th",
          chapNum: isNaN(chapNum) ? i : chapNum,
          publishDate: date,
        });
        i--;
      }
    } else {
      const title = $("div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b").first().text().trim();
      const dateStr = $("div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.sr-post-header > small").first().text().trim();
      const time = this.parseDate(dateStr);
      chapters.push({
        chapterId: "null",
        sourceManga: { mangaId, mangaInfo: { primaryTitle: "", secondaryTitles: [], synopsis: "", contentRating: ContentRating.MATURE, thumbnailUrl: "" } },
        title: entities.decodeHTML(title),
        langCode: "th",
        chapNum: 1,
        publishDate: time,
      });
    }

    return chapters;
  }

  parseChapterDetails($: CheerioAPI, mangaId: string, chapterId: string): ChapterDetails {
    const pages: string[] = [];

    for (const images of $("img", "#manga-content").toArray()) {
      let image = $(images).attr("data-src")?.trim();
      if (image && image.startsWith("/")) image = "https:" + image;
      if (image) pages.push(image);
    }

    return {
      id: chapterId,
      mangaId,
      pages,
    };
  }

  parseHomeSections($: CheerioAPI): DiscoverSectionItem[] {
    const items: DiscoverSectionItem[] = [];

    for (const item of $("div.col-6.col-sm-4.col-md-3.mb-3.inz-col", "div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row").toArray()) {
      const image = $("a.no-underline.inz-a > img.inz-img-thumbnail", item).first().attr("src") ?? "";
      const title = $("a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title", item).first().text().trim() ?? "";
      const id = $("a.no-underline.inz-a", item).attr("href")?.split("/")[3] ?? "";
      const subtitle = $("a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small", item).first().text().trim() ?? "";
      
      if (!id || !title) continue;

      items.push({
        type: "simpleCarouselItem",
        mangaId: id,
        title: entities.decodeHTML(title),
        imageUrl: image || "https://i.imgur.com/GYUxEX8.png",
        subtitle,
      });
    }

    return items;
  }

  parseRandomManga($: CheerioAPI): DiscoverSectionItem[] {
    const items: DiscoverSectionItem[] = [];

    for (const item of $("div.col-6.col-sm-4.col-md-3.mb-3.inz-col", "div.container > div.row > div.col-12.col-md-9 > div.card > div.card-body > div.row").toArray()) {
      const image = $("a > img", item).first().attr("src") ?? "";
      const title = $("a > div.inz-thumbnail-title-box > div.inz-title", item).first().text().trim() ?? "";
      const id = $("a", item).attr("href")?.split("/")[3] ?? "";
      
      if (!id || !title) continue;
      
      items.push({
        type: "simpleCarouselItem",
        mangaId: id,
        title: entities.decodeHTML(title),
        imageUrl: image || "https://i.imgur.com/GYUxEX8.png",
      });
    }
    
    return items;
  }

  parseViewMore($: CheerioAPI): SearchResultItem[] {
    const comics: SearchResultItem[] = [];
    const collectedIds: string[] = [];

    for (const item of $("div.col-6.col-sm-4.col-md-3.mb-3.inz-col", "div.container > div.row > div.col-sm-12.col-md-9 > div.card > div.card-body > div.row").toArray()) {
      const image = $("a.no-underline.inz-a > img.inz-img-thumbnail", item).first().attr("src") ?? "";
      const title = $("a.no-underline.inz-a > div.inz-thumbnail-title-box > div.inz-title", item).first().text().trim() ?? "";
      const id = $("a.no-underline.inz-a", item).attr("href")?.split("/")[3] ?? "";
      const subtitle = $("a.no-underline.inz-a > div.row.inz-detail > div.col-6.text-left > small", item).first().text().trim() ?? "";
      
      if (!id || !title) continue;
      if (collectedIds.includes(id)) continue;

      comics.push({
        mangaId: id,
        title: entities.decodeHTML(title),
        imageUrl: image || "https://i.imgur.com/GYUxEX8.png",
        subtitle,
      });
      collectedIds.push(id);
    }
    return comics;
  }

  parseSearch($: CheerioAPI, mangaId: string): SearchResultItem[] {
    const mangaItems: SearchResultItem[] = [];
    const image = $("div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-4 > img").attr("src") ?? "https://i.imgur.com/GYUxEX8.png";
    const title = $("div.container > div.row > div.col-12.col-md-9 div.card > div.card-header > b").first().text().trim();
    const subtitle = $("div.container > div.row > div.col-12.col-md-9 div.card > div.card-body.sr-card-body > div.row > div.col-12.col-md-8 > p:nth-child(4) > small > a").text().trim() ?? "";

    if (title) {
      mangaItems.push({
        mangaId: mangaId,
        title: title,
        imageUrl: image,
        subtitle,
      });
    }
    return mangaItems;
  }

  parseSearchtag($: CheerioAPI): SearchResultItem[] {
    return this.parseViewMore($);
  }

  isLastPage($: CheerioAPI): boolean {
    let isLast = false;
    const pages: number[] = [];
    for (const page of $("option", "div.container > div.row > div.col-sm-12.col-md-9 > div.row.mb-3 > div.col-md-8.col-4 > select").toArray()) {
      const p = Number($(page).text().trim());
      if (isNaN(p)) continue;
      pages.push(p);
    }
    const lastPage = Math.max(...pages, 1);
    const currentPageStr = $("div.container > div.row > div.col-sm-12.col-md-9 > div.row.mb-3 > div.col-md-8.col-4 > select").val();
    const currentPage = Number(currentPageStr);
    if (currentPage >= lastPage) isLast = true;
    return isLast;
  }

  private parseDate(date: string): Date {
    const number = Number(date.replace(/[^0-9]/g, ""));
    if (date.includes("LESS THAN AN HOUR") || date.includes("JUST NOW")) {
      return new Date();
    } else if (date.includes("ปี") || date.includes("YEARS")) {
      return new Date(Date.now() - number * 31556952000);
    } else if (date.includes("เดือน") || date.includes("MONTHS")) {
      return new Date(Date.now() - number * 2592000000);
    } else if (date.includes("สัปดาห์") || date.includes("WEEKS")) {
      return new Date(Date.now() - number * 604800000);
    } else if (date.includes("YESTERDAY")) {
      return new Date(Date.now() - 86400000);
    } else if (date.includes("วัน") || date.includes("DAYS")) {
      return new Date(Date.now() - number * 86400000);
    } else if (date.includes("ชั่วโมง") || date.includes("HOURS")) {
      return new Date(Date.now() - number * 3600000);
    } else if (date.includes("นาที") || date.includes("MINUTES")) {
      return new Date(Date.now() - number * 60000);
    } else if (date.includes("วินาที") || date.includes("SECONDS")) {
      return new Date(Date.now() - number * 1000);
    } else {
      const split = date.split("-");
      if (split.length === 3) {
        return new Date(Number(split[2]), Number(split[0]) - 1, Number(split[1]));
      }
    }
    return new Date();
  }
}
