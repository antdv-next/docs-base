import type { RouteRecordRaw } from 'vue-router'
import DocsEn from '@/pages/docs/index.en-US.md'
import DocsZh from '@/pages/docs/index.zh-CN.md'

export const docsRoutes: RouteRecordRaw[] = [
  {
    path: '/docs',
    name: 'docs',
    component: DocsZh,
  },
  {
    path: '/docs/en-US',
    name: 'docs-en-US',
    component: DocsEn,
  },
]
