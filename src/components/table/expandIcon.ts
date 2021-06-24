import { 
  h,
  createVNode, 
  defineComponent, 
  ref,
  inject, 
  markRaw, 
  reactive 
} from 'vue';

let prefixCls = 'f-table';
export default defineComponent({
  name: 'expandIcon',

  props: {
    defaultStatus: {
      type: Boolean,
      default: true,
    },
  },

  setup: function setup(props, context) {
    // const status = ref(true);
    const status = ref(props.defaultStatus);
    const clickIcon = function() {
      // ref定义响应式数据修改value值，不如optiosn api方便
      status.value = !status.value;
      context.emit('change', status.value);
    }

    // setup 返回vnode时应该用函数的形式，不能直接返回
    return () => createVNode('span', {
      class: [`${prefixCls}-row-expand-icon`, `${prefixCls}-row-expand-icon-${status.value ? 'expanded' : 'collapsed'}`],
      // tabindex可以设置lvha样式
      tabindex: 0,
      onClick: clickIcon,
    })
  },
})