import {
  type Chapter,
  type ChapterDetails,
  type DiscoverSectionItem,
  type SearchResultItem,
  type SourceManga,
  type Tag,
} from "@paperback/types";
import { ContentRating } from "@paperback/types";
import type { CheerioAPI } from "cheerio";
import * as entities from "entities";

export class NiceoppaiParser {
  parseMangaDetails($: CheerioAPI, mangaId: string): SourceManga {
    const title = entities.decodeHTML($("div.wpm_pag.mng_det > h1").first().text().trim());

    let image = $("img", "div.cvr_ara").attr("src") ?? "https://i.imgur.com/GYUxEX8.png";
    if (image.startsWith("/")) image = "https:" + image;

    const author = $("div.det > p:nth-child(7) > a").text().trim() ?? "";
    const description = entities.decodeHTML($("div.det > p:nth-child(3)").text().trim() ?? "");

    const arrayTags: Tag[] = [];
    for (const tag of $(
      "a",
      "#sct_content > div > div.wpm_pag.mng_det > div.mng_ifo > div.det > p:nth-child(9)",
    ).toArray()) {
      const label = $(tag).text().trim();
      const id = encodeURI($(tag).attr("href")?.split("/")[5] ?? "");

      if (!label || !id) continue;
      if (label.includes("hotlink")) break;
      arrayTags.push({ id, title: label });
    }

    const rawStatus = $("div.det > p:nth-child(13)").text().trim().split(" ")[1] ?? "";
    let status = "ONGOING";
    if (rawStatus.includes("แล้ว")) status = "COMPLETED";

    return {
      mangaId,
      mangaInfo: {
        primaryTitle: title,
        secondaryTitles: [],
        thumbnailUrl: image,
        synopsis: description,
        author: author,
        artist: author,
        status: status,
        contentRating: ContentRating.MATURE,
        rating: 0,
        tagGroups: arrayTags.length > 0 ? [{ id: "genres", title: "Genres", tags: arrayTags }] : [],
      },
    };
  }

  parseChapters($: CheerioAPI, mangaId: string): Chapter[] {
    const chapters: Chapter[] = [];
    let i = 0;

    for (const chapter of $("li.lng_", "div.wpm_pag.mng_det ul.lst").toArray()) {
      i++;
      const title = $("a > b.val", chapter).text().trim() ?? "";
      const chapterId = $("a", chapter).attr("href")?.split("/")[4] ?? "";

      if (!chapterId) continue;

      const chapNum = Number(chapterId);
      const date = new Date($("a > b.dte", chapter).last().text().trim());

      if (!chapterId || !title) continue;

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

      i--;
    }
    return chapters;
  }

  parseChapterDetails($: CheerioAPI, mangaId: string, chapterId: string): ChapterDetails {
    const pages: string[] = [];

    for (const images of $("img", "#image-container > center").toArray()) {
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

    for (const manga of $(
      "div.row",
      "#sct_content div.con div.wpm_pag.mng_lts_chp.grp",
    ).toArray()) {
      const id = $("div.det > a.ttl", manga).attr("href")?.split("/")[3] ?? "";
      let image = $("div.cvr > div.img_wrp > a > img", manga).first().attr("src") ?? "";
      image = encodeURI(image.replace("36x0", "350x0"));

      const title = $("div.det > a", manga).text().trim() ?? "";
      const subtitle =
        $("ul.lst > li:nth-child(1) > a.lst > b.val.lng_", manga).text().trim() ?? "";

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

    for (const manga of $(
      "#sct_content > div.con > div.wpm_pag.mng_lts_chp.grp > div.row",
    ).toArray()) {
      const id = $("div.det > a", manga).attr("href")?.split("/")[3] ?? "";
      let image = $("div.cvr > div.img_wrp > a > img", manga).first().attr("src") ?? "";
      image = encodeURI(image.replace("36x0", "350x0"));

      const title = $("div.det > a", manga).text().trim() ?? "";
      const subtitle =
        $("div.det > ul.lst > li:nth-child(1) > a.lst > b.val.lng_", manga).text().trim() ?? "";

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

    for (const manga of $("#sct_content div.con div.wpm_pag.mng_lst.tbn div.nde").toArray()) {
      const id = $("div.det > a", manga).attr("href")?.split("/")[3] ?? "";
      let image = $("div.cvr > div.img_wrp > a > img", manga).first().attr("src") ?? "";
      image = encodeURI(image.replace("36x0", "350x0"));

      const title = $("div.det > a", manga).text().trim() ?? "";
      const subtitle = $("div.det > div.vws", manga).text().trim() ?? "";

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
    for (const page of $("li", "ul.pgg").toArray()) {
      const p = Number($(page).text().trim());
      if (isNaN(p)) continue;
      pages.push(p);
    }
    const lastPage = Math.max(...pages, 1);
    const currentPageStr = $("li > a.sel").text().trim();
    const currentPage = Number(currentPageStr);
    if (currentPage >= lastPage) isLast = true;
    return isLast;
  }
}
