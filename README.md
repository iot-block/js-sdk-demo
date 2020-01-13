# iotchain-js-sdk-demo

#### IotChain For Main Network
- explorer:https://iotchain.io/explorer
- node:http://139.196.160.93:30315
- chainId:10
- itcContractAddress:0x2ca70e7d0c396c36e8b9d206d988607a013483cf

#### IotChain For Developer Network
- explorer:https://iotchain.io/developerexplorer
- node:http://139.224.255.21:30315
- chainId:100
- itcContractAddress:0x866f68430344fb1a0b0271c588abae123a8c31dd

## demo.js
-   ITC（balance、transfer）
-   ITG（balance、transfer）
-   Transaction monitoring 
-   Get block content（Header，Body(transactions)）
-   Sign transaction & Send signed transaction

## ITG
1、Init SDK
```
  /sdkManager/config.js

  module.exports = {
    itcContractAddress:'0x866f68430344fb1a0b0271c588abae123a8c31dd',     
    node:'http://139.224.255.21:30315',                                  
    chainId:100                                                          
  }
```
2、Balance Of ITG
```
    const sdkManager = require('./sdkManager/manager')

    let originalBalance = await sdkManager.getBalance('0x36BF8fFXXXXXXXXXXXXXXXXXXXXXD2F7EF56769')
    console.log('itg balance'+originalBalance)
```
3、Transfer ITG
```
    const sdkManager = require('./sdkManager/manager')

    let privateKey = '0x43034A1C0FCDFD7389E02FC45A7A83208AC8D66C80D5A877D44641D1D7CAC64C'
    let toAddress = '0xcecede5A20645EAc6ca2032eeEb1063572D63c29'  //接收地址
    
    let hash = await sdkManager.transferITG(privateKey,toAddress,"100000000000000000000",{
        gas:'42000',
        gasPrice:'1000000000000'
    })
```

## ITC
1、Init SDK
```
  const itcHandle = require('./sdkManager/itcHandle')
```
2、Balance Of ITC
```
    let fromAddress = '0x36BF8fF5aC929Fa02C62D3366d05fD2F7EF56769'
    let balance = await itcHandle.itcBalanceOf(fromAddress)
    console.log(`${fromAddress}的余额为：${balance}`)
```
3、Transfer ITC
```
    let privateKey = '0x43034A1C0FCDFD7389E02FC45A7A83208AC8D66C80D5A877D44641D1D7CAC64C'
    let toAddress = '0xcecede5A20645EAc6ca2032eeEb1063572D63c29'  
    
    let hash = await itcHandle.transferITC(privateKey,toAddress,amountWei,{
        gasPrice:'1000000000000',
        gas:'1100000'
    })
```
## Sign Transaction
```
    const sdkManager = require('./sdkManager/manager')

    const txRow = {
        nonce: "35", //nonce 
        gasPrice: "1",
        gasLimit: "21000",
        receivingAddress: "0xa47920f4B678A478875143525e6E674b2012bf14",
        value: "111111111111111111111",
        payload: ""
    };
    
    const stx = sdkManager.signTx( 
        txRow,
        "0x43034A1C0FCDFD7XXXXXXXXXXXXXXXXXXXXXXXXXXX77D44641D1D7CAC64C",
    );

    const res = await sdkManager.sendSignedTransaction(stx);
    console.log('send tx hash->'+res)
```
