import { transformWithOxc } from "vite-plus";

const SCRIPT_BLOCK_REGEX = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const SCRIPT_LANG_REGEX = /\blang\s*=\s*(['"]?)([\w-]+)\1/i;
const TS_LANGS = new Set(["ts", "tsx", "mts", "cts"]);
const EXPORT_MARKER_REGEX = /\n?export\s*\{\s*\};?\s*$/u;

type OxfmtFormat = (typeof import("oxfmt"))["format"];

let oxfmtPromise: Promise<OxfmtFormat | null> | null = null;

async function getOxfmtFormat() {
  if (!oxfmtPromise) {
    oxfmtPromise = (async () => {
      try {
        const { format } = await import("oxfmt");
        return format;
      } catch {
        return null;
      }
    })();
  }
  return oxfmtPromise;
}

async function formatScript(code: string, lang: string) {
  try {
    const oxfmtFormat = await getOxfmtFormat();
    if (!oxfmtFormat) return code;

    const filePath = `virtual-demo-script.${lang === "tsx" ? "jsx" : "js"}`;
    const result = await oxfmtFormat(filePath, code);
    return result.errors.length > 0 ? code : result.code;
  } catch {
    return code;
  }
}

async function transpileScript(code: string, lang: string) {
  const oxcLang = lang === "tsx" ? "tsx" : "ts";
  const result = await transformWithOxc(
    code,
    `virtual-demo-script.${oxcLang}`,
    {
      lang: oxcLang,
      sourceType: "module",
      target: "es2020",
      jsx: oxcLang === "tsx" ? "preserve" : undefined,
      typescript: {
        onlyRemoveTypeImports: true,
      },
      sourcemap: false,
    },
  );

  return formatScript(result.code.replace(EXPORT_MARKER_REGEX, ""), oxcLang);
}

export async function tsToJs(sourceCode: string) {
  let nextSourceCode = "";
  let lastIndex = 0;
  SCRIPT_BLOCK_REGEX.lastIndex = 0;

  for (const match of sourceCode.matchAll(SCRIPT_BLOCK_REGEX)) {
    const [fullMatch, attrs = "", code = ""] = match;
    const startIndex = match.index ?? 0;
    nextSourceCode += sourceCode.slice(lastIndex, startIndex);

    const langMatch = attrs.match(SCRIPT_LANG_REGEX);
    if (!langMatch) {
      nextSourceCode += fullMatch;
      lastIndex = startIndex + fullMatch.length;
      continue;
    }

    const [, quote, lang = ""] = langMatch;
    const normalizedLang = lang.toLowerCase();
    if (!TS_LANGS.has(normalizedLang)) {
      nextSourceCode += fullMatch;
      lastIndex = startIndex + fullMatch.length;
      continue;
    }

    const nextLang = normalizedLang === "tsx" ? "jsx" : "js";
    const wrappedQuote = quote || '"';
    const nextAttrs = attrs.replace(
      SCRIPT_LANG_REGEX,
      `lang=${wrappedQuote}${nextLang}${wrappedQuote}`,
    );

    try {
      const transpiledCode = await transpileScript(code, normalizedLang);
      nextSourceCode += `<script${nextAttrs}>\n${transpiledCode.trim()}\n</script>`;
    } catch {
      nextSourceCode += fullMatch;
    }

    lastIndex = startIndex + fullMatch.length;
  }

  nextSourceCode += sourceCode.slice(lastIndex);
  return nextSourceCode;
}
