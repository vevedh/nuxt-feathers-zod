<template>
  <!--
    Vendored lightweight card component for the NFZ console/devtools UI.

    IMPORTANT:
    - Must stay dependency-free (no external UI libs).
    - Must support the named slot "header" (requested for /console/builder).
    - Keep backward compatibility: default slot still renders content.
  -->
  <div rounded border="~ base" bg="white dark:neutral-900/40" p-4>
    <div v-if="$slots.header" border="b base" pb-3 mb-3>
      <slot name="header"></slot>
    </div>

    <div>
      <slot></slot>
    </div>

    <div v-if="$slots.footer" border="t base" pt-3 mt-3>
      <slot name="footer"></slot>
    </div>
  </div>
</template>
