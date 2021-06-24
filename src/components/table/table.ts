import { 
  createVNode, 
  defineComponent,
  VNode, 
} from 'vue';

import './util/requestAnimationFrame.js';
import HTMLCollectionArray from './util/extend';
import _ from 'lodash';

import CaretUpFilled from '@ant-design/icons-vue/CaretUpFilled';
import CaretDownFilled from '@ant-design/icons-vue/CaretDownFilled';
import { Spin, Checkbox } from 'ant-design-vue';
import expandIcon from './expandIcon';
import selectionBox from './selectionBox';

import { randomObj, expandTreeKey, sortColumn, column, fixedColumns } from './util/interface';

// ts强校验不应该直接在原型上拓展，最好通过类继承方式
(HTMLCollection as any).prototype._map = Array.prototype.map;

const prefixCls = 'f-table';

export default defineComponent({
  name: 'fTableComponent',
  components: {
    expandIcon,
    selectionBox,
  },

  props: {
    loading: {
      type: Boolean,
      default: false,
    },
    dataSource: {
      type: Array,
      default: () => [],
    },
    columns: {
      type: Array,
      default: (): column[] => [],
      // default: function(): column[] {
      //   return []
      // }
    },
    // 是否渲染边框
    bordered: {
      type: Boolean,
      default: false,
    },
    // 多选配置
    rowSelection: {
      type: Object,
      default: () => {}
    },
    // 行列配置
    scroll: {
      type: Object,
      // vue3 props 对象设置默认值目前不能用 default: () => {} 不传时会是undefined
      default: () => { return {}},
    },
    // 配置行类名
    rowClassName: {
      type: Function,
      default: () => {},
    },
  },

  data() {
    // ts定义类型
    let selectedRows: any[] = [];
    let selectedRowKeys: (number | string)[] = [];
    let expandTreeKey: expandTreeKey[] = [];
    let sortColumn: sortColumn = {};
    // header表头分组可能有多行是二级数组
    let renderHeaderColumns: column[][] = [];
    let renderTableColumns: column[] = [];
    let scrollTableDom: (HTMLDivElement | any) = undefined;
    let leftTableDom: (HTMLDivElement | any) = undefined;
    let rightTableDom: (HTMLDivElement | any) = undefined;

    return {
      // 选中行集合
      selectedRows,
      // 选中行key集合
      selectedRowKeys,

      // 树形展开行key
      expandTreeKey,
      // 可展开的行key
      expandRow: [] as any[],

      // 记录排序列
      sortColumn,

      fixedColumns: {
        left: [] as column[],
        right: [] as column[],
      } as fixedColumns,

      // 表格滚动位置 left middle right
      tableScrollPosition: 'left',
      scrollLoading: false,
      
      // table dom引用
      scrollTableDom,
      leftTableDom,
      rightTableDom,

      // 记录当前页面滚动条宽度
      scrollWidth: 0,
      
      // hover行key
      currentHoverRowKey: undefined as (undefined | string | number), 

      // body主体是否存在横向滚动条
      ifExistWrapperScrollX: false, 

      // 表头分组列渲染用
      renderHeaderColumns,
      // 表格列渲染用
      renderTableColumns,

      ifExpandedRowRender: false as boolean,

      // 记录竖直滚动条位置（不然会重复调用滚动，减少滚动距离）
      lastScrollTop: undefined as (undefined | number),
    }
  },

  computed: {
    // 禁止选择的行key
    disabledKeys(): (string | number)[] {
      if(this.dataSource && this.dataSource.length) {
        if (this.rowSelection && this.rowSelection.getCheckboxProps) {
          return this.dataSource.filter(item => this.rowSelection.getCheckboxProps(item).disabled).map((item: any) => item.key);
        }
        return [];
      }
      return [];
    },

    // 是否已配置单选或多选
    ifRowSelection(): boolean {
      return !!(this.rowSelection && Object.keys(this.rowSelection).length);
    },
  },

  watch: {
    // 选中数据触发回调函数
    selectedRowKeys: {
      handler(val, oldVal) {
        // 去掉disabled属性为true的选择框
        let length1 = val.length;
        let arr = val.filter((key: number | string) => !this.disabledKeys.includes(key));
        if (arr.length < length1) {
          this.selectedRowKeys = arr;
          return;
        }

        this.rowSelection.onChange && this.rowSelection.onChange(this.selectedRowKeys, this.selectedRows);
        if (this.rowSelection && this.rowSelection.selectedRowKeys) {
          this.rowSelection.selectedRowKeys = val;
        }
      },
      deep: true
    },

    rowSelection: {
      handler: function handler(val, oldVal) {
        // 修改外部组件的选中行需要在这里同步 （proprs属性和data属性一起管理选中行）
        if (val && 'selectedRowKeys' in val) {
          // 防止监听selectedRows修改无限循环
          if (val.selectedRowKeys.sort().toString() === this.selectedRowKeys.sort().toString()) {
            return;
          }
          
          this.selectedRowKeys = val.selectedRowKeys || [];
          if (!this.selectedRowKeys.length) {
            this.selectedRows = [];
          }
        } else if (oldVal && !val) {
          this.selectedRowKeys = [];
          this.selectedRows = [];
        }
      },
      deep: true
    },

    columns: {
      handler(val) {
        this.initColumns();
      },
      immediate: true,
    },

    dataSource(val) {
      this.currentHoverRowKey = undefined;
    },
  },

  methods: {
    /**
     * 点击表头checkbox
     */
    selectAllRow() {
      if (this.selectedRowKeys.length) {
        this.selectedRows = [];
        this.selectedRowKeys = [];
      } else {
        // 不直接复制浅拷贝会影响原数据
        this.selectedRows = this.dataSource.map(item => item);
        this.selectedRowKeys = this.dataSource.map((item: any) => item.key);
      }

      this.rowSelection.onSelectAll && this.rowSelection.onSelectAll(this.selectedRows);
    },

    /**
     * 选中单行
     * @param {object} row 选中当前行信息
     * @param {object} e JS事件
     */
    selectRow(row: randomObj, e: TouchEvent) {
      let rowInfoIndex = this.selectedRowKeys.findIndex(item => item === row.key);
      let checked;
      if (rowInfoIndex > -1) {
        checked = false;
        this.selectedRows.splice(rowInfoIndex, 1);
        this.selectedRowKeys.splice(rowInfoIndex, 1);
      } else {
        checked = true;
        this.selectedRows.push(row);
        this.selectedRowKeys.push(row.key);
      }

      this.rowSelection.onSelect && this.rowSelection.onSelect(row, checked, this.selectedRows, e);
    },

    /**
     * 判断当前树形行是否需要展开（判断当前行及父级行的show属性）
     * @param {object} currentRow 当前展开行信息
     */
    judgeExpandTreeKey(currentRow: randomObj): boolean {
      // level为1、2时说明
      if (currentRow.level <= 2) {
        if (currentRow.show) {
          return true
        } else {
          return false;
        }
      } else {
        let parentRow: any = this.expandTreeKey.find(item => item.selfKey === currentRow.parentKey);
        return this.judgeExpandTreeKey(parentRow);
      }
    },

    /**
     * 给不同层级的数据设置前面间隔
     * @param {number} level 当前行层级
     * @param {object} row 当前行信息
     */
    prefixGapSpan(level: number, row: randomObj) {
      return createVNode('span', {
        style: {
          // 没有子数据时再缩进一部分，为了和有子数据的行选中icon对齐
          paddingLeft: `${(level - 1 + (row.children && row.children.length ? 0 : 1)) * 20}px`,
        },
      })
    },

    /**
     * 点击表头排序图标
     * @param {object} column 当前列信息
     * @param {object} e 点击事件
     */
    clickSortIcon(column: any, e: TouchEvent) {
      let keyStatus = this.sortColumn[column.dataIndex];
      this.sortColumn = {};
      if (keyStatus === 'ascend') {
        this.sortColumn[column.dataIndex] = 'descend';
      } else if (keyStatus === 'descend') {
      } else {
        this.sortColumn[column.dataIndex] = 'ascend';
      }
    },

    /**
     * 设置默认排序列
     */
    setDefaultSortOrder(): void {
      let column = this.renderTableColumns.find((column: column) => column.sorter && column.defaultSortOrder);
      if (column) {
        let defaultSortOrder = column.defaultSortOrder;
        if (['ascend', 'descend'].includes(defaultSortOrder)) {
          this.sortColumn[column.dataIndex] = defaultSortOrder;
        } else {
          console.error('defaultSortOrder值必须为ascend或descend');
        }
      }
    },

    /**
     * 根据定义的值得到实际需要的值（如width）
     * @param {string, number} val 属性值 如scroll.y属性
     */
    getAttrValue(val: (string | number)): (string | void ) {
      let value
      if (typeof val === 'number') {
        value = `${val}px`;
      } else if (typeof val === 'string') {
        // 数字类型字符串
        if (!isNaN(val as any)) {
          value = `${val}px`;
        }
      } else {
        return console.error(`必须为数字或字符串`);
      }
      return value;
    },

    handleBodyScrollLeft(e: TouchEvent): void {
      // 记录横向滚动条滚动的位置
      if (this.scrollTableDom) {
        let _body = this.scrollTableDom.getElementsByClassName(`${prefixCls}-body-wrapper`)[0]; 
        let _header = this.scrollTableDom.getElementsByClassName(`${prefixCls}-header-wrapper`)[0]; 
        let scrollLeft = _body.scrollLeft;
        _header.scrollLeft = scrollLeft;
        if (scrollLeft === 0) {
          this.tableScrollPosition = 'left';
        } else if (scrollLeft + _body.getBoundingClientRect().width >= _body.scrollWidth) {
          // 滚动距离 + 滚动宽度 >= 实际宽度
          this.tableScrollPosition = 'right';
        } else {
          this.tableScrollPosition = 'middle';
        }
      }
    },

    handleBodyScrollTop(e: TouchEvent) {
      let target = e.target as HTMLElement; 
      let className = target.className;
      let scrollTop = target.scrollTop;
      if (this.lastScrollTop === scrollTop) {
        return;
      }
      this.lastScrollTop = scrollTop;
      if (className.indexOf(`${prefixCls}-body-wrapper`) < 0) {
        let tableWrapper = this.scrollTableDom.getElementsByClassName(`${prefixCls}-body-wrapper`)[0];
        tableWrapper.scrollTop = scrollTop;
      }
      [this.leftTableDom, this.rightTableDom].map(item => {
        if (item) {
          let bodyInner = item.getElementsByClassName(`${prefixCls}-body-inner`)[0];
          bodyInner.scrollTop = scrollTop;
        }
      })
    },

    /**
     * 使用requestAnimationFrame处理滚动事件
     * @param {object} e 鼠标事件
     */
    rqaBodyScroll(e: TouchEvent) {
      if (e.target !== e.currentTarget) {
        return;
      }

      if(!this.scrollLoading) {
        this.scrollLoading = true;
        requestAnimationFrame(() =>  {
          this.handleBodyScrollTop(e);
          this.handleBodyScrollLeft(e);
          this.scrollLoading = false;
        });
      }

      e.stopPropagation();
      e.preventDefault();
    },
    
    rqaFixedBodyScroll(e: TouchEvent) {
      // 竖向滚动时不设置防抖功能，不然每次滚动的幅度都很小
      this.handleFixedBodyScroll(e);
      // if(!this.scrollLoading) {
      //   this.scrollLoading = true;
      //   requestAnimationFrame(() =>  {
      //     this.handleFixedBodyScroll(e);
      //     this.scrollLoading = false;
      //   });
      // }
    },

    /**
     * 滚动左侧或右侧固定列table时，使高度保持一致
     * @param {object} e 鼠标事件
     */
    handleFixedBodyScroll(e: TouchEvent) {
      let tableWrapper = this.scrollTableDom.getElementsByClassName(`${prefixCls}-body-wrapper`)[0];
      tableWrapper.scrollTop = (e.target as HTMLElement).scrollTop;
    },

    /**
     * 鼠标滑轮滚动事件（暂不处理）
     * @param {object} e 鼠标事件
     */
    handleWheel(e: TouchEvent) {},

    /**
     * 设置固定列的样式（和scroll-body保持一致）
     */
    setFixedStyle() {
      if (this.scrollTableDom) {
        let thHeight = this.scrollTableDom.getElementsByClassName(`${prefixCls}-header-wrapper`)[0].getBoundingClientRect().height;
        let trHeights = this.scrollTableDom.getElementsByClassName(`${prefixCls}-row`)._map((row: HTMLDivElement) => row.getBoundingClientRect().height);
        if (this.leftTableDom) {
          // -1 应该是去掉border影响
          this.leftTableDom.getElementsByClassName(`${prefixCls}-thead`)[0].getElementsByTagName('tr')[0].style.height = `${thHeight - 1}px`;
          this.leftTableDom.getElementsByClassName(`${prefixCls}-tbody`)[0].getElementsByTagName('tr')._map((row: HTMLDivElement, index: number) => row.style.height = `${trHeights[index]}px`);
        }
        if (this.rightTableDom) {
          this.rightTableDom.getElementsByClassName(`${prefixCls}-thead`)[0].getElementsByTagName('tr')[0].style.height = `${thHeight - 1}px`;
          this.rightTableDom.getElementsByClassName(`${prefixCls}-tbody`)[0].getElementsByTagName('tr')._map((row: HTMLDivElement, index: number) => row.style.height = `${trHeights[index]}px`);
        }
      }
    },

    /**
     * 获取当前页面滚动条宽度（设置一个div没有滚动条的,获取其宽度,然后再让其拥有滚动条,在获取宽度,取差值）
     */
    getScrollWidth() {
      let noScroll, scroll, oDiv = document.createElement("DIV");
      oDiv.style.cssText = "position:absolute; top:-1000px; width:100px; height:100px; overflow:hidden;";
      noScroll = document.body.appendChild(oDiv).clientWidth;
      oDiv.style.overflowY = "scroll";
      scroll = oDiv.clientWidth;
      document.body.removeChild(oDiv);
      this.scrollWidth =  noScroll - scroll;
    },

    rowHoverEnter(index: (string | number)) {
      this.currentHoverRowKey = index;
    },
    
    rowHoverLeave(index: (string | number) ) {
      this.currentHoverRowKey = undefined;
    },

    /**
     * 判断是否存在横向滚动条
     */
    ifExistScrollX(dom: HTMLDivElement) {
      return (dom.offsetHeight - dom.clientHeight > 0)
    },

    initColumns() {
      let columns = _.cloneDeep(this.columns);
      let renderHeaderColumns: column[][] = [];
      let renderTableColumns: column[] = [];
      
      let setColumns = (column: column, level: number) => {
        if (renderHeaderColumns[level]) {
          renderHeaderColumns[level].push(Object.assign({}, column, {level}));
        } else {
          renderHeaderColumns[level] = [Object.assign({}, column, {level})];
        }
        if (column.children && column.children.length) {
          for (let ccolumn of column.children) {
            setColumns(ccolumn, level + 1);
          }
        } else {
          renderTableColumns.push(column);
        }
      };
      
      for (let column of columns) {
        // 强制转为column类型
        setColumns(column as column, 0);
      }

      let getChildCol = (column: column) => {
        let col = 1;
        if (column.children && column.children.length) {
          col = 0;
          for (let citem of column.children) {
            col += getChildCol(citem);
          }
        }
        return col;
      }

      // 类型确定
      let getCurrentRow = (item: column, currentLevel: number, depth: number) => {
        if (item && item.children && item.children.length) {
          let rowspan = 1;
          item.children.forEach((citem: column) => {
            let crowspan = getCurrentRow(citem, currentLevel - 1, depth);
            rowspan = Math.max(rowspan, crowspan);
          })
          return depth - rowspan;
        } else {
          return depth - currentLevel
        }
      }

      let depth = renderHeaderColumns.length;
      for (let i = depth - 1; i >= 0; i--) {
        renderHeaderColumns[i].forEach((item: column) => {
          item.rowspan = getCurrentRow(item, i, depth) || 1;
          item.colspan = getChildCol(item);
        })
      }

      this.renderHeaderColumns = renderHeaderColumns;
      this.renderTableColumns = renderTableColumns;
      this.initFixedColumns();
    },

    initFixedColumns() {
      this.fixedColumns.left = [];
      this.fixedColumns.right = [];

      let leftIndex: (number), rightIndex: (number);
      // 记录固定列的key
      this.renderTableColumns.forEach((column: column, index: number) => {
        if (column.fixed === 'left') {
          if (leftIndex && (leftIndex + 1 !== index)) {
            console.error('fixed列必须相邻')
          } else {
            leftIndex = index;
            this.fixedColumns.left.push(column);
          }
        } else if (column.fixed === 'right') {
          if (rightIndex && (rightIndex + 1 !== index)) {
            console.error('fixed列必须相邻')
          } else {
            rightIndex = index;
            (this.fixedColumns.right).push(column);
          }
        }
      })
    },

    /**
     * 获取colgroup vnode
     */
    getColGroup() {
      // 设置colgroup表格规则（设置table每列的样式规则，通过thead设置的话可能会因为其它样式影响到）
      let cols = [];
      if (this.ifRowSelection) {
        cols.push(createVNode('col', {class: `${prefixCls}-selection-col`}))
      }
      if (this.ifExpandedRowRender) {
        cols.push(createVNode('col', {class: `${prefixCls}-expand-icon-col`}))
      }

      this.renderTableColumns.forEach((item : any) => {
        let style = {};

        if (item.width) {
          style = {
            width: item.width,
            // minWidth: item.width,
          }
        }

        cols.push(createVNode('col', {
          style,
          width: item.width,
          // minWidth: item.width,
        }))
      })
      
      return createVNode('colgroup', {}, cols)
    },


    /**
     * 获取thead vnode
     */
    getThead(...args: any[]) {
      let {ifExpandedRowRender, slots} = args[0];
      let thRows: VNode[] = [];
      this.renderHeaderColumns.forEach(headerRow => {
        let thRow: VNode[] = [];
        // 单选时不显示这个
        // 可选择时 配置表头选择框
        if (this.ifRowSelection) {
          this.getRowSelectionHead(thRow);
        }
        
        // 可展开时，设置空单元格
        if (ifExpandedRowRender) {
          this.getExpandRowHead(thRow);
        }

        this.getHeadThRow(headerRow, thRow, slots)        
        thRows.push(createVNode('tr', {}, thRow));
      })

      // 渲染表头
      return createVNode('thead', {
        class: `${prefixCls}-thead`,
      }, thRows);
    },

    getRowSelectionHead(thRow: VNode[]) {
      // 设置多选的显示状态
      let checked, indeterminate; 
      let selectedKeyStr = this.selectedRowKeys.sort().toString();
      let dataSourceKeyStr = this.dataSource.map((item: any) => item.key).sort().toString();

      // 设置表头checkbox的选中状态
      if (selectedKeyStr === dataSourceKeyStr) {
        checked = true; 
      } else if (selectedKeyStr) {
        // 已记录选中行时，判断选中行的key是否在当前展示的列表数据中
        for (let key of this.selectedRowKeys) {
          // 标记半选中状态
          if (this.dataSource.find((item: any) => item.key === key)) {
            indeterminate = true;
            break;
          }
        }
      }

      thRow.push(createVNode('th', {class: `${prefixCls}-selection-column`}, [createVNode(Checkbox, {
        onChange: this.selectAllRow,
        checked,
        indeterminate,
      })]))
    },

    getExpandRowHead(thRow: VNode[]) {
      thRow.push(createVNode('th', {
        class: `${prefixCls}-expand-icon-th`,
        rowspan: 1,
      }))
    },

    getHeadThRow(headerRow: column[], thRow: VNode[], slots: any) {
      headerRow.filter(item => item.colSpan !== 0).forEach(item => {
        let thProps = {
          colSpan: item.colSpan || item.colspan,
          rowSpan: item.rowSpan || item.rowspan,
        };
  
        let content;
        if (item.slots && item.slots.title) {
          content = slots[item.slots.title]({
            text: item.dataIndex,
            record: item,
            // index: index,
            // column: column
          })
        } else {
          content = item.title;
        }
  
        // 当前列可排序
        if (item.sorter) {
          if (!Array.isArray(content)) {
            content = [content];
          }
  
          let childContent = content;
  
          // 添加排序图标
          let sortWrap = createVNode('span', {
            class: {
              [`${prefixCls}-column-sorter`]: true,
            },
            onClick: (e: TouchEvent) => {this.clickSortIcon(item, e)},
          }, [
            createVNode(CaretUpFilled, {
              class: {
                on: this.sortColumn[item.dataIndex] === 'ascend'
              },
            }),
            createVNode(CaretDownFilled, {
              class: {
                on: this.sortColumn[item.dataIndex] === 'descend'
              },
            }),
          ]);
          childContent.push(sortWrap);
          // 存在默认排序方式
          if (item.defaultSortOrder) {
  
          }
  
          content = [createVNode('div', {
            class: [`${prefixCls}-column-sorters`]
          }, childContent)]
        }
  
        thRow.push(createVNode('th', {...{
          class: {
            [`${prefixCls}-th`]: true,
            [`${prefixCls}-cell-ellipsis`]: item.ellipsis,
            [`${prefixCls}-row-cell-break-word`]: item.width,
          },  
          // width: item.width,
        }, ...thProps}, content));
      })
    },



    /**
     * 渲染表格body 每行数据
     * @param {object} row 当前行信息
     * @param {number} level 当前行层级
     * @param {number} level 当前行层级
     * @param {boolean} ifExpandedRowRender 是否有展开行功能
     */
    renderTdRow (...args: any[]) {
      let {row, index, level = 1, ifExpandedRowRender} = args[0];
      let tdRow = [];
      let slots = this.$slots;

      // 可选择行时配置首列
      if (this.ifRowSelection) {
        let rowProps = {};
        if (this.rowSelection.getCheckboxProps) {
          rowProps = this.rowSelection.getCheckboxProps(row);
        }
        tdRow.push(createVNode('td', {class: `${prefixCls}-selection-column`}, [createVNode(selectionBox, {...{
          selectedRows: this.selectedRows,
          selectedRowKeys: this.selectedRowKeys,
          row,
          onChange: (e: TouchEvent)  => {this.selectRow(row, e)}
        }, ...rowProps})]))
      }
      
      // 可展开时
      if (ifExpandedRowRender) {
        tdRow.push(createVNode('td', {
          class: `${prefixCls}-row-expand-icon-cell`,
        }, [
          createVNode(expandIcon, {
            onChange: (status: boolean) => { this.changeExpandIcon(status, row) },
          })
        ]))
      }

      this.renderTableTdByColumn({tdRow, row, index, level, slots});
      return tdRow;
    },

    /**
     * 点击展开行图标
     * @param {boolean} status 当前行状态
     * @param {object} status 当前行信息
     */
    changeExpandIcon(status: boolean, row: randomObj) {
      if (status) {
        let index = this.expandRow.findIndex(item => item === row.key);
        if (index > -1) {
          this.expandRow.splice(index, 1);
        }
      } else {
        this.expandRow.push(row.key)
      }

      this.$forceUpdate();
    },

    /**
     * 渲染td单元格
     * @param {array} 存储当前行单元格vnode
     */
    renderTableTdByColumn(...args: any[]) {
      let {tdRow, row, index, level, slots} = args[0];

      this.renderTableColumns.forEach((citem: column, cindex: number) => {
        // 渲染单元格内容
        let content;
        let tdProps: any = {};
        let columnSlots = citem.customRender || (citem.slots && citem.slots.customRender);
        if (columnSlots) {
          if (typeof columnSlots === 'function') {
            content = columnSlots({
              text: row[citem.dataIndex],
              record: row,
              index,
              column: citem
            });
            // 定义的规则挺多的·
            if (typeof content.children === 'object') {
              tdProps = content.props || {};
              content = [content.children];
            } else {
              if (content.props) {
                tdProps = {
                  rowSpan: content.props.rowSpan,
                  colSpan: content.props.colSpan,
                }
              }
  
              if (content.__v_isVNode) {
                content = [content];
              } else {
                // content = [createVNode(content.type || 'div', content.props || {}, content.children)]
                content = content.children;
              }
            }
          } else {
            // 存在插槽key的模板的话才渲染
            if (slots[columnSlots]) {
              content = slots[columnSlots]({
                text: row[citem.dataIndex],
                record: row,
                index,
                column: citem
              })
            }
          }
        } else {
          content = row[citem.dataIndex];
        }
        
        // 数据存在children属性要在当期行首列展示树形数据
        if (cindex === 0 && row.children) {
          if (!Array.isArray(content)) {
            content = [content];
          }

          // 树形行展开收起图标
          content.unshift(createVNode(expandIcon, {
            // 判断是否存已展开设置状态
            defaultStatus: !!(level === 1 || !this.expandTreeKey.find(expandRow => row.key === expandRow.parentKey)),
            // 定义emit on + 事件名
            onChange: (status: boolean) => { this.changeTreeExpandIcon({status, level, row}) },
          }))
        }

        if (cindex === 0 && level > 1) {
          if (!Array.isArray(content)) {
            content = [content];
          }
          content.unshift(this.prefixGapSpan(level, row));
        }

        // 当这2有一个为0时，html文档说明：colspan="0" 指示浏览器横跨到列组的最后一列。 但是还是会显示，不能达到合并的效果，就不render这个单元格
        if (tdProps.colSpan !== 0 && tdProps.rowSpan !== 0) {
          tdRow.push(createVNode('td', {...{
            class: {
              [`${prefixCls}-td`]: true,
              [`${prefixCls}-cell-ellipsis`]: citem.ellipsis,
              // [`${prefixCls}-row-cell-break-word`]: item.width,
            }, 
          }, ...tdProps}, content))
        }
      })
    },

    /**
     * 点击树形行展开图标
     * @param {boolean} status 当前行展开状态
     * @param {number} level 当前行层级
     * @param {object} level 当前行信息
     */
    changeTreeExpandIcon(...args: any[]) {
      let { status, level, row } = args[0];
      if (level === 1) {
        // 记录当前行
        let recordIndex = this.expandTreeKey.findIndex(item => item.selfKey === row.key);
        if (status) {
          // 图标展开状态，列表行应设置为收起状态
          if (recordIndex > -1) {
            this.expandTreeKey[recordIndex].show = false;
          }
        } 
        else {
          // 图标收起状态，列表行应设置为展开状态
          // 之前已配置过，改变显示状态
          if (recordIndex > -1) {
            this.expandTreeKey[recordIndex].show = true;
          } else {
            // 没有的话重新配置
            this.expandTreeKey.push({
              selfKey: row.key,
              level,
              row,
              show: true,
            })
          }
        }
      }
      
      // 记录子数据行
      (row.children || []).forEach((childRow: randomObj) => {
        let recordIndex = this.expandTreeKey.findIndex(item => item.selfKey === childRow.key);
        if (status) {
          // 图标展开状态，列表行应设置为收起状态
          if (recordIndex > -1) {
            this.expandTreeKey[recordIndex].show = false;
          }
        } 
        else {
          // 图标收起状态，列表行应设置为展开状态
          // 之前已配置过，改变显示状态
          if (recordIndex > -1) {
            this.expandTreeKey[recordIndex].show = true;
          } else {
            // 没有的话重新配置
            this.expandTreeKey.push({
              parentKey: row.key,
              selfKey: childRow.key,
              // 因为是子数据，层级+1
              level: level + 1,
              row: childRow,
              show: true,
            })
          }
        }
      })
      
      // 这里为什么需要$forceUpdate才会刷新，没有响应式吗
      this.$forceUpdate();
    },



    /**
     * 设置td行单元格
     * @param {boolean} ifExpandedRowRender 是否可拓展行
     */
    getTdRows(...args: any[]) {
      let { ifExpandedRowRender } = args[0];
      let tdRows = _.cloneDeep(this.dataSource).sort(this.getSorterFn()).map((row: any, index: number) => {
        let tdRow = this.renderTdRow({row, index, ifExpandedRowRender});
  
        // 根据props属性设置当前行类名
        let rowClassName = '';
        if (this.rowClassName) {
          rowClassName = this.rowClassName(row, index) || '';
        }
  
        return createVNode('tr', {
          class: {
            [`${prefixCls}-row`]: true,
            [`${prefixCls}-row-hover`]: this.currentHoverRowKey === index,
            // 选中行样式
            [`${prefixCls}-row-selected`]: this.selectedRowKeys.includes(row.key),
            // 自定义类名
            [`${rowClassName}`]: true,
          },
          key: row.key,
          onmouseenter: () => { this.rowHoverEnter(index) },
          onmouseleave: () => { this.rowHoverLeave(index) },
        }, tdRow)
      })

      return tdRows;
    },

    /**
     * 设置排序函数
     */
    getSorterFn() {
      // 是否设置排序
      let sorter = (a?: any, b?: any) => 0;
      let column = Object.keys(this.sortColumn);
      if (column.length) {
        // 这里是一定会find到的
        let sColumn = this.renderTableColumns.find(item => item.dataIndex === column[0]);
        if (sColumn) {
          sorter = sColumn.sorter;
        }
      }
      // 设置排序函数
      return (a: any, b: any) => {
        let result = sorter(a, b);
        if (result !== 0) {
          return this.sortColumn[column[0]] === 'descend' ? -result : result;
        }
        return 0;
      }
    },

    /**
     * 展示树形行展示的数据
     * @param {array} tdRows 实际渲染的表格行vnode
     * @param {boolean} ifExpandedRowRender 是否展开行·
     */
    setExpandTreeRow(...args: any[]) {
      let { tdRows, ifExpandedRowRender } = args[0];

      // 层级从小到大排序
      // this.expandTreeKey.sort((a, b) => a.level - b.level);
      let parentKey: (string | number), parentKeyGap: number;
      this.expandTreeKey.forEach((currentRow: expandTreeKey) => {
        // 第一层级渲染（之前逻辑渲染过了）或 当前行隐藏状态 或 判断上级是存在隐藏状态
        if (currentRow.level === 1 || !currentRow.show || !this.judgeExpandTreeKey(currentRow)) {
          return;
        }
        
        // 找出实际渲染的vnode
        let parentTdIndex = tdRows.findIndex((td: any) => td.key === currentRow.parentKey);
        let tdRow = this.renderTdRow({
          row: currentRow.row,
          index: parentTdIndex + 1, 
          level: currentRow.level + 1, 
          ifExpandedRowRender,
        })
        // 记录是否有多行是同一条数据的children
        if (parentTdIndex !== parentKey) {
          parentKey = parentTdIndex;
          parentKeyGap = 1;
        } else {
          parentKeyGap++;
        }

        // 偶尔存在parentTdIndex值小于0的情况，继续渲染会将当前行放在首行渲染
        if (parentTdIndex >= 0) {
          tdRows.splice(parentTdIndex + parentKeyGap, 0, createVNode('tr', {
            class: {
              // 选中行样式
              // [`${prefixCls}-row-selected`]: true,
            },
            key: currentRow.row.key,
          }, tdRow));
        }
      })
    },

    /**
     * 展示树形行展示的数据
     * @param {array} tdRows 实际渲染的表格行vnode
     * @param {object} slots 插槽内容
     */
    setExpandRow(...args: any[]) {
      let { tdRows, slots } = args[0];
      this.expandRow.forEach(key => {
        let _index = tdRows.findIndex((item: VNode) => item.key === key);
        if (_index > -1) {
          let record = this.dataSource.find((item: any) => item.key === key);
          let _vnode = createVNode('tr', {
            class: {
              [`${prefixCls}-expanded-row`]: true,
            },
            key: `extra-row-${key}`,
          }, [
            createVNode('td'),
            createVNode('td', {
              // 表头分组列渲染用
              colSpan: this.renderTableColumns.length,
            }, slots['expandedRowRender']({
              record,
            })),
          ])
          tdRows.splice(_index + 1, 0, _vnode);
        }
      })
    },



    /**
     * 暂无数据vnode
     */
    getEmpryWrapper() {
      return createVNode('div', {
        class: `${prefixCls}-empty`,
      }, [createVNode('p', {
        class: `${prefixCls}-empty-text`,
      }, '暂无数据')]);
    },



    /**
     * 设置表格滚动内容
     * param {} bodyContent 实际渲染的表格vnode
     */
    setScrollBody(...args: any[]) {
      let { bodyContent, scrollX, scrollY, colgroup, thead, tbody, emptyWrapper, ifExpandedRowRender } = args[0];

      // 列表主体内容，左侧固定列，右侧固定列
      let tableScrollWrapper: VNode, fixedLeftWrapper: (VNode | undefined), fixedRightWrapper: (VNode | undefined);

      // this.renderTableContent();
      let headerWrapper = createVNode('div', {
        class: {
          [`${prefixCls}-header-wrapper`]: true,
        },
      }, [createVNode('table', {
        style: {
          width: `100%`,
          minWidth: `${scrollX}`,
        },
      }, [
        colgroup,
        thead,
      ]) ])
      let tableWrapper = createVNode('div', {
        style: {
          maxHeight: scrollY,
          // overflow: 'scroll',
          overflow: 'auto',
        },
        class: {
          [`${prefixCls}-body-wrapper`]: true,
        },
        onScroll: this.rqaBodyScroll,
      }, [createVNode('table', {
        class: `${prefixCls}-fixed`,
        style: {
          width: `100%`,
          minWidth: `${scrollX}`,
        },
      }, [
        colgroup,
        tbody,
      ])]);

      tableScrollWrapper = createVNode('div', {
        class: {
          [`${prefixCls}-scroll`]: true,
        },
      }, [
        headerWrapper,
        tableWrapper,
      ]);


      let fixedTableMaxHeight;
      if (scrollY) {
        // 固定列的高度和主体高度保持一致(高度一致的情况下固定列比主体少了滚动条的高度,主体表格会少显示一个滚动条高度的内容)
        fixedTableMaxHeight = parseFloat(scrollY.replace(/[^0-9]/ig, '')) - this.scrollWidth + 'px';
      }
      
      if (this.fixedColumns.left && this.fixedColumns.left.length) {
        fixedLeftWrapper = this.getFixedColumn({ifExpandedRowRender, type: 'left', colgroup, thead, tbody, fixedTableMaxHeight, scrollY});
      }
      if (this.fixedColumns.right && this.fixedColumns.right.length) {
        fixedRightWrapper = this.getFixedColumn({ifExpandedRowRender, type: 'right', colgroup, thead, tbody, fixedTableMaxHeight, scrollY});
      }
      
      bodyContent = createVNode('div', {
        class: [`${prefixCls}-content`, `${prefixCls}-scroll-position-${this.tableScrollPosition}`],
      }, [
        tableScrollWrapper,
        fixedLeftWrapper,
        fixedRightWrapper,
        emptyWrapper,
      ]);

      let _this = this;

      // 存储dom引用
      setTimeout(() => {
        _this.scrollTableDom = tableScrollWrapper.el;
        fixedLeftWrapper && (_this.leftTableDom =  fixedLeftWrapper.el);
        fixedRightWrapper && (_this.rightTableDom = fixedRightWrapper.el);

        _this.setFixedStyle();
      })

      return bodyContent;
    },

    /**
     * 渲染固定列
     * @param {string} type left,right
     */
    getFixedColumn(...args: any[]) {
      let {ifExpandedRowRender, type, colgroup, thead, tbody, fixedTableMaxHeight, scrollY} = args[0];

      if (ifExpandedRowRender) {
        console.error('当前暂不支持固定列可可展开行功能同时使用');
      } else {
        let fixedWrapper;
        let fixColumnNum = this.fixedColumns[type].length;
        let width;
        let tableWrapper, colGroupVnode, theadVnode, tbodyVnode;

        if (type === 'left') {
          width = this.fixedColumns.left.slice(0, fixColumnNum).reduce((total: number, column: column) => total + column.width, 0);
          if (this.ifRowSelection) {
            // 可选择行时多选择一列
            fixColumnNum += 1;
            // 可选择的首列宽度为60
            width += 60;
          }

          colGroupVnode = createVNode('colgroup', {}, colgroup.children.slice(0, fixColumnNum)),
          theadVnode = createVNode('thead', {class: `${prefixCls}-thead`}, [createVNode('tr', {}, thead.children[0].children.slice(0, fixColumnNum))]),
          tbodyVnode = createVNode('tbody', {class: `${prefixCls}-tbody`}, tbody.children.map((tr: VNode, trIndex: number) => createVNode('tr', {
            class: {
              [`${prefixCls}-row`]: true,
              [`${prefixCls}-row-hover`]: this.currentHoverRowKey === trIndex,
            }, 
            onmouseenter: () => { this.rowHoverEnter(trIndex) },
            onmouseleave: () => { this.rowHoverLeave(trIndex) },
          }, (tr.children as VNode[]).slice(0, fixColumnNum))));
        } else if (type === 'right') {
          width = this.fixedColumns.right.slice(-1, fixColumnNum).reduce((total: number, column: column) => total + column.width, 0);
          
          colGroupVnode = createVNode('colgroup', {}, colgroup.children.slice(-fixColumnNum)),
          theadVnode = createVNode('thead', {class: `${prefixCls}-thead`}, [createVNode('tr', {}, thead.children[0].children.slice(-fixColumnNum))]),
          tbodyVnode = createVNode('tbody', {class: `${prefixCls}-tbody`}, tbody.children.map((tr: VNode, trIndex: number) => createVNode('tr', {
            class: {
              [`${prefixCls}-row`]: true,
              [`${prefixCls}-row-hover`]: this.currentHoverRowKey === trIndex,
            }, 
            onmouseenter: () => { this.rowHoverEnter(trIndex) },
            onmouseleave: () => { this.rowHoverLeave(trIndex) },
          }, (tr.children as VNode[]).slice(-fixColumnNum))));
        }

        if (scrollY) {
          let fixTableHeader = createVNode('div', {
            class: [`${prefixCls}-thead`],
          }, [createVNode('table', {
            class: [`${prefixCls}-fixed`],
            style: {
              width: `${width}px`,
            },
          }, [
            colGroupVnode,
            theadVnode
          ])]);
          let tableVnode = [createVNode('div', {
            class: `${prefixCls}-body-outer`,
            style: {
              // 设置marginBottom为负数 使容器高度 + 滚动条高度 合计为 scorll.y
              // marginBottom: `-${this.scrollWidth}px`,
            },
          }, [
            createVNode('div', {
              style: {
                maxHeight: fixedTableMaxHeight,
                overflowY: 'auto',
              },
              class: `${prefixCls}-body-inner`,
              onWheel: this.handleWheel,
              // onScroll: this.rqaFixedBodyScroll,
              onScroll: this.rqaBodyScroll,
            }, [createVNode('table', {
              class: [`${prefixCls}-fixed`],
              style: {
                width: `${width}px`,
              },
            }, [
              colGroupVnode,
              tbodyVnode
            ])])
          ])];

          tableWrapper = [fixTableHeader, tableVnode];
        } else {
          let tableVnode = createVNode('table', {
            style: {
              // 定位元素需要设置宽度
              width: `${width}px`,
            },
            class: {
              [`${prefixCls}-fixed`]: true,
            }
          }, [
            colGroupVnode,
            theadVnode,
            tbodyVnode,
          ])
          tableWrapper = [createVNode('div', {class: `${prefixCls}-body-outer`}, [
            createVNode('div', {
              style: {
                maxHeight: fixedTableMaxHeight,
                overflowY: 'auto',
              },
              class: `${prefixCls}-body-inner`,
              onWheel: this.handleWheel,
              // onScroll: this.rqaFixedBodyScroll,
              onScroll: this.rqaBodyScroll,
            }, [tableVnode])
          ])];
        }

        fixedWrapper = createVNode('div', {class: `${prefixCls}-fixed-${type}`}, tableWrapper);
        return fixedWrapper;
      }
    },
  },

  created() {
    // this.initColumns();
    this.getScrollWidth();
    this.setDefaultSortOrder();

    window.addEventListener('resize', this.setFixedStyle);
  },
  
  beforeDesroy() {
    window.removeEventListener('resize', this.setFixedStyle);
  },

  render() {
    let _this = this;
    let slots = this.$slots;

    let title, footer, ifExpandedRowRender;
    if (slots.title) {
      title = createVNode('div', {class: `${prefixCls}-title`}, slots.title())
    }
    if (slots.footer) {
      footer = createVNode('div', {class: `${prefixCls}-footer`}, slots.footer())
    }
    if (slots.expandedRowRender) {
      ifExpandedRowRender = true;
    }

    let colgroup = this.getColGroup();
    let thead = this.getThead({ifExpandedRowRender, slots});

    // 列表body
    let tdRows = this.getTdRows({ifExpandedRowRender});

    // 实际渲染的表格内容
    let bodyContent;

    this.setExpandTreeRow({tdRows});
    
    if (ifExpandedRowRender) {
      this.setExpandRow({tdRows, slots});
    }

    let tbody = createVNode('tbody', {
      class: `${prefixCls}-tbody`,
    }, tdRows
    )

    // 设置行列
    let scrollX, scrollY;
    if (this.scroll.x) {
      scrollX = this.getAttrValue(this.scroll.x);
    }
    if (this.scroll.y) {
      scrollY = this.getAttrValue(this.scroll.y);
    }
    
    // 没有数据时的dom
    let emptyWrapper;
    if (!tdRows.length) {
      emptyWrapper = this.getEmpryWrapper();
    }

    // 存在可能出现滚动条的功能时
    if (scrollY || scrollX || (this.fixedColumns.left && this.fixedColumns.left.length) || (this.fixedColumns.right && this.fixedColumns.right.length)) {
      bodyContent = this.setScrollBody({bodyContent, scrollY, scrollX, colgroup, thead, tbody, emptyWrapper, ifExpandedRowRender});
    }

    // 没有固定列固定表头等特殊功能且表格存在数据时，设置基本dom结构
    if (!bodyContent) {
      bodyContent = createVNode('div', {
        class: `${prefixCls}-body`,
      }, [
        createVNode('table', {
          class: {
            [`${prefixCls}-fixed`]: true,
          },
        }, [
          colgroup,
          thead,
          tbody,
        ]),
        emptyWrapper,
      ])
    }

    return createVNode('div', {
      'class': {
        [`${prefixCls}-wrapper`]: true,
        [`${prefixCls}-bordered`]: this.bordered,
      },
    }, [
      createVNode(Spin, {
        spinning: this.loading,
      }, [
        title,
        bodyContent,
        footer
      ])
    ])
  }
})