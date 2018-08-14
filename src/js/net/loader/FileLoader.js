/**
 * 文件下载器
 *
 * FileLoader 类提供对大文件下载的低级访问，可在下载过程中暂停/恢复下载，并在网络闪断恢复后自动断点续载。
 * 有关下载进度的通知，通过 bytesLoaded 和 bytesTotal 属性以及已调度的事件可以获取。
 * FileLoader 类允许在完成下载前关闭，已下载文件的内容将作为原始二进制数据提供。
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
const slice = Symbol('slice')
const aline = Symbol('aline')
const rline = Symbol('rline')
const online = Symbol('online')
const offline = Symbol('offline')
const onStart = Symbol('onStart')
const onProgress = Symbol('onProgress')
const onHTTPStatus = Symbol('onHTTPStatus')
const onComplete = Symbol('onComplete')
const onError = Symbol('onError')
const onClose = Symbol('onClose')
const onLoadend = Symbol('onLoadend')

export default class FileLoader extends EventEmitter {
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
     * 从加载操作接收的数据。在加载过程中填充该属性。该数据是一个包含原始二进制数据的 ArrayBuffer 对象。
     *
     * @returns {*|arraybuffer}
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
     * 控制是以原始二进制数据 (LoaderDataFormat.BINARY) 接收下载的数据。
     *
     * @returns {*|string}
     */
    get dataFormat () {
        return this._dataFormat
    }
    
    // noinspection JSAnnotator
    set dataFormat (value) {
        if (value !== LoaderDataFormat.BINARY) {
            throw new TypeError(`文件下载仅支持二进制数据下载，如有其他需求请联系作者。`)
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
        // ignore..
        // this._timeout = value
    }
    
    /**
     * state
     * 只读，返回下载状态。0：连接尚未打开，1：连接已打开，2：请求头部和状态已可获取，3：下载中，4：下载完成。
     *
     * @returns {*|uint}
     */
    get state () {
        return this._state
    }
    
    /**
     * 关闭进行中的加载操作
     */
    close () {
        this[abort]()
        this[reset]()
    }
    
    /**
     * 暂停下载，可恢复继续下载
     */
    pause () {
        if (this.state !== 3) return
        this._active_disconnect = true
        this[abort]()
    }
    
    /**
     * 继续下载
     */
    resume () {
        if (this.state !== 3) return
        this[slice]()
    }
    
    /**
     * 从指定的 URL 发送和加载数据。
     */
    load (request) {
        if (request) this._request = request
        try {
            // open load
            this._xhr.open(this._request.method, this._request.url, true)
            this._xhr.responseType = 'arraybuffer'
            if (this._request.requestHeaders && this._request.requestHeaders.length) {
                this._request.requestHeaders.map((item) => {
                    this._xhr.setRequestHeader(item.name, item.value)
                })
            }
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
            this._xhr.addEventListener('abort', this[onClose].bind(this), false)
            this._xhr.addEventListener('readystatechange', this[onHTTPStatus].bind(this), false)
            this._xhr.addEventListener('error', this[onError].bind(this), false)
        } catch (err) {
            throw err
        }
    }
    
    [reset] () {
        this._state = 0
        this._loaded = 0
        this._total = 0
        this._data = null
        this._dataFormat = LoaderDataFormat.BINARY
        this._timeout = 0
        this._xhr = null
        this._loader = null
    }
    
    [abort] () {
        this[rline]()
        if (this._xhr) {
            this._xhr.abort()
            this._xhr.removeEventListener('loadstart', this[onStart].bind(this), false)
            this._xhr.removeEventListener('abort', this[onClose].bind(this), false)
            this._xhr.removeEventListener('readystatechange', this[onHTTPStatus].bind(this), false)
            this._xhr.removeEventListener('error', this[onError].bind(this), false)
        }
        
        if (this._loader) {
            this._loader.abort()
            this._loader.removeEventListener('load', this[onComplete].bind(this), false)
            this._loader.removeEventListener('progress', this[onProgress].bind(this), false)
            this._loader.removeEventListener('abort', this[onClose].bind(this), false)
            this._loader.removeEventListener('readystatechange', this[onHTTPStatus].bind(this), false)
        }
    }
    
    [onStart] (evt) {
        this._state = 1
        let _evt = {
            code: LoaderEvent.START,
            level: EventLevel.STATUS,
            target: this,
            message: `FileLoader start load "${this._request && this._request.url}".`
        }
        this.emit(LoaderEvent.START, _evt)
    }
    
    [onClose] (evt) {
        if (this._active_disconnect) {
            this._active_disconnect = false
            return
        }
        let _evt = {
            code: LoaderEvent.CLOSE,
            level: EventLevel.STATUS,
            target: this,
            loaded: this.bytesLoaded,
            total: this.bytesTotal,
            message: `FileLoader is closed has been loaded bytes: ${this.bytesLoaded} / ${this.bytesTotal}.`
        }
        this.emit(LoaderEvent.CLOSE, _evt)
    }
    
    [onError] (evt) {
        let _code = 1000
        let _desc = 'network error'
        let _err = {
            code: _code,
            level: EventLevel.ERROR,
            desc: _desc,
            target: this,
            message: `FileLoader load "${this._request && this._request.url}" failed: #${_code}`
        }
        this.emit(LoaderEvent.ERROR, _err)
    }
    
    [onLoadend] (evt) {
        // ignore..
    }
    
    [onHTTPStatus] (evt) {
        let xhr = evt.target
        if (xhr.status === 0) return
        switch (xhr.readyState) {
            case 2:
                if (this._state < 2) this._state = 2
                if (xhr.status >= 400) {
                    this[rline]()
                    let _code = xhr.status
                    let _desc = xhr.status >= 500 ? 'server error' : 'request error'
                    let _err = {
                        code: _code,
                        level: EventLevel.ERROR,
                        desc: _desc,
                        target: this,
                        message: `FileLoader state:${this._state} load ${this._request && this._request.url} failed. #${_code}`
                    }
                    this.emit(LoaderEvent.ERROR, _err)
                } else {
                    if (this._state >= 3) return
                    this.bytesTotal = this._xhr.getResponseHeader('Content-Length')
                    if (!this.bytesTotal) {
                        let _code = 1001
                        let _desc = 'unable to get file size'
                        let _err = {
                            code: _code,
                            level: EventLevel.ERROR,
                            desc: _desc,
                            target: this,
                            message: `FileLoader load "${this._request && this._request.url}" failed: #${_code}`
                        }
                        this.emit(LoaderEvent.ERROR, _err)
                        return
                    }
                    this._active_disconnect = true
                    this[abort]()
                    this[slice]()
                    this[aline]()
                }
                break
        }
    }
    
    [aline] () {
        if (this._state !== 3) return
        window.addEventListener('online', this[online].bind(this), false)
        window.addEventListener('offline', this[offline].bind(this), false)
        // if(window.navigator.onLine==true) alert（"已连接"）；
    }
    
    [rline] () {
        window.removeEventListener('online', this[online].bind(this), false)
        window.removeEventListener('offline', this[offline].bind(this), false)
    }
    
    [slice] () {
        this._state = 3
        try {
            this._loader = new XMLHttpRequest()
            this._loader.addEventListener('progress', this[onProgress].bind(this), false)
            this._loader.addEventListener('abort', this[onClose].bind(this), false)
            this._loader.addEventListener('load', this[onComplete].bind(this), false)
            this._loader.addEventListener('readystatechange', this[onHTTPStatus].bind(this), false)
            this._loader.open(this._request.method, this._request.url, true)
            this._loader.setRequestHeader('Content-Type', 'application/octet-stream')
            this._loader.setRequestHeader('Range', `bytes=${this.bytesLoaded}-${this.bytesLoaded + 204799}`)
            this._loader.responseType = 'arraybuffer'
            this._loader.send(null)
        } catch (err) {
            throw err
        }
    }
    
    [onProgress] (evt) {
        if (this._loader.readyState < 2) return
        if (this._loader.status >= 400) return
        let _loaded = this.bytesLoaded + evt.loaded
        let _progress = this.bytesTotal ? _loaded / this.bytesTotal : 0
        let _evt = {
            code: LoaderEvent.PROGRESS,
            level: EventLevel.STATUS,
            target: this,
            loaded: _loaded,
            total: this.bytesTotal,
            progress: _progress,
            message: `FileLoader load progress ${parseInt(_progress * 100)}%（${_loaded}/${this.bytesTotal}）.`
        }
        this.emit(LoaderEvent.PROGRESS, _evt)
    }
    
    [onComplete] (evt) {
        if (this._loader && this._loader.status < 400) {
            let response = this._loader.response
            let ln = this.bytesLoaded + response.byteLength
            const temp = new Int8Array(ln)
            if (this.data) temp.set(new Int8Array(this.data), 0)
            temp.set(new Int8Array(response), this.bytesLoaded)
            
            this.data = temp.buffer
            this.bytesLoaded = temp.byteLength
            
            if (this.bytesLoaded < this.bytesTotal) {
                this[slice]()
            } else {
                this._state = 4
                this[rline]()
                let _evt = {
                    code: LoaderEvent.COMPLETE,
                    level: EventLevel.STATUS,
                    target: this,
                    data: this.data,
                    message: `FileLoader load "${this._request && this._request.url}" is completed.`
                }
                this.emit(LoaderEvent.COMPLETE, _evt)
            }
        }
    }
    
    [online] () {
        if (this._state === 3) {
            this[slice]()
            let _evt = {
                code: 'online',
                level: EventLevel.STATUS,
                desc: 'network recovery',
                target: this,
                message: `FileLoader loading "${this._request && this._request.url}" continue, network recovery~`
            }
            this.emit('networkState', _evt)
        }
    }
    
    [offline] () {
        let _evt = {
            code: 'offline',
            level: EventLevel.WARNING,
            desc: 'network disconnection',
            target: this,
            message: `FileLoader loading "${this._request && this._request.url}" break, network disconnection!`
        }
        this.emit('networkState', _evt)
    }
}
