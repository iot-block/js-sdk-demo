const iotchainSdk = require("iotchain-js-sdk");
const {node,chainId} = require('./config')
const iotchainApi = new iotchainSdk(node,chainId);

/**
 * 生成合约调用方法的交易数据
 * @param {String} contractAddress
 * @param {String} method
 * @param {object} params
 * @param {String} priKey
 * @param {String} codeStr
 * @param {String} nonce
 */
const generalHandleContractFunctionTxData = async function(
    contractAddress,
    abi,
    method,
    params,
    {gas,gasPrice,nonce},
    fromAddress
    ) {
    
    console.log('function params->'+params)

    try{
        const payload = iotchainApi.contract.encodeFunction(abi,method,params)
        if(!payload){
            return Promise.reject('contract func parse error')
        }

        if(!nonce && fromAddress){
            let account = await getAccount(fromAddress)
            nonce = account.nonce
        }

        if(!nonce){
            return Promise.reject('nonce is required')
        }

        const contractTx = {
            nonce: nonce,
            gasPrice: gasPrice || "1000000000000",
            gasLimit: gas || "6000000",
            receivingAddress: contractAddress,
            value: "0",
            payload: payload
        }

        return contractTx  
    }
    catch(err){

        console.log("parseContractCode err", err);
        return Promise.reject('parse contract error.'+err)
    }
    
}

/**
 * 获取最新区块号
 */
const getBestBlockNumber = async ()=>{

    try{
        let response = await iotchainApi.block.getBestBlockNumber()
        return Promise.resolve(response)
    }
    catch(err){
        return Promise.reject(err)
    }
}

/**
 * 获取区块事件
 * @param {*} blockNumber 区块号
 */
const getBlockByNumber = async (blockNumber)=>{

    try{
        let result = await iotchainApi.block.getBlockByNumber(blockNumber+'')

        let {header,body} = result
        let {transactionList} = body
        let contractList = []

        //获取header交易数量
        header.txAmount = transactionList.length
    
        //解析出交易中senderAddress和hash和gasUsed
        for (const idx in transactionList) {
    
            let transaction = transactionList[idx]
    
            let response = await getTxReceipt(transaction.hash)
            if(response){
                transaction.gasUsed = response.gasUsed,
                transaction.logsBloomFilter = response.logsBloomFilter
                transaction.logs = response.logs
                transaction.status = response.status
            }

            if(response.contractAddress){

                //获取合约信息
                let byteCode = await getContract(response.contractAddress)
                if(byteCode != '0x'){

                    contractList.push({
                        byteCode:byteCode,
                        address:response.contractAddress,
                        createHash:transaction.hash,
                        createBlock:blockNumber
                    })
                }
            }
        }

        let parseBlockData  = {
            header:header,
            body:{
                transactionList,
                contractList,
            }
        }

        return Promise.resolve(parseBlockData)
    }
    catch(err){
        return Promise.reject(err)
    }
}


const formatAddress = (address)=>{

    if(address.indexOf('ITC')==0){
        address = '0x' + address.substr(3)
    }

    return address
}

/**
 * 获取最新区块下的账号信息
 * @param {*} address 地址
 */
const getAccount = async (address)=>{

    address = formatAddress(address)

    try{
        let response = await iotchainApi.account.getAccount(address)
        return Promise.resolve(response)
    }
    catch(err){
        return Promise.reject(err)
    }
}

/**
 * 获取最新区块下的地址余额信息
 * @param {*} address 地址
 */
const getBalance = async (address)=>{

    try{
        let response = await iotchainApi.account.getBalance(address)
        return Promise.resolve(response)
    }
    catch(err){
        return Promise.reject(err)
    }
}
    
/**
 * 获取交易凭据
 * @param {*} hash 交易HASH
 */
const getTxReceipt = async (hash)=>{

    try{
        let response = await iotchainApi.transaction.getReceipt(hash)
        return Promise.resolve(response)
    }
    catch(err){
        return Promise.reject(err)
    }
}

/**
 * 获取交易
 * @param {*} hash 交易HASH
 */
const getTxDetail = async (hash)=>{

    try{
        let response = await iotchainApi.transaction.getTx(hash)
        return Promise.resolve(response)
    }
    catch(err){
        return Promise.reject(err)
    }
}

const getSuggestGasPrice = async ()=>{

    try{
        let response = await iotchainApi.contract.getGasPrice()
        return Promise.resolve(JSON.parse(response))
    }
    catch(err){
        return Promise.reject(err)
    }
}

/**
 * 发送交易
 * @param {object} txJson
 * @param {string} priKey
 */
const sendSignedTransaction = async function(txJson) {

    return new Promise(async (resolve,reject)=>{

        try{
            var sendRsp = await iotchainApi.transaction.sendTx(txJson);

            if(sendRsp){
                resolve(sendRsp)
            }
            else{
                reject('sendSignedTransaction failed')
            } 
        }
        catch(err){

            console.log('发送签名交易失败，'+err)
            reject(err)
        }
    })
}


/**
 * 发送交易
 * @param {*} txJson 交易信息
 * @param {*} priKey 私钥
 */
const sendTransaction = async (txJson, priKey) =>{
    
    const trx = iotchainApi.utils.signTx(txJson,priKey)
    return sendSignedTransaction(trx)
}

/**
 * 获取合约abi
 * @param {*} address  合约地址
 */
const getContract = async(address)=>{

    try{
        let response = await iotchainApi.account.getCode(address)
        return Promise.resolve(response.length > 0 ? response : '0x')
    }
    catch(err){
        return Promise.reject(err)
    }
}

/**
 * 部署合约
 * @param {*} privateKey 
 * @param {*} codebyte 
 * @param {*} params 
 * @param {*} chainId 
 * @param {*} hashCallBack 交易hash的反馈
 */
 const deployContrct = async (privateKey, codebyte,{abi,params}={}, {nonce,gas,gasPrice}={}) =>{

    //添加参数
    if(params){
        let extra = iotchainApi.contract.encodeConstruct(abi,params)
        codebyte = codebyte + extra   
    }

    if(!nonce){
        let fromAddress = iotchainApi.utils.privateKeyToAddress(privateKey)
        let account = await getAccount(fromAddress)
        nonce = account.nonce
    }

    const txJson = {
        nonce:nonce,
        gasPrice:gasPrice || "1000000000000",
        gasLimit: gas || "1500000",
        receivingAddress:"",
        value:"0",
        payload:codebyte
    }
    

    return sendTransaction(txJson,privateKey,null,hashCallBack)
 }

/**
 * 执行合约方法
 * @param {*} contractAddress 合约地址
 * @param {*} abi 合约ABI
 * @param {*} contractCode 合约代码
 * @param {*} funcName 方法名称
 * @param {*} funcParam 方法参数
 * @param {*} privateKey 私钥
 * @param {object} param {nonce,gas,gasPrice}
 */

 const handleContractFunction = async (contractAddress,abi,funcName,funcParam,privateKey,{nonce,gas,gasPrice} = {})=>{

    let fromAddress = iotchainApi.utils.privateKeyToAddress(privateKey)
    let contractTx = await  generalHandleContractFunctionTxData(contractAddress,abi,funcName,funcParam,{nonce,gas,gasPrice},fromAddress)
    return sendTransaction(contractTx,privateKey)
 }


 /**
  * 读取合约属性
  * @param {*} contractAddress 合约地址
  * @param {*} abi 合约名称
  * @param {*} funcName 合约方法
  * @param {*} funcParam 合约参数
  * @param {*} fromAddress 查询发起地址
  */
const callContractFunction = async (contractAddress,abi,funcName,funcParam,fromAddress)=>{
 
    try{
        let payload = iotchainApi.contract.encodeFunction(abi,funcName,funcParam)
        if(!payload){
            return Promise.reject('contract func parse error')
        }

        // call合约
        const callTx = {
            from: fromAddress == null ? "" : fromAddress,
            to: contractAddress,
            // gas: Option[BigInt],
            gasPrice: "0",
            value: "0",
            data: payload
        };

        const resp = await iotchainApi.contract.call(callTx);
        let result = iotchainApi.contract.decodeOutput(abi,funcName,resp)
    
        return Promise.resolve(result)
    }
    catch(err){

        return Promise.reject(err)
    }
    
}

const itcBalanceOf = async(address)=>{


}

/**
 * 发送ITG
 * @param {*} privateKey 
 * @param {*} receiveAddress 
 * @param {*} amount 
 * @param {*} hashCallBack 
 */
const transferITG = async (privateKey,receiveAddress,amount,{nonce,gas,gasPrice}={})=>{

    if(!nonce){
        let address = iotchainApi.utils.privateKeyToAddress(privateKey)
        let account = await getAccount(address)
        nonce = account.nonce
    }

    receiveAddress = formatAddress(receiveAddress)

    const txJson = {
        nonce:nonce,
        gasPrice:gasPrice || "1000000000000",
        gasLimit:gas || "42000",
        receivingAddress:receiveAddress,
        value:amount,
        payload:""
    }

    return sendTransaction(txJson,privateKey)
}

async function kec256(data){
    // let buffer = new Buffer("Transfer(address,address,uint256)")
    let buffer = new Buffer(data)
    return iotchainApi.utils.haser.kec256(buffer)
}

async function signTx(txJson,priKey){

    return iotchainApi.utils.signTx(txJson,priKey)
}

module.exports = {
    // ------ transaction ------
    getTxReceipt,
    getTxDetail,
    sendTransaction,
    sendSignedTransaction,
    generalHandleContractFunctionTxData,
    transferITG,
    getSuggestGasPrice,

    // ------ block ------

    getBestBlockNumber,
    getBlockByNumber,

    // ------ account ------
    getAccount,
    getBalance,

    // ------ contract ------
    deployContrct,
    getContract,
    handleContractFunction,
    callContractFunction,

    //utils
    kec256,
    signTx
}