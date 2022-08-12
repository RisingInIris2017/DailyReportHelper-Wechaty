import {
    WechatyBuilder,
    WechatyOptions,
    ScanStatus,
    Message
} from 'wechaty'

// import { FileBox } from 'file-box'

const options: WechatyOptions = {
    name : 'DailyReportHelper-Wechaty',
    puppet: 'wechaty-puppet-wechat'
}

const bot = WechatyBuilder.build(options)

bot
    .on('scan',   onScan)
    .on('error',  onError)
    .on('message', onMessage)
    .start()
    .catch(async e => {
        console.error('Bot start() fail:', e)
        await bot.stop()
        process.exit(-1)
    })

function onScan (qrcode: string, status: ScanStatus) {
    if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
        const qrcodeImageUrl = [
        'https://wechaty.js.org/qrcode/',
        encodeURIComponent(qrcode),
        ].join('')
        console.info('Click here to scan %s', qrcodeImageUrl)
    } else {
        console.info('Scan status: %s', status)
    }
}

function onError (e: Error) {
    console.error('Bot error:', e)
}

async function onMessage (msg: Message) {
    console.info(msg.toString())

    if (msg.self()) {
        console.info('Received test message')
        // return
    }

    if (msg.type() !== bot.Message.Type.Attachment) {
        console.info('Received non-Attachment message')
        return
    }
}
