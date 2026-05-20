import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { handleRequest } = require("../server.js");

export default async function handler(request, response) {
  return handleRequest(request, response);
}
