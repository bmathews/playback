import http from 'http'
import rangeParser from 'range-parser'
import pump from 'pump'
import network from 'network-address'
import { EventEmitter } from 'events'

class Server extends EventEmitter {

  constructor(controller, cb) {
    super()
    this.controller = controller
    this.server = http.createServer(this.route.bind(this)).listen(0, () => {
      const path = this.getPath()
      console.log('Playback server running at: ' + path)
      cb(path)
    })
  }

  route(req, res) {
    if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    if (req.url === '/follow') return this.handleFollow(req, res)
    if (req.url.endsWith('/subtitles')) return this.handleSubtitles(req, res)
    return this.handleFile(req, res)
  }

  handleSubtitles(req, res) {
    const uri = decodeURIComponent(req.url.split('/')[1])
    const file = this.controller.getFile(uri)

    if (!file) {
      res.statusCode = 404
      res.end()
      return
    }

    const buf = file.subtitles

    if (buf) {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8')
      res.setHeader('Content-Length', buf.length)
      res.end(buf)
    } else {
      res.statusCode = 404
      res.end()
    }
  }

  handleFollow(req, res) {
    console.log(req, res)
  }

  handleFile(req, res) {
    const uri = decodeURIComponent(req.url.split('/')[1])
    const file = this.controller.getFile(uri)

    if (!file) {
      res.statusCode = 404
      res.end()
      return
    }

    const range = req.headers.range && rangeParser(file.length, req.headers.range)[0]

    res.setHeader('Accept-Ranges', 'bytes')
    res.setHeader('Content-Type', 'video/mp4')

    if (!range) {
      res.setHeader('Content-Length', file.length)
      if (req.method === 'HEAD') return res.end()
      pump(file.createReadStream(), res)
      return
    }

    res.statusCode = 206
    res.setHeader('Content-Length', range.end - range.start + 1)
    res.setHeader('Content-Range', 'bytes ' + range.start + '-' + range.end + '/' + file.length)

    if (req.method === 'HEAD') return res.end()

    pump(file.createReadStream(range), res)
  }

  getPath() {
    return `http://${network()}:${this.server.address().port}`
  }

}

export default Server
