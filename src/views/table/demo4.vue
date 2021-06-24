<template>
  <div class="demo-box">
    <p class="demo-box-title">固定表头 方便一页内展示大量数据。</p>
    <f-table
      :columns="columns"
      :data-source="data"
      :scroll="{ y: 240 }"
    />
  </div>
</template>

<script>
import { defineComponent } from 'vue';
const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    width: 150,
  },
  {
    title: 'Age',
    dataIndex: 'age',
    width: 150,
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
];
const data = [...Array(100)].map((_, i) => ({
  key: i,
  name: `Edward King ${i}`,
  age: 32,
  address: `London, Park Lane no. ${i}`,
}));

export default defineComponent({
  setup() {
    return {
      data,
      columns,
    };
  },
});
</script>