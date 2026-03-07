<script setup lang="ts">
import type { Component } from 'vue'
import { CheckOutlined, CodeOutlined, CopyOutlined } from '@antdv-next/icons'
import { useClipboard } from '@vueuse/core'
import demos from 'virtual:demos'
import { computed, defineAsyncComponent, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'

defineOptions({
  name: 'Demo',
})

const props = withDefaults(defineProps<{
  src: string
  simplify?: boolean
}>(), {
  simplify: false,
})

const route = useRoute()
const router = useRouter()
const opened = shallowRef(false)
const demo = computed(() => demos[props.src])

const preferredLocale = computed(() => {
  return route.path.includes('/en') ? 'en-US' : 'zh-CN'
})

const description = computed(() => {
  const locales = demo.value?.locales ?? {}
  return locales[preferredLocale.value]?.html || locales['zh-CN']?.html || locales['en-US']?.html || Object.values(locales)[0]?.html || ''
})

const component = computed<Component | undefined>(() => {
  if (typeof demo.value?.component === 'function')
    return defineAsyncComponent(demo.value.component as () => Promise<Component>)
  return demo.value?.component as Component | undefined
})

const id = computed(() => props.src.replace(/^\/+/, '').replace(/\.[^.]+$/, '').replace(/[^\w-]+/g, '-'))
const sourceCode = computed(() => demo.value?.source || '')
const sourceHtml = computed(() => demo.value?.html || '')

const { copied, copy } = useClipboard({
  source: sourceCode,
  legacy: true,
})

const isActive = computed(() => route.hash === `#${id.value}`)

function toggleCode() {
  opened.value = !opened.value
}

function navigateToAnchor(event: MouseEvent) {
  event.preventDefault()
  router.push({
    path: route.path,
    hash: `#${id.value}`,
  })
}
</script>

<template>
  <section :id="id" class="demo-card" :class="{ 'demo-card-active': isActive, 'demo-card-simplify': simplify }">
    <div class="demo-preview vp-raw">
      <Suspense>
        <component :is="component" v-if="component" />
        <template #fallback>
          <a-skeleton active :paragraph="{ rows: 4 }" />
        </template>
      </Suspense>
    </div>

    <template v-if="!simplify">
      <div class="demo-meta markdown">
        <div class="demo-header">
          <a class="demo-title" :href="`#${id}`" @click="navigateToAnchor">
            <slot />
          </a>
          <div class="demo-actions">
            <button class="demo-action" type="button" @click="toggleCode">
              <CodeOutlined />
              <span>{{ opened ? '隐藏代码' : '查看代码' }}</span>
            </button>
          </div>
        </div>
        <div v-if="description" class="demo-description" v-html="description" />
      </div>

      <div v-if="opened" class="demo-code">
        <button class="demo-copy" type="button" @click="copy()">
          <CopyOutlined v-if="!copied" />
          <CheckOutlined v-else />
          <span>{{ copied ? '已复制' : '复制代码' }}</span>
        </button>
        <div v-html="sourceHtml" />
      </div>
    </template>
  </section>
</template>

<style scoped>
.demo-card {
  overflow: hidden;
  border: 1px solid var(--ant-color-border);
  border-radius: 12px;
  background: var(--ant-color-bg-container);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.demo-card-active {
  border-color: var(--ant-color-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--ant-color-primary) 12%, transparent);
}

.demo-card-simplify {
  border: none;
  border-radius: 0;
}

.demo-preview {
  padding: 24px;
  border-bottom: 1px solid var(--ant-color-split);
}

.demo-card-simplify .demo-preview {
  padding: 0;
  border-bottom: 0;
}

.demo-meta {
  padding: 18px 20px 12px;
}

.demo-header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.demo-title {
  color: var(--ant-color-text-heading);
  font-weight: 600;
  text-decoration: none;
}

.demo-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.demo-action,
.demo-copy {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  border: 0;
  background: transparent;
  color: var(--ant-color-text-secondary);
  cursor: pointer;
  padding: 0;
  font: inherit;
}

.demo-action:hover,
.demo-copy:hover {
  color: var(--ant-color-primary);
}

.demo-description {
  margin-top: 12px;
}

.demo-description :deep(p) {
  margin: 0;
}

.demo-code {
  position: relative;
  border-top: 1px solid var(--ant-color-split);
  background: var(--vp-c-bg-alt);
}

.demo-copy {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 1;
}

.demo-code :deep(.language-vue) {
  margin: 0;
  border-radius: 0;
}
</style>
