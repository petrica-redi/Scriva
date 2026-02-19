import { createLocalClient } from "./pg-adapter";

export async function createClient() {
  return createLocalClient();
}
