import {
  URL,
  type Chapter,
  type ChapterDetails,
  type DiscoverSectionItem,
  type SearchResultItem,
  type SourceManga,
  type Tag,
  type TagSection,
} from "@paperback/types";
import { type CheerioAPI } from "cheerio";
import { decodeHTML } from "entities";

import { DOMAIN } from "./models";
import pbconfig from "./pbconfig";

export const parseMangaDetails = async ($: CheerioAPI, mangaId: string): Promise<SourceManga> => {
  const title = decodeHTML($("div.wpm_pag.mng_det > h1").first().text().trim());
  const secondaryTitles = decodeHTML(
    $('div.det b:contains("ชื่อภาษาไทย")')
      .parent()
      .text()
      .replace(/ชื่อภาษาไทย\s*:/, "")
      .trim(),
  );
  const image = $("img", "div.cvr_ara").attr("src") ?? "";
  const description = decodeHTML($("div.det > p:nth-child(3)").text().trim());
  const parsedStatus = $('div.det b:contains("สถานะ")')
    .parent()
    .text()
    .replace(/สถานะ\s*:/, "")
    .trim();
  console.log("status:", parsedStatus);
  let status: string;
  switch (parsedStatus) {
    case "ยังไม่จบ":
      status = "Ongoing";
      break;
    case "จบแล้ว":
      status = "Completed";
      break;
    default:
      status = "Unknown";
  }
  const genres: Tag[] = [];
  for (const genreObj of $('div.det b:contains("หมวดหมู่")').parent().find("a").toArray()) {
    const genre = $(genreObj).text().trim();
    const href = $(genreObj).attr("href") ?? "";
    console.log("genre", genre);
    console.log("href", href);
    const id = href.split("/").filter(Boolean).pop() ?? "";
    genres.push({ id, title: genre });
  }
  const tagSections: TagSection[] = [
    {
      id: "genres",
      title: "Genres",
      tags: genres,
    },
  ];
  return {
    mangaId: mangaId,
    mangaInfo: {
      primaryTitle: title,
      secondaryTitles: secondaryTitles ? [secondaryTitles] : [],
      status: status,
      tagGroups: tagSections,
      synopsis: description,
      thumbnailUrl: image,
      contentRating: pbconfig.contentRating,
      shareUrl: new URL(DOMAIN).addPathComponent(mangaId).toString(),
    },
  };
};

export const parseChapterPage = async ($: CheerioAPI): Promise<string | undefined> => {
  const lastPage = $("ul.pgg")
    .first()
    .find("li:last-child > a")
    .attr("href")
    ?.split("/")
    .filter(Boolean)
    .pop()
    ?.trim();
  return lastPage;
};

export const parseChapters = ($: CheerioAPI, sourceManga: SourceManga): Chapter[] => {
  const chapters: Chapter[] = [];
  const arrChapters = $("li.lng_", "div.wpm_pag.mng_det ul.lst").toArray();
  let sortingIndex = 0;
  for (const chapterObj of arrChapters) {
    const chapterId: string = $("a", chapterObj).attr("href")?.split("/")[4] ?? "";
    if (!chapterId) continue;

    const title = $(chapterObj).text().split("-").filter(Boolean).pop()?.trim();
    const chapNumMatch = chapterId.replace(/[oO]/g, "0").match(/\d+(\.\d+)?/);
    const chapNum = chapNumMatch ? Number(chapNumMatch[0]) : 0;
    chapters.push({
      chapterId,
      title,
      chapNum,
      sortingIndex,
      langCode: "🇹🇭",
      volume: 0,
      sourceManga,
    });
    sortingIndex--;
  }
  if (chapters.length == 0) {
    throw new Error(`Couldn't find any chapters for mangaId: ${sourceManga.mangaId}`);
  }
  return chapters;
};

export const parseChapterDetails = async (
  $: CheerioAPI,
  mangaId: string,
  chapterId: string,
): Promise<ChapterDetails> => {
  const pages: string[] = [];
  for (const images of $("img", "#image-container > center").toArray()) {
    let image: string | undefined = $(images).attr("src")?.trim();
    if (image && image.startsWith("/")) image = "https:" + image;
    if (image) pages.push(image);
  }

  const chapterDetails = {
    id: chapterId,
    mangaId: mangaId,
    pages: pages,
  };
  return chapterDetails;
};

export const parseRecentSection = async ($: CheerioAPI): Promise<DiscoverSectionItem[]> => {
  const recentSectionArray: DiscoverSectionItem[] = [];
  for (const recentObj of $(
    "div.row",
    "#sct_content div.con div.wpm_pag.mng_lts_chp.grp",
  ).toArray()) {
    const id = ($("div.det > a.ttl", recentObj).attr("href") ?? "").split("/")[3] ?? "";
    const title = $("div.det > a", recentObj).text().trim() ?? "";
    const imageUrl = (
      $("div.cvr > div.img_wrp > a > img", recentObj).first().attr("src") ?? ""
    ).replace("36x0", "350x0");
    const subtitle =
      $("ul.lst > li:nth-child(1) > a.lst > b.val.lng_", recentObj).text().trim() ?? "";
    const chapterId =
      $("ui.lst_chp_ara > li:nth-child(1) > a", recentObj).attr("href")?.split("/")[3] ?? "";

    recentSectionArray.push({
      imageUrl,
      title: decodeHTML(title),
      mangaId: id,
      subtitle: decodeHTML(subtitle),
      chapterId,
      type: "chapterUpdatesCarouselItem",
      contentRating: pbconfig.contentRating,
    });
  }
  return recentSectionArray;
};

export const parseTrendingSection = async ($: CheerioAPI): Promise<DiscoverSectionItem[]> => {
  const hotSectionArray: DiscoverSectionItem[] = [];
  for (const trendingObj of $(".wpm_pag.mng_lts_chp.tbn_lrg .nde").toArray()) {
    const id = $("div.ifo > a.ttl", trendingObj).attr("href")?.split("/")[3] ?? "";
    const title = $("div.ifo > a.ttl", trendingObj).text().trim() ?? "";
    const imageUrl = $("div.cvr > a > img", trendingObj).attr("src") ?? "";
    const subtitle = $("div.ifo > span.chp_ifo > span", trendingObj).text().trim() ?? "";

    hotSectionArray.push({
      imageUrl,
      title: decodeHTML(title),
      subtitle: decodeHTML(subtitle),
      mangaId: id,
      type: "simpleCarouselItem",
      contentRating: pbconfig.contentRating,
    });
  }
  return hotSectionArray;
};

export const parseSearch = async ($: CheerioAPI): Promise<SearchResultItem[]> => {
  const itemArray: SearchResultItem[] = [];
  for (const item of $("#sct_content div.con div.wpm_pag.mng_lst.tbn div.nde").toArray()) {
    const id = $("div.det > a", item).attr("href")?.split("/")[3] ?? "";
    if (id == "" || typeof id != "string") throw new Error("Id is empty");
    const title = $("div a", item).text().trim() ?? "";
    const image = ($("div.cvr > div.img_wrp > a > img", item).first().attr("src") ?? "").replace(
      "36x0",
      "350x0",
    );
    const subtitle = $("div.det > div.vws", item).text().trim() ?? "";
    itemArray.push({
      imageUrl: image,
      title: decodeHTML(title),
      mangaId: id,
      subtitle: decodeHTML(subtitle),
      contentRating: pbconfig.contentRating,
    });
  }
  return itemArray;
};
