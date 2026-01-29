import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import BrandTitle from './components/BrandTitle.vue'
import BrandTitleAfter from './components/BrandTitleAfter.vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'nav-bar-title-before': () => h(BrandTitle),
      'nav-bar-title-after': () => h(BrandTitleAfter),
    })
  }
} satisfies Theme