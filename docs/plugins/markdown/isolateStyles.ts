import type { Plugin } from 'postcss'
import selectorParser from 'postcss-selector-parser'

interface Options {
  includeFiles?: RegExp[]
  ignoreFiles?: RegExp[]
  prefix?: string
}

export function postcssIsolateStyles({
  includeFiles = [/styles\/markdown\/index\.css/],
  ignoreFiles,
  prefix = ':not(:where(.vp-raw, .vp-raw *))',
}: Options = {}): Plugin {
  const prefixNodes = selectorParser().astSync(prefix).first?.nodes ?? []

  return {
    postcssPlugin: 'postcss-isolate-styles',
    Once(root) {
      const file = root.source?.input.file
      if (file && includeFiles?.length && !includeFiles.some(re => re.test(file)))
        return
      if (file && ignoreFiles?.length && ignoreFiles.some(re => re.test(file)))
        return

      root.walkRules((rule) => {
        if (!rule.selector || rule.selector.includes(prefix))
          return
        if (rule.parent?.type === 'atrule' && /\bkeyframes$/i.test(rule.parent.name))
          return

        rule.selector = selectorParser((selectors) => {
          selectors.each((sel) => {
            if (!sel.nodes.length)
              return
            const insertionIndex = sel.nodes.findLastIndex(node => node.type !== 'pseudo') + 1
            sel.nodes.splice(insertionIndex, 0, ...prefixNodes.map(node => node.clone()))
          })
        }).processSync(rule.selector)
      })
    },
  }
}

postcssIsolateStyles.postcss = true
