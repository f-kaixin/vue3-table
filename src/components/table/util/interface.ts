interface column {
    // 每列的具体配置
    title?: string,
    rowspan?: string | number,
    colspan?: string | number,
    level?: number,
    children?: column[],
    [key: string]: any;
} 

interface randomObj {
    [key: string]: any;
    [key: number]: any;
}

interface expandTreeKey {
    parentKey?: (string | number),
    selfKey: (string | number),
    level: number,
    row: column,
    show: boolean,
}

interface sortColumn {
    [key: string]: string,
}

interface fixedColumns {
    [key: string]: column[],
}

export {
    randomObj,
    expandTreeKey,
    sortColumn,
    column,
    fixedColumns,
}