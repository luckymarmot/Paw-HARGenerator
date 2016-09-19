import {
    registerCodeGenerator,
    bundle,
    InputField
} from './__mocks__/Shims'

@registerCodeGenerator
export default class Generator {
    static identifier =
        'com.luckymarmot.PawExtensions.HARGenerator'
    static title = 'HAR Generator'
    static help =
        'https://github.com/luckymarmot/Paw-HARGenerator'

    static languageHighlighter= 'json'
    static fileExtension = 'har'

    static inputs = [
        new InputField(
            'onlyLastHTTPExchange',
            'Export Only Last HTTP Exchange',
            'Checkbox',
            { defaultValue: true }
        )
    ]

    constructor() {
        this.context = null
        this.options = null
    }

    // args: context, requests, options
    generate(context, requests, options) {
        this.context = context
        this.options = options

        let log = this._createLog(requests)
        return JSON.stringify(log, null, '  ')
    }

    _createLog(requests) {
        let log = {
            version: '1.2',
            creator: this._createCreator(),
            entries: this._createEntries(requests),
            comment: 'generated by Paw HARGenerator on ' +
                (new Date()).toISOString()
        }

        return { log: log }
    }

    _createCreator() {
        return {
            name: 'Paw',
            version: bundle.appVersion,
            comment: 'OS: Mac OSX ' + bundle.osVersion
        }
    }

    _createEntries(requests) {
        let entries = []

        requests.forEach(request => {
            let _entries = this._createEntriesFromExchanges(request)
            entries = entries.concat(_entries)
        })

        return entries
    }

    _createEntriesFromExchanges(request) {
        let exchanges
        if (this.options.onlyLastHTTPExchange) {
            exchanges = [ request.getLastHTTPExchange() ]
        }
        else {
            exchanges = request.getAllExchanges() || []
        }

        let entries = exchanges.map(exchange => {
            return this._createEntry(exchange)
        })

        return entries
    }

    _createEntry(exchange) {
        let entry = {
            startedDateTime: exchange.date,
            time: exchange.downloadTime,
            request: this._createRequest(exchange),
            response: this._createResponse(exchange),
            cache: {},
            timings: this._createTimings(exchange)
        }

        return entry
    }

    _createRequest(exchange) {
        let match = exchange.requestHeaderString.match(/^([\S]+)/)
        let method = null
        if (match) {
            method = match[1]
        }

        match = exchange.requestHeaderString.match(/([\S]+)/g)
        let httpVersion = null
        if (match) {
            httpVersion = match[2]
        }

        let postData = this._createPostData(exchange)

        let request = {
            method: method,
            url: exchange.requestUrl,
            httpVersion: httpVersion,
            cookies: this._createCookies(exchange),
            headers: this._createHeaders(exchange),
            queryString: this._createQueryString(exchange),
            headerSize: exchange.requestHeaderString.length,
            bodySize: exchange.requestBody.length
        }

        if (postData) {
            request.postData = postData
        }

        return request
    }

    _createCookies(exchange, inResponse = false) {
        let _cookies
        if (inResponse) {
            _cookies = (exchange.getResponseHeaderByName('Cookie') || '')
                .split(/;\s/)
        }
        else {
            _cookies = (exchange.getRequestHeaderByName('Cookie') || '')
                .split(/;\s/)
        }

        let cookies = _cookies.map(cookie => {
            let match = cookie.match(/([^=]*)=(.*)/)

            let name = ''
            let value = ''

            if (match) {
                name = match[1] || ''
                value = match[2] || ''
            }

            return {
                name: name,
                value: value
            }
        })

        return cookies
    }

    _createHeaders(exchange, inResponse = false) {
        let headers
        if (inResponse) {
            headers = exchange.responseHeaders
        }
        else {
            headers = exchange.requestHeaders
        }

        let result = []

        let headerNames = Object.keys(headers)

        for (let header of headerNames) {
            let harHeader = {
                name: header,
                value: headers[header]
            }

            result.push(harHeader)
        }

        return result
    }

    _createQueryString(exchange) {
        let url = exchange.requestUrl
        let match = url.match(/\?([^#\s]*)#?[^\s]*\s/)
        let queries = []

        if (!match) {
            return queries
        }

        let search = match[1] || ''
        let kvs = search.split('&')
        kvs.forEach(kv => {
            let _match = kv.match(/([^=]*)=(.*)/)
            if (_match) {
                let query = {
                    name: _match[1] || '',
                    value: _match[2] || ''
                }

                queries.push(query)
            }
        })

        return queries
    }

    _createPostData(exchange) {
        let body = exchange.requestBody
        if (body === '' && !exchange.getRequestHeaderByName('Content-Type')) {
            return null
        }

        let contentType = exchange.getRequestHeaderByName('Content-Type')

        if (
            contentType &&
            typeof contentType === 'string' &&
            contentType.indexOf('application/x-www-form-urlencoded') === 0
        ) {
            return {
                mimeType: contentType,
                params: this._createParams(exchange),
                text: body
            }
        }

        return {
            mimeType: contentType,
            params: [],
            text: body
        }
    }

    _createParams(exchange) {
        let body = exchange.requestBody
        let params = []

        let kvs = body.split('&')
        kvs.forEach(kv => {
            let match = kv.match(/([^=]*)=(.*)/)
            if (match) {
                let param = {
                    name: decodeURIComponent(
                        (match[1] || '').replace('+', ' ')
                    ),
                    value: decodeURIComponent(
                        (match[2] || '').replace('+', ' ')
                    )
                }
                params.push(param)
            }
        })
        return params
    }

    _createResponse(exchange) {
        let response = {
            status: exchange.responseStatusCode,
            statusText: exchange.responseStatusString,
            httpVersion: exchange.responseHTTPVersion,
            cookies: this._createCookies(exchange, true),
            headers: this._createHeaders(exchange, true),
            content: this._createResponseContent(exchange),
            redirectURL: exchange.getResponseHeaderByName('Location') || '',
            headerSize:
                exchange.responseStatusLine.length +
                exchange.responseHeaderString.length,
            bodySize: -1
        }

        return response
    }

    _createResponseContent(exchange) {
        let mimeType = exchange.getResponseHeaderByName('Content-Type')

        let content = {
            size: (exchange.responseBody || '').length,
            text: exchange.responseBody
        }

        if (mimeType) {
            content.mimeType = mimeType
        }

        return content
    }

    _createTimings(exchange) {
        return {
            send: 0,
            wait: exchange.responseTime,
            receive: exchange.downloadTime - exchange.responseTime
        }
    }
}
