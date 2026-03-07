import type { PluginOption } from 'vite'
import fs from 'node:fs/promises'
import pm from 'picomatch'
import { normalizePath } from 'vite'
import { parse } from 'vue/compiler-sfc'
import { createMarkdown, loadBaseMd, loadShiki } from '../markdown'
import { tsToJs } from './tsToJs'

function toRelativePath(absolutePath: string, root: string) {
  const normalizedPath = normalizePath(absolutePath)
  const normalizedRoot = normalizePath(root)
  return normalizedPath.startsWith(normalizedRoot)
    ? normalizedPath.slice(normalizedRoot.length)
    : normalizedPath
}

async function parseDemoFile(filePath: string, md: ReturnType<ReturnType<typeof createMarkdown>>) {
  const code = await fs.readFile(filePath, 'utf-8')
  const { descriptor } = parse(code, {
    filename: filePath,
    sourceMap: false,
  })

  const locales: Record<string, { html: string, title: string }> = {}
  const docsBlocks = descriptor.customBlocks.filter(block => block.type === 'docs')
  await Promise.all(docsBlocks.map(async (block) => {
    const lang = typeof block.attrs.lang === 'string' ? block.attrs.lang : 'zh-CN'
    const env: Record<string, unknown> = {}
    const html = await md.renderAsync(block.content.trim(), env)
    const formatterTitle = (env.formatters as { title?: string } | undefined)?.title
    locales[lang] = {
      html,
      title: formatterTitle || (typeof env.title === 'string' ? env.title : ''),
    }
  }))

  const sourceCode = code.replace(/<docs[^>]*>[\s\S]*?<\/docs>/g, '').trim()
  const jsSourceCode = await tsToJs(sourceCode)
  const sourceHtml = await md.renderAsync(`\`\`\`vue\n${sourceCode}\n\`\`\``)
  const jsSourceHtml = await md.renderAsync(`\`\`\`vue\n${jsSourceCode}\n\`\`\``)

  return {
    locales,
    sourceCode,
    jsSourceCode,
    sourceHtml,
    jsSourceHtml,
  }
}

export function demoPlugin(): PluginOption {
  const md = createMarkdown()({
    withPlugin: false,
    config(markdown) {
      loadBaseMd(markdown)
      loadShiki(markdown)
    },
  })
  const VIRTUAL_MODULE_ID = 'virtual:demos'
  const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`
  const DEMO_SUFFIX = 'demo=true'
  const DEMO_GLOB = ['/src/pages/**/demo/*.vue']

  return {
    name: 'vite:demo',
    enforce: 'pre',
    async resolveId(id, importer) {
      if (id === VIRTUAL_MODULE_ID)
        return RESOLVED_VIRTUAL_MODULE_ID

      if (id.includes(DEMO_SUFFIX)) {
        const resolved = await this.resolve(id, importer, { skipSelf: true })
        if (resolved)
          return `\0${resolved.id}`
      }
    },
    async load(id) {
      const [, query] = id.split('?')
      const params = new URLSearchParams(query)

      if (params.get('vue') !== null && params.get('type') === 'docs')
        return 'export default {}'

      if (id === RESOLVED_VIRTUAL_MODULE_ID) {
        return `const rawDemos = import.meta.glob(${JSON.stringify(DEMO_GLOB)}, { query: { demo: 'true' }, eager: true, import: 'default' }); export default rawDemos;`
      }

      if (id.startsWith('\0') && id.includes(DEMO_SUFFIX)) {
        const virtualId = id.slice(1)
        const [filePath] = virtualId.split('?')
        if (!filePath)
          return

        const normalizedFile = normalizePath(filePath)
        this.addWatchFile(filePath)

        const { locales, sourceCode, jsSourceCode, sourceHtml, jsSourceHtml } = await parseDemoFile(filePath, md)
        return {
          code: `
import { ref } from 'vue'

const localesRef = ref(${JSON.stringify(locales)})
const sourceRef = ref(${JSON.stringify(sourceCode)})
const jsSourceRef = ref(${JSON.stringify(jsSourceCode)})
const htmlRef = ref(${JSON.stringify(sourceHtml)})
const jsHtmlRef = ref(${JSON.stringify(jsSourceHtml)})

const demoData = {
  component: () => import(${JSON.stringify(filePath)}),
  get locales() { return localesRef.value },
  get source() { return sourceRef.value },
  get jsSource() { return jsSourceRef.value },
  get html() { return htmlRef.value },
  get jsHtml() { return jsHtmlRef.value }
}

if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.on(${JSON.stringify(`demo-update:${normalizedFile}`)}, (data) => {
    if ('locales' in data) localesRef.value = data.locales
    if ('source' in data) sourceRef.value = data.source
    if ('jsSource' in data) jsSourceRef.value = data.jsSource
    if ('html' in data) htmlRef.value = data.html
    if ('jsHtml' in data) jsHtmlRef.value = data.jsHtml
  })
}

export default demoData
`,
          map: null,
        }
      }
    },
    async handleHotUpdate(ctx) {
      const relativePath = toRelativePath(ctx.file, ctx.server.config.root)
      const isDemo = DEMO_GLOB.some(pattern => pm.isMatch(relativePath, pattern))
      if (!isDemo)
        return

      const normalizedFile = normalizePath(ctx.file)
      const { locales, sourceCode, jsSourceCode, sourceHtml, jsSourceHtml } = await parseDemoFile(ctx.file, md)
      ctx.server.ws.send({
        type: 'custom',
        event: `demo-update:${normalizedFile}`,
        data: {
          locales,
          source: sourceCode,
          jsSource: jsSourceCode,
          html: sourceHtml,
          jsHtml: jsSourceHtml,
        },
      })
      return ctx.modules
    },
  }
}
