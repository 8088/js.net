/**
 * URL请求
 *
 * URLRequest 类封装了单个 HTTP 请求中的所有信息。
 * URLRequest 对象将传递给 WorkerLoader、StreamLoader 和 URLLoader 类的 load() 方法和其他加载操作，以便启动 URL 下载。
 * 默认情况下，执行调用的 JS 文件和加载的 URL 必须在同一域中。例如，位于 www.a.com 的 JS文件只能从同样位于 www.a.com 的源中加载数据。要从不同的域中加载数据，服务器上设置跨域策略(请参考：https://developer.mozilla.org/en-US/docs/Web/HTTP/Server-Side_Access_Control）。
 *
 * @author 8088
 */
import EventEmitter from 'events'

const initialize = Symbol('initialize')

export default class URLRequest extends EventEmitter {
    constructor (url = null) {
        super()
        this[initialize](url)
    }
    
    /**
     * data 属性中内容的 MIME 内容类型。
     * 发送 POST 请求时，contentType 和 data 属性的值必须正确对应。contentType 属性的值表示服务器如何解释 data 属性的值。
     * 设置范围参考：http://www.iana.org/assignments/media-types/media-types.xhtml
     *
     * @returns {*|string}
     */
    get contentType () {
        return this._contentType
    }
    
    // noinspection JSAnnotator
    set contentType (value) {
        this._contentType = value
    }
    
    /**
     * 一个对象，它包含将随 URL 请求一起传输的数据。
     * 根据contentType默认值，该对象默认是FormData对象，请参考：https://developer.mozilla.org/en-US/docs/Web/API/FormData
     *
     * @returns {*|null}
     */
    get data () {
        return this._data
    }
    
    // noinspection JSAnnotator
    set data (obj) {
        var temp = null
        if (this._method === 'POST' && obj) {
            temp = new FormData()
            for (var key in obj) {
                temp.append(key, obj[key])
            }
        }
        this._data = temp
    }
    
    /**
     * 控制 HTTP 式提交方法。
     *
     * @returns {*|string}
     */
    get method () {
        return this._method
    }
    
    // noinspection JSAnnotator
    set method (value) {
        this._method = value
    }
    
    /**
     * 要追加到 HTTP 请求的 HTTP 请求标头的数组。该数组由 { name:'token', value:'8088' } 对象组成。数组中的每一对象必须是包含一个名称字符串和一个值字符串的对象。
     *
     * @returns {*|Array}
     */
    get requestHeaders () {
        return this._requestHeaders
    }
    
    // noinspection JSAnnotator
    set requestHeaders (value) {
        this._requestHeaders = value
    }
    
    /**
     * 所请求的 URL。
     *
     * @returns {*|null}
     */
    get url () {
        return this._url
    }
    
    // noinspection JSAnnotator
    set url (value) {
        this._url = value
    }
    
    // Internals
    //
    
    [initialize] (url) {
        this._contentType = 'application/x-www-form-urlencoded'
        this._data = null
        this._method = 'GET'
        this._requestHeaders = []
        this._url = url
    }
}
