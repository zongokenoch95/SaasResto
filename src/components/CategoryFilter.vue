<script setup>
defineProps({
  categories: {
    type: Array,
    required: true
  },
  activeCategory: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['select-category'])

const selectCategory = (category) => {
  emit('select-category', category)
}
</script>

<template>
  <div class="category-filter-container">
    <button
      v-for="cat in categories"
      :key="cat"
      :class="['filter-btn', { active: activeCategory === cat }]"
      @click="selectCategory(cat)"
    >
      {{ cat }}
    </button>
  </div>
</template>

<style scoped>
.category-filter-container {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 2rem 0;
}

.filter-btn {
  background-color: #1a1a1a;
  color: #888;
  border: 1px solid #333;
  padding: 8px 20px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  color: #fff;
  border-color: #666;
}

.filter-btn.active {
  background-color: #d4af37;
  color: #000;
  border-color: #d4af37;
  font-weight: 600;
}
</style>