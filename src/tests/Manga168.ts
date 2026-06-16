import { type TestLogger } from "@paperback/types";

import { Manga168 } from "../Manga168/main.js";
import sourceInfo from "../Manga168/pbconfig.js";
import { TestSuite, registerDefaultTests } from "./suite.js";

export async function runTests(logger: TestLogger) {
  const suite = new TestSuite("Manga168 tests", logger);
  registerDefaultTests(suite, Manga168, sourceInfo);

  await suite.run();
}
