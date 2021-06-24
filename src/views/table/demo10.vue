<template>
  <div class="demo-box">
    <p class="demo-box-title">选择和操作</p>
    <div style="margin-bottom: 16px; text-align: left;">
      <a-button type="primary" :disabled="!hasSelected" :loading="loading" @click="start">
        Reload
      </a-button>
      <span style="margin-left: 8px">
        <template v-if="hasSelected">
          {{ `Selected ${selectedRowKeys.length} items` }}
        </template>
      </span>
    </div>
    <f-table
      :row-selection="{ selectedRowKeys: selectedRowKeys, onChange: onSelectChange }"
      :columns="columns"
      :data-source="dataSource"
    />
    
    <a-pagination style="text-align: right; margin-top: 16px;" :current="current" :total="total" show-less-items  @change="changePageNo" />
  </div>
</template>

<script>
import { computed, defineComponent, reactive, toRefs, ref } from 'vue';
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
    aButton,
    aPagination,
  },

  setup() {
    const state = reactive({
      selectedRowKeys: [], // Check here to configure the default column
      loading: false,
      dataSource: [],
    });
    const hasSelected = computed(() => state.selectedRowKeys.length > 0);

    const start = () => {
      state.loading = true;
      // ajax request after empty completing
      setTimeout(() => {
        state.loading = false;
        state.selectedRowKeys = [];
        console.log(state.selectedRowKeys)
      }, 1000);
    };
    const onSelectChange = (selectedRowKeys) => {
      console.log('selectedRowKeys changed: ', selectedRowKeys);
      state.selectedRowKeys = selectedRowKeys;
    };

    const current = ref(1);
    const total = ref(data.length);
    const changePageNo = (pageNo) => {
      state.loading = true;
      current.value = pageNo;
      state.loading = false;
    }

    onBeforeMount(() => {
      state.dataSource = data.slice((current.value - 1) * 10, current.value * 10);
    });
    onBeforeUpdate(() => {
      state.dataSource = data.slice((current.value - 1) * 10, current.value * 10);
    });

    return {
      columns,
      hasSelected,
      ...toRefs(state),

      // func
      start,
      onSelectChange,

      current,
      total,
      changePageNo,
    };
  },
});
</script>