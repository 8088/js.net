# js.net

The js.net package contains classes for sending and receiving over a network.

## example

``` bash
import URLRequest from 'js/net/loader/URLRequest'
import WorkerLoader from 'js/net/loader/WorkerLoader'
import LoaderDataFormat from 'js/net/loader/LoaderDataFormat'
import LoaderEvent from 'js/events/LoaderEvent'

var url = 'http://127.0.0.1/test.zip'
var request = new URLRequest(url)
var loader = new WorkerLoader()
loader.dataFormat = LoaderDataFormat.ZIP
loader.addListener(LoaderEvent.START, (evt) => { console.log(evt) })
loader.addListener(LoaderEvent.PROGRESS, (evt) => { console.log(evt) })
loader.addListener(LoaderEvent.ERROR, (evt) => { console.log(evt) })
loader.addListener(LoaderEvent.HTTP_STATUS, (evt) => { console.log(evt) })
loader.addListener(LoaderEvent.COMPLETE, (evt) => {
    let loader = evt.target
    console.log('zip file downloaded and decompressed, including internal files：', loader.data)
    loader.getFile('xxx').then((file) => { console.log(evt) }
})
loader.addListener(LoaderEvent.CLOSE, (evt) => { console.log(evt) })
try {
   loader.load(request)
} catch (err) {
   // ignore..
}
```


See the [Wiki](https://github.com/8088/js.net/wiki) usage tips. Or look at the source code annotation.
