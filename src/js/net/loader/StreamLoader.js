/**
 * 流式下载器
 *
 * StreamLoader 类提供对下载 URL 的低级访问。数据一下载，便可随即为应用程序使用，这和使用 URLLoader 时需要等到整个文件下载完不同。并且 URLStream 类还允许在完成下载前关闭流。已下载文件的内容将作为原始二进制数据提供。
 * 在 URLStream 中的读取操作是非阻塞模式的。这意味着您在读取数据之前必须使用 bytesAvailable 属性来确定是否能够获得足够的数据。如果不能获得足够的数据，将引发 EOFError 异常。
 *
 * 在默认情况下，所有二进制数据都是以 Big-endian 格式编码的，并且最高位字节于第一位。
 *
 * 适用于通过 URLStream 类进行 URL 下载的安全规则与适用于 URLLoader 对象的规则相同。
 *
 * @author 8088
 */

import EventEmitter from 'events'

const initialize = Symbol('initialize')

export default class StreamLoader extends EventEmitter {
    constructor () {
        super()
        this[initialize]()
    }
    
    // Internals
    //
    
    [initialize] () {
    
    }
}
