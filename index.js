const { SerialPort } = require('serialport')
const { RegexParser } = require('@serialport/parser-regex')

const DEBUG_LOGGING_IS_ENABLED = false;

//TRIANGLE
const exs82wPath = '/dev/tty.usbserial-DT03MZN0'
//SQUARE
//const exs82wPath = '/dev/tty.usbserial-DT03MBYZ'


const exs82w = new SerialPort({path : exs82wPath,baudRate: 115200,rts : true})
//preferable regex, but does not work = /AT[\s\S]*?\r\nOK\r\n/
const ATcommandResponseOKregex = exs82w.pipe(new RegexParser({  regex: /\r\nOK\r\n/  }))



//DEBUG
if(DEBUG_LOGGING_IS_ENABLED){
    exs82w.on('data', function (data) {
        console.log(data)
    })
    
    exs82w.on('data', function (data) {
        console.log('RAW STRING :: ' + data.toString())
    })
}
//DEBUG


async function fireAT(command,port,timeout){
    await wait(100)

    const commandWithCR = command + '\r'
    console.log('TX ' + commandWithCR)
    writeToEXS82W(commandWithCR ,port)
    
    return  promise = new Promise((resolve, reject) => {
        ATcommandResponseOKregex.once('data',function (data) {
            let removedATcommand = data.substring(commandWithCR.length)
            let cleanSpecialCharsFromResponse = removedATcommand.replace(/(\r\n|\n|\r)/gm, "")
            resolve(cleanSpecialCharsFromResponse.toString());
        })
        setTimeout(()=> { reject('no response from module')},timeout);
    });
}

async function controlModem(commandString){
    console.log('===START COMMAND=======================')
    try {
        let response = await fireAT(commandString,exs82w,AT_RESPONSE_TIMEOUT);
        console.log('RX ' + response);
        console.log('===END COMMAND=========================')
        return response;
    } catch(err) {
        console.log('error ' + err);
        console.log('===END COMMAND=========================')
        return err;
    }
}


const AT_RESPONSE_TIMEOUT = 2000;
sequence();

async function sequence(){
    //modem related
    await controlModem('ATI1')
    //await controlModem('ATI8')        not supported??, resolves always in timeout
    //await controlModem('ATI176')      net supported
    await controlModem('AT+CGSN')

    //simcard related
    await controlModem('AT+CIMI')
    await controlModem('AT+CPIN?')
     
    //await controlModem('AT+COPN')     return unsoliccited messages,deal with it
    //await controlModem('AT+CPOL=?')

    // console.log('network status (page 149 datasheet)')
    await controlModem('AT+CREG=2')

    await controlModem('AT+CGDCONT=1,"IP", "iot.1nce.net"')
 
    //await controlModem('AT+COPS=0')            //Does not connect after 30min
    await controlModem('AT+COPS=1,2,20404')      //FORCE VODAFONE, does connect
    //await controlModem('AT+COPS=1,2,20404,9')  //FORCE VODAFONE,nb-iot, will never get connection
    //await controlModem('AT+COPS=1,2,20404,3')  //FORCE VODAFONE,2g ,will never get connection
    //await controlModem('AT+COPS=1,2,20404,7')  //FORCE VODAFONE,cat m, not tested, but expect to get a connection
   

    while(await controlModem('AT+CEREG?') != '+CEREG: 0,5'){
        await controlModem('AT+CEREG?')
        await wait(2000)
        await controlModem('AT+CREG?')
        await wait(2000)
        await controlModem('AT+CSQ')
        await wait(2000)
    }

    await controlModem('AT+CGPADDR=1') 
}




















async function writeToEXS82W(command,port){
    port.write(command, function(err) {
        if (err) {
            return console.log('Error on write: ', err.message)
        }
    })

}


async function wait(forThisAmountOfms) {
    return new Promise(resolve => setTimeout(resolve,forThisAmountOfms));
}


 