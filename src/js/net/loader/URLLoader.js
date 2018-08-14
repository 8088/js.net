/**
 * URL下载器
 *
 * URLLoader 类以文本、二进制数据或 URL 编码变量的形式从 URL 下载数据。 默认URLLoader 对象会先从 URL 中下载所有数据，然后才将数据用于应用程序中的代码。它会发出有关下载进度的通知，通过 bytesLoaded 和 bytesTotal 属性以及已调度的事件，可以监视下载进度。
 * 在加载非常大的视频文件（如视频文件）时，可能会出现内存不足错误。
 * 支持协议：http、https、file、ftp
 *
 * Usage:
 * var url = 'http://127.0.0.1/test.json'
 * var request = new URLRequest(url)
 * var loader = new URLLoader()
 *     loader.dataFormat = LoaderDataFormat.JSON
 *     loader.addListener(LoaderEvent.START, (evt) => { console.log(evt) })
 *     loader.addListener(LoaderEvent.PROGRESS, (evt) => { console.log(evt) })
 *     loader.addListener(LoaderEvent.COMPLETE, (evt) => { console.log(evt) })
 *     loader.addListener(LoaderEvent.HTTP_STATUS, (evt) => { console.log(evt) })
 *     loader.addListener(LoaderEvent.ERROR, (evt) => { console.log(evt) })
 *     loader.addListener(LoaderEvent.CLOSE, (evt) => { console.log(evt) })
 * try {
 *     loader.load(request)
 * } catch (err) {
 *     // ignore..
 * }
 *
 * @author 8088
 */
'use strict'
import EventEmitter from 'events'
import LoaderEvent from '../../events/LoaderEvent'
import EventLevel from '../../events/EventLevel'
import LoaderDataFormat from './LoaderDataFormat'

const initialize = Symbol('initialize')
const reset = Symbol('reset')
const abort = Symbol('abort')
const onStart = Symbol('onStart')
const onProgress = Symbol('onProgress')
const onHTTPStatus = Symbol('onHTTPStatus')
const onTimeout = Symbol('onTimeout')
const onComplete = Symbol('onComplete')
const onError = Symbol('onError')
const onClose = Symbol('onClose')
const onLoadend = Symbol('onLoadend')

export default class URLLoader extends EventEmitter {
    constructor (request = null) {
        super()
        this[initialize](request)
    }
    
    /**
     * bytesLoaded
     * 表示加载操作期间到目前为止加载的字节数。
     *
     * @returns {*|uint}
     */
    get bytesLoaded () {
        return this._loaded
    }
    
    // noinspection JSAnnotator
    set bytesLoaded (value) {
        this._loaded = value
    }
    
    /**
     * bytesTotal
     * 表示所下载数据中的字节总数。正在进行加载操作时该属性包含 0，完成操作时会填充该属性。另外，丢失的 Content-Length 标题将会导致 bytesTotal 不确定。
     *
     * @returns {*|uint}
     */
    get bytesTotal () {
        return this._total
    }
    
    // noinspection JSAnnotator
    set bytesTotal (value) {
        this._total = value
    }
    
    /**
     * data
     * 从加载操作接收的数据。只有完成加载操作时，才会填充该属性。该数据的格式取决于 dataFormat 属性的设置:
     * 如果 dataFormat 属性是 LoaderDataFormat.TEXT，则所接收的数据是一个包含已加载文件文本的字符串。
     * 如果 dataFormat 属性是 LoaderDataFormat.BINARY，则所接收的数据是一个包含原始二进制数据的 ByteArray 对象。
     * 如果 dataFormat 属性是 LoaderDataFormat.DOCUMENT，则所接收的数据是一个包含 DOM树 的文本字符串。
     *
     * @returns {*|null}
     */
    get data () {
        return this._data
    }
    
    // noinspection JSAnnotator
    set data (value) {
        this._data = value
    }
    
    /**
     * dataFormat
     * 控制是以文本 (LoaderDataFormat.TEXT)、原始二进制数据 (LoaderDataFormat.BINARY) 还是 URL 编码变量 (LoaderDataFormat.VARIABLES) 接收下载的数据。
     *
     * @returns {*|string}
     */
    get dataFormat () {
        return this._dataFormat
    }
    
    // noinspection JSAnnotator
    set dataFormat (value) {
        switch (value) {
            case LoaderDataFormat.BINARY:
            case LoaderDataFormat.TEXT:
            case LoaderDataFormat.DOCUMENT:
            case LoaderDataFormat.JSON:
                this._dataFormat = value
                break
            default:
                throw new TypeError(`暂不支持 ${value} 格式的下载，如需要请联系作者。`)
        }
    }
    
    /**
     * timeout
     * 请求超时,时间毫秒(默认0毫秒不计算请求超时) 超时后会抛出TimeoutError
     *
     * @returns {*|int}
     */
    get timeout () {
        return this._timeout
    }
    
    // noinspection JSAnnotator
    set timeout (value) {
        this._timeout = value
    }
    
    /**
     * state
     * 只读，返回下载状态。0：连接尚未打开，1：连接已打开，2：请求头部和状态已可获取，3：下载中，4：下载完成。
     *
     * @returns {*|uint}
     */
    get state () {
        return this._xhr ? this._xhr.readyState : 0
    }
    
    /**
     * 关闭进行中的加载操作
     */
    close () {
        if (this.timeout) clearTimeout(this._timer)
        this[abort]()
        this[reset]()
    }
    
    /**
     * 从指定的 URL 发送和加载数据。
     */
    load (request) {
        if (request) this._request = request
        try {
            // start timer
            if (this.timeout) {
                this._timer = setTimeout(() => {
                    this[abort]()
                    this[onTimeout]()
                }, this.timeout)
            }
            // open load
            this._xhr.open(this._request.method, this._request.url, true)
            if (this._request.requestHeaders && this._request.requestHeaders.length) {
                this._request.requestHeaders.map((item) => {
                    this._xhr.setRequestHeader(item.name, item.value)
                })
            }
            this._xhr.responseType = (this.dataFormat === LoaderDataFormat.BINARY) ? 'arraybuffer' : this.dataFormat
            this._xhr.send(this._request.data)
        } catch (err) {
            throw new TypeError('所传递的请求 URLRequest 对象或 URLRequest.url 属性为 null。')
        }
    }
    
    // Internals
    //
    
    [initialize] (request) {
        this[reset]()
        this._request = request
        try {
            this._xhr = new XMLHttpRequest()
            this._xhr.addEventListener('loadstart', this[onStart].bind(this), false)
            this._xhr.addEventListener('progress', this[onProgress].bind(this), false)
            this._xhr.addEventListener('abort', this[onClose].bind(this), false)
            this._xhr.addEventListener('error', this[onError].bind(this), false)
            this._xhr.addEventListener('load', this[onComplete].bind(this), false)
            // this._xhr.addEventListener('timeout', this[onTimeout].bind(this), false)
            // this._xhr.addEventListener('loadend', this[onLoadend].bind(this), false)
            this._xhr.addEventListener('readystatechange', this[onHTTPStatus].bind(this), false)
        } catch (err) {
            throw err
        }
    }
    
    [reset] () {
        this._loaded = 0
        this._total = 0
        this._data = null
        this._dataFormat = LoaderDataFormat.TEXT
        this._timeout = 0
        this._xhr = null
        this._timer = null
    }
    
    [abort] () {
        if (this._xhr) {
            this._xhr.abort()
            this._xhr.removeEventListener('loadstart', this[onStart].bind(this), false)
            this._xhr.removeEventListener('progress', this[onProgress].bind(this), false)
            this._xhr.removeEventListener('abort', this[onClose].bind(this), false)
            this._xhr.removeEventListener('error', this[onError].bind(this), false)
            this._xhr.removeEventListener('load', this[onComplete].bind(this), false)
            // this._xhr.removeEventListener('timeout', this[onTimeout].bind(this), false)
            // this._xhr.removeEventListener('loadend', this[onLoadend].bind(this), false)
            this._xhr.removeEventListener('readystatechange', this[onHTTPStatus].bind(this), false)
        }
    }
    
    [onStart] (evt) {
        let _evt = {
            code: LoaderEvent.START,
            level: EventLevel.STATUS,
            target: this,
            message: `URLLoader start load "${this._request && this._request.url}".`
        }
        this.emit(LoaderEvent.START, _evt)
    }
    
    [onProgress] (evt) {
        if (this._xhr.readyState < 2) return
        if (this._xhr.status >= 400) return
        this.bytesLoaded = evt.loaded
        if (!this.bytesTotal) this.bytesTotal = evt.total
        if (!this.bytesTotal || this.bytesLoaded > this.bytesTotal) return
        let _progress = this.bytesTotal ? this.bytesLoaded / this.bytesTotal : 0
        let _evt = {
            code: LoaderEvent.PROGRESS,
            level: EventLevel.STATUS,
            target: this,
            loaded: this.bytesLoaded,
            total: this.bytesTotal,
            progress: _progress,
            message: `URLLoader load progress ${parseInt(_progress * 100)}%.`
        }
        this.emit(LoaderEvent.PROGRESS, _evt)
    }
    
    [onClose] (evt) {
        let _evt = {
            code: LoaderEvent.CLOSE,
            level: EventLevel.STATUS,
            target: this,
            loaded: this.bytesLoaded,
            total: this.bytesTotal,
            message: `URLLoader is closed has been loaded bytes: ${this.bytesLoaded} / ${this.bytesTotal}.`
        }
        this.emit(LoaderEvent.CLOSE, _evt)
    }
    
    [onError] (evt) {
        if (this.timeout) clearTimeout(this._timer)
        let _code = 1000
        let _desc = 'network error'
        let _err = {
            code: _code,
            level: EventLevel.ERROR,
            desc: _desc,
            target: this,
            message: `URLLoader load "${this._request && this._request.url}" failed: #${_code}`
        }
        this.emit(LoaderEvent.ERROR, _err)
    }
    
    [onComplete] (evt) {
        if (this._xhr.status >= 400) return
        let response = this._xhr.response || this._xhr.responseText
        switch (this.dataFormat) {
            case LoaderDataFormat.BINARY:
                this.data = response
                break
            case LoaderDataFormat.TEXT:
            case LoaderDataFormat.DOCUMENT:
                this.data = response
                break
            case LoaderDataFormat.JSON:
                try {
                    this.data = ((typeof response) === 'string') ? JSON.parse(response) : response
                } catch (err) {
                    throw new Error('JSON parse failed: ' + response)
                }
                break
        }
        
        let _evt = {
            code: LoaderEvent.COMPLETE,
            level: EventLevel.STATUS,
            target: this,
            data: this.data,
            message: `URLLoader load "${this._request && this._request.url}" is completed.`
        }
        this.emit(LoaderEvent.COMPLETE, _evt)
    }
    
    [onTimeout] (evt) {
        let _code = 408
        let _desc = 'request timeout'
        let _err = {
            code: _code,
            level: EventLevel.ERROR,
            desc: _desc,
            target: this,
            message: `URLLoader load "${this._request && this._request.url}" timeout. #408`
        }
        this.emit(LoaderEvent.ERROR, _err)
    }
    
    [onLoadend] (evt) {
        // ignore..
    }
    
    [onHTTPStatus] (evt) {
        if (this._xhr.status === 0) return
        
        switch (this.state) {
            case 2:
                if (this._xhr.status >= 400) {
                    let _code = this._xhr.status
                    let _desc = this._xhr.status >= 500 ? 'server error' : 'request error'
                    let _err = {
                        code: _code,
                        level: EventLevel.ERROR,
                        desc: _desc,
                        target: this,
                        message: `URLLoader load ${this._request && this._request.url} failed. #${_code}`
                    }
                    this.emit(LoaderEvent.ERROR, _err)
                }
                break
            case 4:
                if (this.timeout) clearTimeout(this._timer)
                let _evt = {
                    code: LoaderEvent.HTTP_STATUS,
                    level: EventLevel.STATUS,
                    target: this,
                    httpStatus: this._xhr.status,
                    message: `URLLoader load ${this._request && this._request.url} http status: ${this._xhr.status}.`
                }
                this.emit(LoaderEvent.HTTP_STATUS, _evt)
                break
        }
    }
}
