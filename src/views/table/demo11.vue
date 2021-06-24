<template>
  <div class="demo-box">
    <p class="demo-box-title">选择和操作</p>
    <div style="margin-bottom: 16px; text-align: left;">
      <a-button type="primary" @click="selectAllRow">
        Select All Data
      </a-button>
      <a-button type="primary" @click="selectOddRow" style="margin-left: 16px">
        Select Odd Row
      </a-button>
      <a-button type="primary" @click="selectEvenRow" style="margin-left: 16px">
        Select Even Row
      </a-button>
    </div>
    <f-table :row-selection="rowSelection" :columns="columns" :data-source="data" />
  </div>
</template>

<script>
import { defineComponent, computed, ref, unref } from 'vue';
import { onBeforeMount, onBeforeUpdate } from 'vue'
import { Button as aButton, Pagination as aPagination } from 'ant-design-vue';

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
  },
  {
    title: 'Age',
    dataIndex: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
  },
];
const data = [];
for (let i = 0; i < 46; i++) {
  data.push({
    key: i,
    name: `Edward King ${i}`,
    age: 32,
    address: `London, Park Lane no. ${i}`,
  });
}

export default defineComponent({
  components: {
    aButton
  },

  setup() {
    const selectedRowKeys = ref([]); // Check here to configure the default column

    const onSelectChange = (changableRowKeys) => {
      console.log('selectedRowKeys changed: ', changableRowKeys);
      selectedRowKeys.value = changableRowKeys;
    };

    const selectAllRow = () => {
      selectedRowKeys.value = [...Array(data.length).keys()]; // 0...45
    };

    const selectEvenRow = () => {
      selectedRowKeys.value = data.filter((key, index) => {
        if (index % 2 !== 0) {
          return false;
        }
        return true;
      }).map(item => item.key);
    };

    const selectOddRow = () => {
      selectedRowKeys.value = data.filter((key, index) => {
        if (index % 2 !== 0) {
          return true;
        }
        return false;
      }).map(item => item.key);
    };

    const rowSelection = computed(() => {
      return {
        selectedRowKeys: unref(selectedRowKeys),
        onChange: onSelectChange,
        hideDefaultSelections: true,
      };
    });
    return {
      data,
      columns,
      selectedRowKeys,
      rowSelection,

      selectAllRow,
      selectEvenRow,
      selectOddRow,
    };
  },
});
</script>