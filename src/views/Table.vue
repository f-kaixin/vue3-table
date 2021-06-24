<template>
  <div class="table"> 
    table 页面
    <br>

    <div class="content">
      <demo0></demo0>
      <demo1></demo1>
      <demo2></demo2>
      <demo3></demo3>

      <!-- 固定表头 -->
      <demo5></demo5>

      <!-- 固定列 -->
      <demo6></demo6>

      <!-- 固定头和列 -->
      <demo7></demo7>

      <!-- 筛选和排序 -->
      <demo8></demo8>

      <!-- 表头分组 -->
      <demo9></demo9>

      <!-- 选择和操作 -->
      <demo10></demo10>
      
      <!-- 自定义选择项 -->
      <demo11></demo11>

      <!-- 可选择 -->
      <demo12></demo12>

      <!-- 带斑马纹表格 -->
      <demo13></demo13>

      <!-- 嵌套子表格 -->
      <demo14></demo14>
    </div>
  </div>
</template>

<script>
let demos = require.context('./table', false, /\.vue$/);
let components = {};
demos.keys().forEach(fileName => {
  let comp = demos(fileName)
  components[fileName.replace(/^\.\/(.*)\.\w+$/, '$1')] = comp.default
})

export default {
  components,
}
</script>

<style>
  .content {
    padding: 24px;
  }

  .demo-box {
    background-color: #fff;
    padding: 24px;
    color: rgba(0,0,0,.85);
    border-bottom: 1px solid #f0f0f0;
    margin-bottom: 48px;
    border: 1px solid #1890ff;
    clear: both;
    overflow: hidden;
  }
  .demo-box-title {
    text-align: left;
  }
</style>