<template>
  <div id="app">
    <div class="top-bar">
      <div>
        <span class="menu-link"><a href="#validators">Validators</a></span>
        <span class="menu-link"><a href="#transfer">Transfer</a></span>
      </div>
      <div>
        Mnemonic: <input v-model="mnemonic" />
        <button @click="commitMnemonic">Submit</button>
      </div>
      <div>
        Your address: {{ address }}
      </div>
      <div>
        Your balance: {{ balance }}
      </div>
    </div>
    <div class="main">
      <div class="validators">
        <h1 id="validators">Validators / Delegation</h1>
        <div class="validator-cell" v-for="(v, i) in validators" v-bind:key="v.operator_address">
          <h2>{{ v.description.moniker }}</h2>
          <div>
            Address: {{ v.operator_address }}
          </div>
          <div>
            Description: {{ v.description.details }}
          </div>
          Delegate amount: <input ref="delegateAmount" />
          <button @click="delegate(v, i)" :disabled="!logined">Delegate</button>
        </div>
      </div>
      <div class="transfer">
        <h1 id="transfer">Transfer</h1>
        <div>To: <input ref="transferTo"/></div>
        <div>Value: <input ref="transferValue"/></div>
        <button @click="transfer()" :disabled="!logined">Transfer</button>
      </div>
    </div>
  </div>
</template>

<script>
import { getNewWalletFromSeed, signWithPrivateKey } from "@lunie/cosmos-keys";
import Cosmos from "@lunie/cosmos-js";
import { CHAIN_ID, DENOM } from "../config.js";

const api = new Cosmos("/api", CHAIN_ID)

function likeToAmount(value) {
    return { denom: DENOM, amount: Number.parseInt(value).toString() + "000000000" };
}

function normalizeAddress(address) {
  return address.replace(/\s/g, "");
}

async function handleMsg(msgCallPromise, signer) {
  const { simulate, send } = await msgCallPromise;
  const gas = (await simulate({})).toString();
  const { hash, included } = await send({ gas }, signer);
  console.log(hash);
  await included();
  console.log("Included");
}

export default {
  name: 'app',
  async created() {
    const validators = await api.get.validators();
    this.validators = validators;
  },
  data() {
    return {
      api: null,
      mnemonic: "",
      address: "",
      account: {},
      validators: [],
    };
  },
  computed: {
    balance() {
      if (!this.account || !this.account.coins) {
        return "";
      }
      const { amount } = this.account.coins.filter((coin) => coin.denom === DENOM)[0];
      return Number.parseFloat(amount) / 1e9 + " LIKE";
    },
    logined() {
      return !!this.address;
    }
  },
  methods: {
    async commitMnemonic() {
      const wallet = getNewWalletFromSeed(this.mnemonic);
      this.mnemonic = "";
      const publicKey = Buffer.from(wallet.publicKey, "hex");
      const privateKey = Buffer.from(wallet.privateKey, "hex");
      this.signer = (signMessage) => {
        const signature = signWithPrivateKey(signMessage, privateKey);
        return { signature, publicKey: publicKey };
      }
      this.address = wallet.cosmosAddress;
      this.account = await api.get.account(wallet.cosmosAddress);
    },
    async delegate(validator, i) {
      const from = normalizeAddress(this.address);
      const amount = this.$refs.delegateAmount[i].value;
      const msgPromise = api.MsgDelegate(from, {
        validator_address: validator.operator_address,
        amount,
        denom: DENOM,
      });
      await handleMsg(msgPromise, this.signer);
    },
    async transfer() {
      const from = normalizeAddress(this.address);
      const toAddress = normalizeAddress(this.$refs.transferTo.value);
      const value = this.$refs.transferValue.value;
      const amount = likeToAmount(value);
      const msgPromise = api.MsgSend(from, { toAddress, amounts: [amount] });
      await handleMsg(msgPromise, this.signer);
    },
    governance(proposal) {
      console.log(proposal);
    },
  },
}
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}

.validator-cell {
  border-style: solid;
}

.menu-link {
  display: inline-block;
  margin: 10px;
}
</style>
