<template>
  <div class="demo-box">
    <p class="demo-box-title">
      <span>基本用法</span>
      <a-button type="primary" :loading="state.loading" @click="getData" style="margin-left: 24px;">请求数据</a-button>
    </p>

    <f-table :columns="columns" :data-source="state.dataSource" :loading="state.loading">
      <template #name="{ text }">
        <a>{{ text }}</a>
      </template>
      <template #customTitle>
        <span>
          <smile-outlined />
          Name
        </span>
      </template>
      <template #tags="{ text: tags }">
        <span>
          <a-tag
            v-for="tag in tags"
            :key="tag"
            :color="tag === 'loser' ? 'volcano' : tag.length > 5 ? 'geekblue' : 'green'"
          >
            {{ tag.toUpperCase() }}
          </a-tag>
        </span>
      </template>
      <template #action="{ record }">
        <span>
          <a>Invite 一 {{ record.name }}</a>
          <a-divider type="vertical" />
          <a>Delete</a>
          <a-divider type="vertical" />
          <a class="ant-dropdown-link">
            More actions
            <down-outlined />
          </a>
        </span>
      </template>
    </f-table>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import { SmileOutlined, DownOutlined } from '@ant-design/icons-vue';
import { Tag as aTag, Divider as aDivider, Button as aButton } from 'ant-design-vue';

const columns = [
  {
    dataIndex: 'name',
    key: 'name',
    slots: { title: 'customTitle', customRender: 'name' },
  },
  {
    title: 'Age',
    dataIndex: 'age',
    key: 'age',
  },
  {
    title: 'Address',
    dataIndex: 'address',
    key: 'address',
  },
  {
    title: 'Tags',
    key: 'tags',
    dataIndex: 'tags',
    slots: { customRender: 'tags' },
  },
  {
    title: 'Action',
    key: 'action',
    slots: { customRender: 'action' },
  },
];

const data = [
  {
    key: '1',
    name: 'John Brown',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['nice', 'developer'],
  },
  {
    key: '2',
    name: 'Jim Green',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['loser'],
  },
  {
    key: '3',
    name: 'Joe Black',
    age: 32,
    address: 'Sidney No. 1 Lake Park',
    tags: ['cool', 'teacher'],
  },
];

export default {
  components: {
    SmileOutlined,
    DownOutlined,
    aTag, 
    aDivider,
    aButton,
  },

  setup() {
    // let loading = ref(false);
    let state = reactive({
      loading: false,
      dataSource: [],
    })

    let getData = () => {
      state.dataSource = [];
      state.loading = true;
      setTimeout(() => {
        state.dataSource = data;
        state.loading = false;
      }, 1000)
    }

    return {
      // loading,
      state,
      columns,
      getData,
    }
  },

  created() {
    console.log(this)
  }
}
</script>

<style>

</style>