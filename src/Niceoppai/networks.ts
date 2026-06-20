import { URL, type Response } from "@paperback/types";

import { DOMAIN } from "./models";

interface Query {
  key: string;
  value: string | string[];
}

export async function fetchRecent(): Promise<[Response, ArrayBuffer]> {
  const request = {
    url: new URL(DOMAIN).addPathComponent("latest-chapters").toString(),
    method: "GET",
  };
  return await Application.scheduleRequest(request);
}

export async function fetchHomepage(): Promise<[Response, ArrayBuffer]> {
  const request = {
    url: new URL(DOMAIN).toString(),
    method: "GET",
  };
  return await Application.scheduleRequest(request);
}

export async function fetchMangaDetailsPage(
  mangaId: string,
  chapterPage?: string,
): Promise<[Response, ArrayBuffer]> {
  const urlBuilder = new URL(DOMAIN).addPathComponent(mangaId);
  if (chapterPage) {
    urlBuilder.addPathComponent("chapter-list").addPathComponent(chapterPage);
  }
  const request = {
    url: urlBuilder.toString(),
    method: "GET",
  };
  return await Application.scheduleRequest(request);
}
export async function fetchChapterDetailsPage(
  mangaId: string,
  chapterId: string,
): Promise<[Response, ArrayBuffer]> {
  const request = {
    url: new URL(DOMAIN).addPathComponent(mangaId).addPathComponent(chapterId).toString(),
    method: "GET",
  };
  return await Application.scheduleRequest(request);
}

export async function fetchSearchPage(
  paths: Array<string>,
  queries: Array<Query>,
): Promise<[Response, ArrayBuffer]> {
  const urlBuilder = new URL(DOMAIN).addPathComponent("manga_list").addPathComponent("search");
  for (const path of paths) {
    urlBuilder.addPathComponent(path);
  }

  for (const query of queries) {
    urlBuilder.setQueryItem(query.key, query.value);
  }

  const request = {
    url: urlBuilder.toString(),
    method: "GET",
  };

  return await Application.scheduleRequest(request);
}
