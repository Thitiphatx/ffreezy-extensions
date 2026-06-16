import {
  type Chapter,
  type ChapterDetails,
  type DiscoverSectionItem,
  type SearchResultItem,
  type SourceManga,
} from "@paperback/types";
import { ContentRating } from "@paperback/types";
import type { CheerioAPI } from "cheerio";
import * as entities from "entities";

export class MangaThaiParser {
  parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
    const title = entities.decodeHTML($("#thisPostname").first().text().trim());
    let image =
      $("#img-pc > div.aniframe > img.img-responsive").attr("src") ??
      "https://i.imgur.com/GYUxEX8.png";

    const description = entities.decodeHTML(
      $(
        "body > div.container > div.panel.panel-info > div.panel-body > div > div.col-lg-9.col-sm-8.col-xs-12 > div > div > p",
      )
        .text()
        .trim() ?? "",
    );

    const rawStatus =
      $(
        "div.container > div.panel.panel-info > div.panel-body > div > div.col-lg-9.col-sm-8.col-xs-12 > p:nth-child(2) > span",
      ).text() ?? "";
    const status = rawStatus === "จบ" ? "COMPLETED" : "ONGOING";

    return {
      mangaId,
      mangaInfo: {
        primaryTitle: title,
        secondaryTitles: [],
        thumbnailUrl: image,
        synopsis: description,
        contentRating: ContentRating.MATURE,
        status: status,
        rating: 0,
      },
    };
  }

  parseChapters($: CheerioAPI, mangaId: string): Chapter[] {
    const chapters: Chapter[] = [];
    let i = 0;

    for (const chapter of $(
      "tr",
      "body > div.container > div.table-responsive > table > tbody",
    ).toArray()) {
      i++;
      const titleText =
        $("td.chapter-name > a", chapter)
          .text()
          .trim()
          .replace(/[^\d.-]/g, "") ?? "";
      const chapterId = $("td.chapter-name > a", chapter).attr("href")?.split("/")[4] ?? "";

      if (!chapterId) continue;

      const chapNum = Math.abs(Number(chapterId.replace(/[^\d.-]/g, "")));
      const timeStr = $("td:nth-child(2)", chapter).text().trim();
      const date = this.parseDate(timeStr);

      if (!chapterId || !titleText) continue;

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
        title: entities.decodeHTML(`ตอนที่. ${titleText}`),
        langCode: "th",
        chapNum: isNaN(chapNum) ? i : chapNum,
        publishDate: date,
      });

      i--; // Based on original code logic
    }
    return chapters;
  }

  parseChapterDetails($: CheerioAPI, mangaId: string, chapterId: string): ChapterDetails {
    const pages: string[] = [];

    for (const images of $("img", "div.container-fluid > center > div.display_content").toArray()) {
      let image = $(images).attr("src")?.trim();
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

    for (const comic of $(
      "div.col-lg-3.col-md-3.col-sm-4.col-smx-4.col-xs-6 > div.aniframe",
      "div.container",
    ).toArray()) {
      let image = encodeURI($("a:nth-child(2) > img", comic).first().attr("src") ?? "") ?? "";

      const title = $("a.manga-title", comic).first().text().trim() ?? "";
      const id = $("a.manga-title", comic).attr("href")?.split("/")[3] ?? "";
      const sub =
        $("span.label-update.label.label-default.label-ago", comic)
          .first()
          .text()
          .trim()
          .split(" ") ?? [];
      const subtitle = sub.length >= 3 ? `${sub[0]} ${sub[1]}${sub[2]}` : "";

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

  parseViewMore($: CheerioAPI): SearchResultItem[] {
    const comics: SearchResultItem[] = [];
    const collectedIds: string[] = [];

    for (const item of $(
      "div.col-lg-3.col-md-3.col-sm-4.col-smx-4.col-xs-6 > div.aniframe",
      "div.container",
    ).toArray()) {
      let image = encodeURI($("a:nth-child(2) > img", item).first().attr("src") ?? "") ?? "";

      const title = $("a.manga-title", item).first().text().trim() ?? "";
      const id = $("a.manga-title", item).attr("href")?.split("/")[3] ?? "";
      const sub =
        $("span.label-update.label.label-default.label-ago", item)
          .first()
          .text()
          .trim()
          .split(" ") ?? [];
      const subtitle = sub.length >= 3 ? `${sub[0]} ${sub[1]}${sub[2]}` : "";

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

  parseSearch($: CheerioAPI): SearchResultItem[] {
    return this.parseViewMore($);
  }

  isLastPage($: CheerioAPI): boolean {
    let isLast = false;
    const pages: number[] = [];
    for (const page of $(
      "li a",
      "body > div:nth-child(4) > center > ul.pagination.pagination-lg",
    ).toArray()) {
      const p = Number($(page).text().trim());
      if (isNaN(p)) continue;
      pages.push(p);
    }
    const lastPage = Math.max(...pages, 1);
    const currentPageStr = $("body > div:nth-child(4) > center > ul > li.active").text().trim();
    const currentPage = Number(currentPageStr);
    if (currentPage >= lastPage) isLast = true;
    return isLast;
  }

  private parseDate(date: string): Date {
    const number = Number(date.replace(/[^0-9]/g, ""));
    if (date.includes("LESS THAN AN HOUR") || date.includes("JUST NOW")) {
      return new Date(Date.now());
    } else if (date.includes("ปี") || date.includes("YEARS")) {
      return new Date(Date.now() - number * 31556952000);
    } else if (date.includes("เดือน") || date.includes("MONTHS")) {
      return new Date(Date.now() - number * 2592000000);
    } else if (date.includes("อาทิตย์") || date.includes("WEEKS")) {
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
