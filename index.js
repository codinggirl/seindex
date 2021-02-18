const service = require('restana')()
const got = require('got')

async function get上证指数() {
    const api = 'http://yunhq.sse.com.cn:32041//v1/sh1/line/000001'
    const { body } = await got(api, {
        responseType: 'json'
    })
    if (body.line) {
        const line = body.line
        const last = line.pop()
        return {
            name: '上证指数',
            now: last ? last[0] : null
        }
    }
    return null
}

async function get深证成指() {
    const api = 'http://www.szse.cn/api/market/ssjjhq/getTimeData?marketId=1&code=399001'
    const { body } = await got(api, {
        responseType: 'json'
    })
    if (body.code === '0' && body.data) {
        delete body.data.picupdata
        delete body.data.picdowndata
        const { name, now, marketTime } = body.data
        return {
            name,
            now,
            marketTime
        }
    }
    return null
}

async function get创业板指() {
    const api = 'http://www.szse.cn/api/market/ssjjhq/getTimeData?marketId=1&code=399006'
    const { body } = await got(api, {
        responseType: 'json'
    })
    if (body.code === '0' && body.data) {
        delete body.data.picupdata
        delete body.data.picdowndata
        const { name, now, marketTime } = body.data
        return {
            name,
            now,
            marketTime
        }
    }
    return null
}

/**
 * 规则：
 * 上证小数点后2位，深成小数点后2位，创业板小数点前1位，创业板小数点后2位
 * 以上数字组合
 * @param {*} sh 上证指数
 * @param {*} sz 深成指数
 * @param {*} cyb 创业板指数
 */
function getLuckNumber(sh, sz, cyb) {
    let a = parseFloat(sh).toFixed(2).split('.')[1]
    let b = parseFloat(sz).toFixed(2).split('.')[1]
    let c = parseFloat(cyb).toFixed(2).split('.')[0].slice(-1)
    let d = parseFloat(cyb).toFixed(2).split('.')[1]
    return `${a}${b}${c}${d}`
}

async function getJsonObj() {
    const [shz, szcz, cyb] = await Promise.all([
        get上证指数(),
        get深证成指(),
        get创业板指()
    ])
    let obj = {
        '上证指数': shz,
        '深证成指': szcz,
        '创业板指': cyb,
        '统一数据': {
            '上证指数': shz.now,
            '上证指数（截取）': shz.now.toFixed(2),
            '深证成指': szcz.now,
            '创业板指': cyb.now,
            '幸运数字': getLuckNumber(shz.now, szcz.now, cyb.now)
        }
    }
    return obj
}

async function getJsonString() {
    let obj = await getJsonObj()
    let jsonStr = JSON.stringify(obj, null, 8)
    return jsonStr
}

async function main() {
    service.get('/', async (req, res) => {
        let obj = await getJsonObj()
        let data = obj['统一数据']
        let scriptStr = `
        let d = document
        d.getElementById('shang_zheng').value = ${data['上证指数（截取）']}
        d.getElementById('shen_zheng').value = ${data['深证成指']}
        d.getElementById('chuang_ye').value = ${data['创业板指']}
        `
        let jsonStr = await getJsonString()
        let html = `
        <h1>welcome!</h1>
        <p>json:</p>
        <pre>
        ${jsonStr}
        </pre>
        <p>script:</p>
        <pre>
        ${scriptStr}
        </pre>
        `
        res.send(html, 200, {
            'content-type': 'text/html; charset=utf-8'
        })
    })
    service.get('/json', async (req, res) => {
        let jsonStr = await getJsonString()
        res.send(jsonStr)
    })
    await service.start(process.env.PORT || 3000, process.env.HOST || '127.0.0.1')
}

main()
