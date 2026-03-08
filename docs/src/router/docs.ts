import type { RouteRecordRaw } from 'vue-router'

const PAGE_MODULES = import.meta.glob('../pages/**/*.md')

export const LOCALE_ZH_CN = 'zh-CN'
export const LOCALE_EN_US = 'en-US'
// 设置默认的语言环境
export const DEFAULT_LOCALE = LOCALE_ZH_CN

export const LOCALE_FILE_SEGMENT_ZH_CN = LOCALE_ZH_CN
export const LOCALE_FILE_SEGMENT_EN_US = LOCALE_EN_US

export const ROUTE_SUFFIX_ZH_CN = '-cn'
export const ROUTE_SUFFIX_EN_US = '-en'

const SUPPORTED_LOCALES = [
  LOCALE_ZH_CN,
  LOCALE_EN_US,
] as const

type SupportedLocale = typeof SUPPORTED_LOCALES[number]

const LOCALE_ROUTE_SUFFIX: Record<SupportedLocale, string> = {
  [LOCALE_ZH_CN]: ROUTE_SUFFIX_ZH_CN,
  [LOCALE_EN_US]: ROUTE_SUFFIX_EN_US,
}

const PAGE_FILE_PREFIX = '../pages/'
const PAGE_FILE_EXTENSION = '.md'
const INDEX_PAGE_NAME = 'index'

const localePattern = new RegExp(`\\.(${SUPPORTED_LOCALES.map(escapeRegExp).join('|')})\\.md$`)

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getRoutePath(basePath: string, locale: SupportedLocale) {
  const segments = basePath.split('/').filter(Boolean)
  const lastSegment = segments.at(-1)

  if (lastSegment === INDEX_PAGE_NAME)
    segments.pop()

  let routePath = `/${segments.join('/')}`.replace(/\/+/g, '/')
  if (routePath === '')
    routePath = '/'

  if (locale === DEFAULT_LOCALE)
    return routePath

  const suffix = LOCALE_ROUTE_SUFFIX[locale]
  return routePath === '/' ? `/${suffix.slice(1)}` : `${routePath}${suffix}`
}

function getRouteName(routePath: string) {
  return routePath
    .replace(/^\//, '')
    .replace(/\//g, '-')
    || INDEX_PAGE_NAME
}

function parsePageFile(filePath: string) {
  const localeMatch = filePath.match(localePattern)
  if (!localeMatch)
    return null

  const locale = localeMatch[1] as SupportedLocale
  const relativePath = filePath.slice(PAGE_FILE_PREFIX.length)
  const basePath = relativePath.replace(localePattern, '')

  return {
    locale,
    basePath,
    routePath: getRoutePath(basePath, locale),
    routeName: getRouteName(getRoutePath(basePath, locale)),
  }
}

export const docsRoutes: RouteRecordRaw[] = Object.entries(PAGE_MODULES)
  .reduce<RouteRecordRaw[]>((routes, [filePath, component]) => {
    if (!filePath.startsWith(PAGE_FILE_PREFIX) || !filePath.endsWith(PAGE_FILE_EXTENSION))
      return routes

    const pageInfo = parsePageFile(filePath)
    if (!pageInfo)
      return routes

    routes.push({
      path: pageInfo.routePath,
      name: pageInfo.routeName,
      component: component as RouteRecordRaw['component'],
      meta: {
        locale: pageInfo.locale,
        source: filePath,
      },
    } as RouteRecordRaw)

    return routes
  }, [])
  .sort((left, right) => left.path.localeCompare(right.path))
