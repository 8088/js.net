/* eslint-disable no-undef */
export default class LoaderDataFormat {
    /**
     * [静态] 指定以原始二进制数据形式接收下载的数据。
     * @type {string}
     */
    static BINARY = 'binary'
    
    /**
     * [静态] 指定以 JONS 对象形式接收下载的数据。
     * @type {string}
     */
    static JSON = 'json'
    
    /**
     * [静态] 指定以文本形式接收已下载的数据。
     * @type {string}
     */
    static TEXT = 'text'
    
    /**
     * [静态] 指定以DOM树形式接收已下载的数据。
     * @type {string}
     */
    static DOCUMENT = 'document'
    
    /**
     * [静态] 指定以 ZIP 对象形式接收下载的数据。
     * @type {string}
     */
    static ZIP = 'zip'
}
