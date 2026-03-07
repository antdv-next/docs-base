import type { MarkdownItEnv, MarkdownItHeader } from '@mdit-vue/types'
import type MarkdownIt from 'markdown-it'
import pathe from 'pathe'

declare module '@mdit-vue/types' {
  interface MarkdownItEnv {
    id?: string
  }
}

function checkWrapper(content: string, wrapper = 'demo') {
  return new RegExp(`<${wrapper}(\\s|>|/)`, 'i').test(content)
}

export function replaceSrcPath(content: string, id: string, root: string, wrapper = 'demo', examples?: MarkdownItHeader) {
  function replaceSrcInTag(tagMatch: string, titleContent?: string) {
    return tagMatch.replace(/(\s|^)src=(['"])(.*?)\2/gi, (srcMatch, prefix, quote, srcValue) => {
      if (!srcValue || srcValue.startsWith('/'))
        return srcMatch

      const dir = pathe.dirname(id)
      const filePath = pathe.resolve(dir, srcValue)
      const relative = pathe.relative(root, filePath)
      const componentsArr = filePath.split('/')
      const demoIndex = componentsArr.reverse().findIndex(dir => dir.toLowerCase() === 'demo')
      const componentDemoPathArr = componentsArr.slice(0, demoIndex + 2)
      const componentDemoPath = componentDemoPathArr.reverse().join('/')

      if (examples && titleContent) {
        const slug = componentDemoPath.replace(/\//g, '-').replace('.vue', '')
        const item = {
          level: examples.level + 1,
          title: titleContent,
          slug,
          link: `#${slug}`,
          children: [],
        }
        if (examples.children)
          examples.children.push(item)
        else
          examples.children = [item]
      }

      return `${prefix}src=${quote}${relative.startsWith('/') ? relative : `/${relative}`}${quote}`
    })
  }

  const closedTag = new RegExp(`(<${wrapper}(?!-)\\b[^>]*>)([\\s\\S]*?)<\\/${wrapper}>`, 'gi')
  let result = content.replace(closedTag, (tagMatch, openTag, titleContent) => {
    return tagMatch.replace(openTag, replaceSrcInTag(openTag, titleContent?.trim()))
  })

  const selfClosing = new RegExp(`<${wrapper}(?!-)\\b[^>]*/\\s*>`, 'gi')
  result = result.replace(selfClosing, tagMatch => replaceSrcInTag(tagMatch))

  const openTag = new RegExp(`<${wrapper}(?!-)\\b[^>]*>`, 'gi')
  return result.replace(openTag, tagMatch => replaceSrcInTag(tagMatch))
}

export function demoPlugin(md: MarkdownIt, config: { root?: string } = {}) {
  const originalRender = md.renderer.render

  md.renderer.render = function render(tokens, options, env: MarkdownItEnv) {
    const root = config.root ?? process.cwd()
    const currentId = env.id || ''
    const examples = env.headers?.find(item => item.slug === 'examples')

    function processToken(token: { type: string, content: string, children?: unknown[] }) {
      if ((token.type === 'html_block' || token.type === 'html_inline') && checkWrapper(token.content))
        token.content = replaceSrcPath(token.content, currentId, root, 'demo', examples)

      if (token.children) {
        for (const child of token.children as typeof token[]) {
          processToken(child)
        }
      }
    }

    for (const token of tokens as typeof tokens & Array<{ type: string, content: string, children?: unknown[] }>) {
      processToken(token)
    }

    return originalRender.call(this, tokens, options, env)
  }
}
