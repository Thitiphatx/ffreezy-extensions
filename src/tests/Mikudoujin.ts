import { type TestLogger } from "@paperback/types";

import { Mikudoujin } from "../Mikudoujin/main.js";
import sourceInfo from "../Mikudoujin/pbconfig.js";
import { TestSuite, registerDefaultTests } from "./suite.js";

export async function runTests(logger: TestLogger) {
  const suite = new TestSuite("Mikudoujin tests", logger);
  registerDefaultTests(suite, Mikudoujin, sourceInfo);

  await suite.run();
}
