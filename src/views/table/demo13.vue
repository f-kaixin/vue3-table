<template>
  <div class="demo-box">
    <p class="demo-box-title">带斑马纹表格</p>
    <f-table
      class="ant-table-striped"
      size="middle"
      :columns="columns"
      :data-source="data"
      :rowClassName="(record, index) => (index % 2 === 1 ? 'table-striped' : null)"
    />
    <br>
    <f-table
      class="ant-table-striped"
      size="middle"
      :columns="columns"
      :data-source="data"
      :rowClassName="(record, index) => (index % 2 === 1 ? 'table-striped' : null)"
      bordered
    />
  </div>
</template>

<script>
import { defineComponent } from 'vue';

const columns = [
  { title: 'Name', dataIndex: 'name' },
  { title: 'Age', dataIndex: 'age' },
  { title: 'Address', dataIndex: 'address' },
];
const data = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sidney No. 1 Lake Park',
  },
  {
    key: '4',
    name: 'Ben Kang',
    age: 15,
    address: 'Sidney No. 1 Lake Park',
  },
];

export default defineComponent({
  setup() {
    return {
      data,
      columns,
    };
  },
});
</script>

<style scoped>
.ant-table-striped :deep(.table-striped) {
  background-color: #fafafa;
}
</style>