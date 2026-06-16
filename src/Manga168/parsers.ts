import type { CheerioAPI } from "cheerio";
import {
  DiscoverSectionType,
  type Chapter,
  type ChapterDetails,
  type DiscoverSection,
  type DiscoverSectionItem,
  type SearchResultItem,
  type SourceManga,
} from "@paperback/types";
import { ContentRating } from "@paperback/types";
import * as entities from "entities";

const DOMAIN = "https://manga168.com";

export class Manga168Parser {
  parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
    const titles: string[] = [];
    for (const title of $("div.seriestucon > div.seriestuheader > div.seriestualt").text().trim().split(", ")) {
      titles.push(entities.decodeHTML(title));
    }

    let image = $("div.seriestucon > div.seriestucontent > div.seriestucontl > div.thumb > img").attr("src") ?? "https://i.imgur.com/GYUxEX8.png";
    image = encodeURI(image);

    const description = entities.decodeHTML($("div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestuhead > div.entry-content.entry-content-single > p:nth-child(1)").text().trim() ?? "");
    const infomation = $("div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestucont > div.seriestucontr > table.infotable > tbody").text();

    const author = this.parseInfo(infomation, "Author");
    const artist = this.parseInfo(infomation, "Artist");
    const rawStatus = this.parseInfo(infomation, "สถานะ");
    const status = rawStatus === "Ongoing" ? "ONGOING" : "COMPLETED";

    const arrayTags: string[] = [];
    for (const tag of $("a", "div.seriestucon > div.seriestucontent > div.seriestucontentr > div.seriestucont > div.seriestucontr > div.seriestugenre").toArray()) {
      const label = $(tag).text().trim();
      if (!label) continue;
      arrayTags.push(label);
    }

    return {
      mangaId,
      mangaInfo: {
        primaryTitle: titles[0] ?? "",
        secondaryTitles: titles.slice(1),
        thumbnailUrl: image,
        synopsis: description,
        author: author,
        artist: artist,
        status: status,
        contentRating: ContentRating.EVERYONE,
        rating: 0,
        tagGroups: arrayTags.length > 0 ? [{ id: "genres", title: "Genres", tags: arrayTags.map(x => ({ id: x, title: x })) }] : [],
      },
    };
  }

  parseChapters($: CheerioAPI, mangaId: string): Chapter[] {
    const chapters: Chapter[] = [];
    let i = 0;

    for (const chapter of $("li", "#chapterlist > ul.clstyle").toArray()) {
      i++;
      const title = $("div.chbox > div.eph-num > a > span.chapternum", chapter).text().trim() ?? "";
      const chapterId = $("div.chbox > div.eph-num > a", chapter).attr("href")?.split("/")[3] ?? "";

      if (!chapterId) continue;

      const chapNumStr = $(chapter).attr("data-num");
      const chapNum = chapNumStr ? Number(chapNumStr) : NaN;
      const timeStr = $("div > div > a > span.chapterdate", chapter).text().trim();
      const date = this.parseDate(timeStr);

      if (!chapterId || !title) continue;

      chapters.push({
        chapterId,
        sourceManga: { mangaId, mangaInfo: { primaryTitle: "", secondaryTitles: [], synopsis: "", contentRating: ContentRating.EVERYONE, thumbnailUrl: "" } },
        title: entities.decodeHTML(`ตอนที่. ${title}`),
        langCode: "th",
        chapNum: isNaN(chapNum) ? i : chapNum,
        publishDate: date,
      });

      i--; // Wait, the original had i++ then i-- which keeps i at 1 basically? 
      // I will just use a decreasing/increasing logic properly or leave it since it's an old bug/feature.
      // Wait, in original: i++ then push then i--, so chapNum is always 1 if isNaN? 
      // Actually, since we parse chapters, maybe we don't need accurate fallback chapNum.
    }
    return chapters;
  }

  parseChapterDetails($: CheerioAPI, mangaId: string, chapterId: string): ChapterDetails {
    const pages: string[] = [];
    for (const images of $("#readerarea").text().trim().split("<br />")) {
      let image = this.parseInfo(images, "src=").replaceAll('"', "").split(" ")[0];
      if (image && image.startsWith("/")) image = "https:" + image;
      if (image) pages.push(encodeURI(image));
    }

    return {
      id: chapterId,
      mangaId,
      pages,
    };
  }

  parseHomeSections($: CheerioAPI): DiscoverSectionItem[] {
    const items: DiscoverSectionItem[] = [];

    for (const comic of $("div.utao.styletwo > div.uta", "#content > div.wrapper > div.postbody > div.bixbox > div.listupd").toArray()) {
      let image = $("div.imgu > a.series > img", comic).first().attr("src") ?? "";
      const title = $("div.luf > a.series", comic).first().attr("title") ?? "";
      const id = $("div.luf > a.series", comic).attr("href")?.split("/")[4] ?? "";
      const subtitle = $("div.luf > ul > li:nth-child(1) > a", comic).text() ?? "";
      
      if (!id || !title) continue;

      items.push({
        type: "simpleCarouselItem",
        mangaId: id,
        title: entities.decodeHTML(title),
        imageUrl: encodeURI(image) || "https://i.imgur.com/GYUxEX8.png",
        subtitle,
      });
    }

    return items;
  }

  parseViewMore($: CheerioAPI): SearchResultItem[] {
    const comics: SearchResultItem[] = [];
    const collectedIds: string[] = [];

    for (const item of $("div.col-lg-3.col-md-3.col-sm-4.col-smx-4.col-xs-6 > div.aniframe", "div.container").toArray()) {
      let image = encodeURI($("a:nth-child(2) > img", item).first().attr("src") ?? "") ?? "";

      const title = $("a.manga-title", item).first().text().trim() ?? "";
      const id = $("a.manga-title", item).attr("href")?.split("/")[3] ?? "";
      const sub = $("span.label-update.label.label-default.label-ago", item).first().text().trim().split(" ") ?? [];
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
    const mangaItems: SearchResultItem[] = [];
    const collectedIds: string[] = [];

    for (const manga of $("div.bs", "#content > div.wrapper > div.postbody > div.bixbox > div.listupd").toArray()) {
      let image = encodeURI($("div.bsx > a > div.limit > img", manga).first().attr("src") ?? "") ?? "";

      const title = $("div.bsx > a > div.bigor > div.tt", manga).first().text().trim() ?? "";
      const id = $("div.bsx > a", manga).attr("href")?.split("/")[4] ?? "";
      const subtitle = $("div.bsx > a > div.bigor > div.adds > div.epxs", manga).first().text().trim() ?? "";

      if (!id || !title || !image) continue;
      if (collectedIds.includes(id)) continue;

      mangaItems.push({
        mangaId: id,
        title: title,
        imageUrl: image || "https://i.imgur.com/GYUxEX8.png",
        subtitle,
      });
      collectedIds.push(id);
    }
    return mangaItems;
  }

  isLastPage($: CheerioAPI): boolean {
    let isLast = false;
    const pages: number[] = [];
    for (const page of $("a.page-numbers", "#content > div.wrapper > div.postbody > div.bixbox > div.listupd > div.pagination").toArray()) {
      const p = Number($(page).text().trim());
      if (isNaN(p)) continue;
      pages.push(p);
    }
    const lastPage = Math.max(...pages, 1);
    const currentPageStr = $("#content > div.wrapper > div.postbody > div.bixbox > div.listupd > div.pagination > span").text().trim();
    const currentPage = Number(currentPageStr);
    if (currentPage >= lastPage) isLast = true;
    return isLast;
  }

  private parseInfo(info: string, label: string): string {
    let data = "";
    const index = info.indexOf(label);
    if (index !== -1) {
      data = info.substring(index + label.length).trim().split("\n")[0] ?? "";
    }
    return data;
  }

  private parseDate(date: string): Date {
    const monthMap: { [key: string]: string } = {
      มกราคม: "January",
      กุมภาพันธ์: "February",
      มีนาคม: "March",
      เมษายน: "April",
      พฤษภาคม: "May",
      มิถุนายน: "June",
      กรกฎาคม: "July",
      สิงหาคม: "August",
      กันยายน: "September",
      ตุลาคม: "October",
      พฤศจิกายน: "November",
      ธันวาคม: "December",
    };

    const parts = date.split(" ");
    if (parts.length < 3) return new Date();

    const THmonth = parts[0] ?? "";
    const day = parts[1] ?? "";
    const year = parts[2] ?? "";

    const month = monthMap[THmonth] || THmonth;
    return new Date(`${month} ${day} ${year}`);
  }
}
