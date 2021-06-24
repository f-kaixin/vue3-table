class HTMLCollectionArray extends Array<number>
{
    private _values;
    constructor(value: HTMLCollection) {
        super();
        this._values = value;
        console.log()
    }

    _map(item: any, index?: number) {
        return this.map(item, index);
    }
}

export default HTMLCollectionArray;
