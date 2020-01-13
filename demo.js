const sdkManager = require('./sdkManager/manager')
const trxListen = require('./sdkManager/trxListen')
const itcHandle = require('./sdkManager/itcHandle')
const BigNumber = require('bignumber.js')
BigNumber.config({ FORMAT: {
    groupSeparator:''
} })

async function itcTokenHandle(){

    let privateKey = '0x43034A1C0FCDFD7389E02FC45A7A83208AC8D66C80D5A877D44641D1D7CAC64C'
    let fromAddress = '0x36BF8fF5aC929Fa02C62D3366d05fD2F7EF56769'
    let toAddress = '0xcda55abaab1929db6e9655fae52782107d0cec26'  
    let amountWei = '8000000000000000000' 

    let hash = await itcHandle.transferITC(privateKey,toAddress,amountWei,{
            gasPrice:'1000000000000',
            gas:'1100000'
        })
    trxListen.listenTrx(hash,async (hashId,receipt)=>{

        if(receipt.status){
            let balance =  await itcHandle.itcBalanceOf(fromAddress)
            console.log(`itc balance of ${toAddress}：${balance}`)
        }
        else{
            console.log('tx err')
        }
    })
}

async function itgHandle(){

    let privateKey = '0x43034A1C0FCDFD7389E02FC45A7A83208AC8D66C80D5A877D44641D1D7CAC64C'
    let toAddress = '0xcda55abaab1929db6e9655fae52782107d0cec26'  

    let originalBalance = await sdkManager.getBalance('0x36BF8fF5aC929Fa02C62D3366d05fD2F7EF56769')
    console.log('befor itg balance'+originalBalance)

    let hash = await sdkManager.transferITG(privateKey,toAddress,"123",{
        gas:'42000',
        gasPrice:'1000000000000'
    })

    trxListen.listenTrx(hash,async (hashId,receipt)=>{

        if(receipt && receipt.status){
            let itgBalance = await sdkManager.getBalance(toAddress)
            console.log('itg balance'+itgBalance)
        }
        else{
            console.log('tx err')
        }
    })
}

const TRANSGER_EVENT_HASH = 'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

async function getBlockTrxInfo(){

    sdkManager.getBlockByNumber(93717).then(result=>{

        console.log('block detail'+JSON.stringify(result,null,2))

        if(result.body.transactionList.length == 0){
            return
        }

        for (const trxIdx in result.body.transactionList) {
            
            let transaction = result.body.transactionList[trxIdx]

            let itcTokenAddress = '0x9f640d67c217a62835017b192a378e61f3f48c68'

            for (const idx in transaction.logs) {
            
                let existLog = transaction.logs[idx]
        
                //check itc tx 
                if(existLog.loggerAddress.toLocaleLowerCase() == itcTokenAddress.toLocaleLowerCase() && existLog.logTopics[0] == TRANSGER_EVENT_HASH){
                            
                    let value = pareseAddressParam(existLog.data)
        
                    let big =new BigNumber(value)
        
                    let itcTrx = {
                        senderAddress:pareseAddressParam(existLog.logTopics[1]),
                        receivingAddress:pareseAddressParam(existLog.logTopics[2]),
                        value:big.toString(10),
                        blockNumber:transaction.blockNumber,
                        hash:transaction.hash,
                        gasPrice:transaction.gasPrice,
                        gasLimit:transaction.gasLimit,
                        gasUsed:transaction.gasUsed,
                    }
        
                    console.log('itc tx detail：'+JSON.stringify(itcTrx,null,2))
                }
            }
        }
    }).catch(err=>{
        console.log('getBlockByNumber err '+err)
    })
}



function pareseAddressParam(param){

    return '0x'+ param.substr(param.length-40,40)
}

function getSuggestGasPrice(){

    sdkManager.getSuggestGasPrice().then(gasPrice=>{
        console.log('price:'+JSON.stringify(gasPrice,null,2))
    }).catch(err=>{

    })
}

async function signTrxAndSend(){

    const txRow = {
        nonce: "35", 
        gasPrice: "1",
        gasLimit: "21000",
        receivingAddress: "0xa47920f4B678A478875143525e6E674b2012bf14",
        value: "10000000000000000000",
        payload: ""
    };
    
    const stx = await sdkManager.signTx( 
        txRow,
        "0x43034A1C0FCDFD7389E02FC45A7A83208AC8D66C80D5A877D44641D1D7CAC64C",
    );

    const res = await sdkManager.sendSignedTransaction(stx);
    console.log('send tx hash->'+res)
}


//获取gas
// getSuggestGasPrice()

//测试合约
// itcTokenHandle()

//测试转账
// itgHandle()

//获取区块以及区块内的交易信息
// getBlockTrxInfo()

//离线签名
signTrxAndSend()

