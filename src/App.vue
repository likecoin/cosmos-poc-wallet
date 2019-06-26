<template>
  <div id="app">
    <v-app>
      <v-toolbar fixed>
        <v-btn v-if="logined" @click="logout">Logout</v-btn>
        <v-btn v-else @click="loginDialog = true">Login</v-btn>
        <v-dialog v-model="loginDialog">
          <v-card>
            <v-card-title class="headline">
              Please enter your mnemonic
            </v-card-title>
            <v-card-text>
              <v-text-field label="mnenomic" v-model="mnemonic"></v-text-field>
            </v-card-text>
            <v-card-actions>
              <v-btn @click="commitMnemonic">OK</v-btn>
              <v-btn @click="loginDialog = false">Cancel</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-spacer></v-spacer>
        <div v-if="logined">
          {{ address }} ({{balance}})
        </div>
        <v-spacer></v-spacer>
        <v-btn href="#validators">Validators</v-btn>
        <v-btn href="#transfer">Transfer</v-btn>
      </v-toolbar>
        <!-- <div>
          Don't have mnemonic? Click <button @click="generateMnemonic">here</button> to generate one in the box above
        </div> -->
      <div class="main">
        <div class="validators">
          <h1 class="anchor" id="validators">Validators / Delegation</h1>
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
          <h1 class="anchor" id="transfer">Transfer</h1>
          <div>To: <input ref="transferTo"/></div>
          <div>Value: <input ref="transferValue"/></div>
          <button @click="transfer()" :disabled="!logined">Transfer</button>
        </div>
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
      <div>
        space
      </div>
    </v-app>
  </div>
</template>

<script>
import { getSeed, getNewWalletFromSeed, signWithPrivateKey } from "@lunie/cosmos-keys";
import Cosmos from "@lunie/cosmos-js";
import { CHAIN_ID, DENOM } from "../config.js";

const api = new Cosmos("/api", CHAIN_ID)

function likeToNanolike(value) {
  return Number.parseInt(value).toString() + "000000000";
}

function likeToAmount(value) {
  return { denom: DENOM, amount: likeToNanolike(value) };
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
      loginDialog: false,
    };
  },
  computed: {
    balance() {
      if (!this.address) {
        return "N/A";
      }
      let amount = 0;
      if (this.account && this.account.coins) {
        amount = this.account.coins.filter((coin) => coin.denom === DENOM)[0].amount;
      }
      return Number.parseFloat(amount) / 1e9 + " LIKE";
    },
    logined() {
      return !!this.address;
    }
  },
  methods: {
    async generateMnemonic() {
      this.mnemonic = getSeed();
      setImmediate(() => {
        window.alert("Mnemonic generated, please backup");
      })
    },
    async commitMnemonic() {
      const wallet = getNewWalletFromSeed(this.mnemonic);
      this.mnemonic = "";
      this.loginDialog = false;
      const publicKey = Buffer.from(wallet.publicKey, "hex");
      const privateKey = Buffer.from(wallet.privateKey, "hex");
      this.signer = (signMessage) => {
        const signature = signWithPrivateKey(signMessage, privateKey);
        return { signature, publicKey: publicKey };
      }
      this.address = wallet.cosmosAddress;
      this.account = await api.get.account(wallet.cosmosAddress);
    },
    logout() {
      this.signer = null;
      this.address = "";
      this.account = {};
    },
    async delegate(validator, i) {
      const from = normalizeAddress(this.address);
      const amount = likeToNanolike(this.$refs.delegateAmount[i].value);
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
/* #app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
} */

/* .validator-cell {
  border-style: solid;
}

.menu-link {
  display: inline-block;
  margin: 10px;
} */

.anchor {
  padding-top: 65px;
}
</style>
