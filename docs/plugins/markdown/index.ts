import type { PluginOption } from "vite-plus";

import { demoPlugin } from "./demo";
import { md2VuePlugin } from "./md2vue";

export function mdPlugin(): PluginOption[] {
  return [md2VuePlugin(), demoPlugin()];
}
