import { type TestLogger } from "@paperback/types";

import { Niceoppai } from "../Niceoppai/main.js";
import sourceInfo from "../Niceoppai/pbconfig.js";
import { TestSuite, registerDefaultTests } from "./suite.js";

export async function runTests(logger: TestLogger) {
  const suite = new TestSuite("Niceoppai tests", logger);
  registerDefaultTests(suite, Niceoppai, sourceInfo);

  await suite.run();
}
