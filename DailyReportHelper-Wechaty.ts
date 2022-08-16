import {
    WechatyBuilder,
    WechatyOptions,
    ScanStatus,
    Contact,
    Room,
    Message
} from 'wechaty'

import qrCodeTerminal from 'qrcode-terminal'

import { FileBox } from 'file-box'

// Date Util
import dayjs from 'dayjs'
// File Util
import { 
    existsSync,
    writeFileSync,
    readFileSync
 } from 'fs';
import { resolve } from 'path';

// Configuration
let targetChatroomName: string
let DAILYREPORT_FOLDER: string
let todayCommand: Array<string>
let yesterdayCommand: Array<string>
let infoGroupName: string

const options: WechatyOptions = {
    name : 'DailyReportHelper-Wechaty',
    puppet: 'wechaty-puppet-wechat'
}

const bot = WechatyBuilder.build(options)

bot
    .on('scan', onScan)
    .on('login', onLogin)
    .on('error', onError)
    .on('message', onMessage)
    .start()
    .catch(async e => {console.error('Failed to start:', e); bot.stop(); process.exit(-1);})

function onScan (qrcode: string, status: ScanStatus) {
    if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
        qrCodeTerminal.generate(qrcode, { small: true })
        console.info('Click here to scan https://wechaty.js.org/qrcode/' + encodeURIComponent(qrcode))
    }
}

function onLogin (user: Contact) {
    if (user.self()) {
        console.info('%s has logged in', user.name());
        if (!existsSync(resolve('DateMarker.txt'))) writeFileSync(resolve('DateMarker.txt'), dayjs(new Date(1970, 0, 1)).format('YYYYMMDD'))
        // Config File
        if (!existsSync(resolve('config.json'))) {
            writeFileSync(resolve('config.json'), '{\n\"INFO_GROUP_NAME\": \"在这里填写消息控制群的名字\",\n"TARGET_CHATROOM_NAME": "在这里填写目标微信群的名字",\n"DAILYREPORT_FOLDER": "填写存放每日汇报的文件夹的绝对路径",\n"TODAY_COMMAND": [],\n"YESTERDAY_COMMAND": []\n}\n')
            console.error('小助手未配置，请修改配置文件后使用'); bot.stop(); process.exit(-1);
        } else {
            try {
                const config = JSON.parse(readFileSync(resolve('config.json'), 'utf8'))
                targetChatroomName = config.TARGET_CHATROOM_NAME; DAILYREPORT_FOLDER = config.DAILYREPORT_FOLDER; todayCommand = config.TODAY_COMMAND; yesterdayCommand = config.YESTERDAY_COMMAND; infoGroupName = config.INFO_GROUP_NAME;
            } catch(e) { console.error('配置文件 JSON 语法有误'); console.error(e); bot.stop(); process.exit(-1); }
        }
    }
}

function onError (e: Error) {console.error('Bot error:', e)}

function promptMe(succeeded?: boolean, fileName?: string, working_mode?: string, room?: Room) {
    let prompt: string = '你今天的作业已经提交了！'
    if (succeeded !== undefined) {
        if (!succeeded) {
            const appendString: string = working_mode === 'today' ? '' : '昨天的'
            prompt = `你${appendString}作业还没写，文件“${fileName}”未找到！`
        } else room?.topic().then(roomName => {prompt = `已将每日汇报发送入群：${roomName}`})
    }
    console.info(prompt); bot.Room.find({topic: infoGroupName}).then((room) => room?.say(prompt));
}

function sendFile(room: Room, working_mode: string = 'today') {
    const date: string = working_mode === 'today' ? dayjs().format('YYYYMMDD') : dayjs().subtract(1, 'days').format('YYYYMMDD')
    const fileName: string = DAILYREPORT_FOLDER + `${date}-每日汇报.pdf`
    if (working_mode === 'yesterday' || readFileSync(resolve('DateMarker.txt'), 'utf8') !== date) {
        if (existsSync(fileName)) {
            const fileBox = FileBox.fromFile(fileName)
            room.say(fileBox)
            promptMe(true, fileName, working_mode, room)
            if (working_mode === 'today') writeFileSync(resolve('DateMarker.txt'), dayjs().format('YYYYMMDD'))
        } else {
            promptMe(false, fileName, working_mode)
        }
    } else promptMe()
}

function submit(command: string) {
    let working_mode: string
    if (todayCommand.indexOf(command) != -1) working_mode = 'today';
    else if (yesterdayCommand.indexOf(command) != -1) working_mode = 'yesterday';
    else return
    bot.Room.find({topic: targetChatroomName}).then((room) => {
        if (room !== undefined) sendFile(room, working_mode); return;
    })
}

async function onMessage (msg: Message) {
    if (msg.listener()?.self()) {submit(msg.text()); return;}
    const room = msg.room()
    room?.topic().then(roomName => {
        if (roomName === targetChatroomName && msg.type() === bot.Message.Type.Attachment) {sendFile(room); return;}
        else if (roomName === infoGroupName) submit(msg.text())
    })
}
