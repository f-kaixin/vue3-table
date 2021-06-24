import { computed, defineComponent, createVNode } from 'vue';
import { Radio, Checkbox } from 'ant-design-vue';

export default defineComponent({
  name: 'selectionBox',
  inheritAttrs: false,
  props: {
    // 默认选中项
    defaultSelection: {

    },
    // 选中行数据
    selectedRows: {
      type: Array,
      default: () => [],
    },
    selectedRowKeys: {
      type: Array,
      default: () => [],
    },
    // 当前行数据
    row: {
      type: Object,
      default: () => {},
    },
    rowKey: {

    },
    type: {
      type: String,
      default: 'checkbox',
    },
    name: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },

  setup: function setup(props, context) {
    return {
      checked: computed(function () {
        let defaultSelection = props.defaultSelection,
            selectedRows = props.selectedRows,
            selectedRowKeys = props.selectedRowKeys,
            row = props.row;
            // rowIndex = props.rowIndex;

        let checked = selectedRowKeys.includes(row.key);

        // if (selectedRows) {
        //   checked = selectedRows.includes(row);
        // } else {
        //   checked = store.selectedRowKeys.indexOf(rowIndex) >= 0 || defaultSelection.indexOf(rowIndex) >= 0;
        // }
        return checked;
      })
    };
  },

  render() {
    let checked = this.checked;

    // var checkboxProps = _extends({
    //   checked: checked
    // }, rest);

    // if (type === 'radio') {
    //   checkboxProps.value = rowIndex;
    //   return _createVNode(Radio, checkboxProps, null);
    // }

    return createVNode(Checkbox, {
      checked,
      onChange: this.$attrs.onChange,
      name: this.name,
      disabled: this.disabled,
    }, null);
  }
});