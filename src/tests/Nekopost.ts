import { type TestLogger } from "@paperback/types";

import { Nekopost } from "../Nekopost/main.js";
import sourceInfo from "../Nekopost/pbconfig.js";
import { TestSuite, registerDefaultTests } from "./suite.js";

export async function runTests(logger: TestLogger) {
  const suite = new TestSuite("Nekopost tests", logger);
  registerDefaultTests(suite, Nekopost, sourceInfo);

  await suite.run();
}
