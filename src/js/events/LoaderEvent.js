/* eslint-disable no-undef,padded-blocks */
export default class LoaderEvent {
    /**
     * 在对所有已接收数据进行解码并将其放在 Loader 对象的 data 属性中以后调度。
     */
    static COMPLETE = 'complete'
    
    /**
     * 当对 Loader.load() 的调用尝试通过 HTTP 访问数据时调度。
     */
    static HTTP_STATUS = 'httpStatus'
    
    /**
     * 若对 Loader.load() 的调用导致致命错误并因此终止了下载，则进行调度。
     */
    static ERROR = 'error'
    
    /**
     * 在调用 Loader.load() 方法之后开始下载操作时调度。
     */
    static START = 'start'
    
    /**
     * 在调用 Loader.load() 方法之后开始下载操作时调度。
     */
    static PROGRESS = 'progress'
    
    /**
     * 在调用 Loader.close() 方法之后调度。
     */
    static CLOSE = 'close'
    
    /**
     * @private {string}
     */
    static GETBACK = 'getback'
    
}
