import { type TestLogger } from "@paperback/types";

import { MangaThai } from "../MangaThai/main.js";
import sourceInfo from "../MangaThai/pbconfig.js";
import { TestSuite, registerDefaultTests } from "./suite.js";

export async function runTests(logger: TestLogger) {
  const suite = new TestSuite("MangaThai tests", logger);
  registerDefaultTests(suite, MangaThai, sourceInfo);

  await suite.run();
}
