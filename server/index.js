const path = require("path");
const express = require("express");
const proxy = require('express-http-proxy');
const cors = require("cors");
const axios = require("axios");
const crypto = require("crypto");
const bip32 = require("bip32");
const bip39 = require("bip39");
const secp256k1 = require("secp256k1");
const bech32 = require("bech32");
const jsonStringify = require("fast-json-stable-stringify");

const { LCD_ENDPOINT, PORT, DENOM, CHAIN_ID, FAUCET_AMOUNT } = require("../config.js");
const { mnemonic } = require("../faucet.json");

const KEY_PATH = "m/44'/118'/0'/0/0";

const api = axios.create({
    baseURL: `http://${LCD_ENDPOINT}`,
    headers: {
        "Content-Type": "application/json",
    },
});

const app = express();
app.use(cors());
app.use("/api", proxy(LCD_ENDPOINT));
app.use(express.static(path.join(__dirname, "..", "dist")));

function createSigner(mnemonic) {
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const masterKey = bip32.fromSeed(seed);
    const cosmosHD = masterKey.derivePath(KEY_PATH);
    const privateKey = cosmosHD.privateKey
    const publicKey = secp256k1.publicKeyCreate(privateKey, true)
    const sha256 = crypto.createHash("sha256");
    const ripemd = crypto.createHash("ripemd160");
    sha256.update(publicKey);
    ripemd.update(sha256.digest());
    const rawAddr = ripemd.digest();
    const cosmosAddress = bech32.encode("cosmos", bech32.toWords(rawAddr));
    const signer = (msg) => {
        const msgSha256 = crypto.createHash("sha256");
        msgSha256.update(Buffer.from(msg, "utf-8"));
        const msgHash = msgSha256.digest();
        const { signature } = secp256k1.sign(msgHash, privateKey);
        return { signature, publicKey };
    }
    return { cosmosAddress, signer };
}

const { cosmosAddress, signer } = createSigner(mnemonic);

async function getAccountInfo(address) {
    const res = await api.get(`/auth/accounts/${address}`);
    if (res.status !== 200) {
        throw new Error(`Response failed with status ${res.status}: ${res.statusText}`);
    }
    return res.data.value;
}

async function sendFaucet(toAddress) {
    const msgSend = {
        type: "cosmos-sdk/MsgSend",
        value: {
            from_address: cosmosAddress,
            to_address: toAddress,
            amount: [{ "denom": DENOM, "amount": FAUCET_AMOUNT.toString() }],
        },
    };
    const stdTx = {
        msg: [msgSend],
        fee: {
            amount: null,
            gas: "200000",
        },
        memo: "",
    };
    const { sequence, account_number } = await getAccountInfo(cosmosAddress);
    const signMessage = jsonStringify({
        fee: {
            amount: [],
            gas: "200000",
        },
        msgs: stdTx.msg,
        chain_id: CHAIN_ID,
        account_number,
        sequence,
        memo: stdTx.memo,
    });
    const { signature, publicKey } = signer(signMessage);
    stdTx.signatures = [{
        signature: signature.toString("base64"),
        account_number,
        sequence,
        pub_key: {
            type: `tendermint/PubKeySecp256k1`,
            value: publicKey.toString("base64"),
        },
    }];
    const res = await api.post("/txs", {
        tx: stdTx,
        mode: "sync",
    });
    if (res.data.code) {
        throw new Error(res.data.raw_log);
    }
    return res.data.txhash;
}

app.post("/faucet/:address", async (req, res) => {
    try {
        const txHash = await sendFaucet(req.params.address);
        console.log(txHash);
        res.status(200).send({txHash}).end();
    } catch (error) {
        console.error(error);
        res.status(400).send({error}).end();
    }
})

app.listen(PORT);