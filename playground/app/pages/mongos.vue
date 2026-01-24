<script setup lang="ts">
const params = computed(() => ({ query: {} }))
const mongo = useService('mongos').useFind<Mongo>(params, { paginateOn: 'hybrid' })
</script>

<template>
  <div style="max-width: 1000px;">
    text ({{ mongo.total }}): {{ mongo.data[0]?.text }}<br>
  </div>
</template>
