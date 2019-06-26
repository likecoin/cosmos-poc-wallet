<template>
  <div id="app">
    <v-app>
      <v-toolbar fixed>
        <v-btn v-if="logined" @click="logout">Logout</v-btn>
        <v-btn v-else @click="loginDialog = true">Login</v-btn>
        <v-spacer></v-spacer>
        <div v-if="logined">
          {{ address }} ({{balance}} LIKE)
        </div>
        <v-spacer></v-spacer>
        <v-btn href="#validators">Validators</v-btn>
        <v-btn :disabled="!logined" @click="transferDialog = true">Transfer</v-btn>
      </v-toolbar>
      <v-dialog v-model="loginDialog">
        <v-card>
          <v-card-title class="headline">
            Please enter your mnemonic
          </v-card-title>
          <v-card-text>
            <v-textarea label="mnenomic" v-model="mnemonic" ref="mnemonic"></v-textarea>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="commitMnemonic">OK</v-btn>
            <v-btn @click="loginDialog = false">Cancel</v-btn>
            <v-btn @click="generateMnemonic">Create mnemonic for me</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="errorDialog">
        <v-card>
          <v-card-title class="headline">
            Error occured!
          </v-card-title>
          <v-card-text>
            Error message: {{ errorMessage }}
          </v-card-text>
          <v-card-actions>
            <v-btn @click="errorDialog = false">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="txDialog">
        <v-card>
          <v-card-title class="headline">
            Transaction sent.
          </v-card-title>
          <v-card-text>
            Transaction hash: {{ txHash }}
          </v-card-text>
          <v-card-actions>
            <v-btn @click="txDialog = false">OK</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="transferDialog">
        <v-card>
          <v-card-title class="headline">
            Transfer
          </v-card-title>
          <v-card-text>
            <v-text-field label="To address" v-model="transferTo"></v-text-field>
            <v-text-field label="Value" v-model="transferValue" :rules="[checkValue]" suffix="LIKE"></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="transfer">Send</v-btn>
            <v-btn @click="transferDialog = false">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog v-model="delegateDialog">
        <v-card>
          <v-card-title class="headline">
            Delegate to {{ this.validator.operator_address }}
          </v-card-title>
          <v-card-text>
            <v-text-field label="Value" v-model="delegateValue" :rules="[checkValue]" suffix="LIKE"></v-text-field>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="delegate">Send</v-btn>
            <v-btn @click="delegateDialog = false">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <div class="main">
        <div class="validators">
          <h1 class="anchor" id="validators">Validators / Delegation</h1>
          <v-card class="pa-2 ma-2" v-for="(v, i) in validators" v-bind:key="v.operator_address">
            <v-container grid-list-md text-xs-left>
              <v-layout row wrap>
                <v-flex xs12>
                  <v-card-title class="title font-weight-bold">{{ v.description.moniker }} ({{ v.operator_address }})</v-card-title>
                </v-flex>
                <v-flex xs12>
                  <v-card-text>{{ v.description.details }}</v-card-text>
                </v-flex>
                <v-btn @click="delegateSelect(v, i)" :disabled="!logined">Delegate</v-btn>
              </v-layout>
            </v-container>
          </v-card>
        </div>
      </div>
    </v-app>
  </div>
</template>

<script>
import { getSeed, getNewWalletFromSeed, signWithPrivateKey } from "@lunie/cosmos-keys";
import Cosmos from "@lunie/cosmos-js";
import { CHAIN_ID, DENOM, ACCOUNT_INFO_FETCH_INTERVAL_MS } from "../config.js";

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

export default {
  name: 'app',
  async created() {
    const validators = await api.get.validators();
    this.validators = validators;
    const loopAccountUpdate = async () => {
      await this.updateAccountInfo();
      setTimeout(loopAccountUpdate, ACCOUNT_INFO_FETCH_INTERVAL_MS);
    };
    setTimeout(loopAccountUpdate, ACCOUNT_INFO_FETCH_INTERVAL_MS);
  },
  data() {
    return {
      api: null,
      mnemonic: "",
      address: "",
      account: {},
      validators: [],
      loginDialog: false,
      transferDialog: false,
      delegateDialog: false,
      validator: {},
      delegateAmount: 0,
      txDialog: false,
      txHash: "",
      errorDialog: false,
      errorMessage: "",
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
      return Number.parseFloat(amount) / 1e9;
    },
    logined() {
      return !!this.address;
    }
  },
  methods: {
    async generateMnemonic() {
      this.mnemonic = getSeed();
      setImmediate(() => {
        this.$refs.mnemonic.focus();
        document.execCommand("selectAll");
        document.execCommand("copy");
        window.alert("Mnemonic generated and copied to clipboard, please backup");
      })
    },
    async updateAccountInfo() {
      if (this.address) {
        this.account = await api.get.account(this.address);
      }
    },
    async commitMnemonic() {
      const wallet = getNewWalletFromSeed(this.mnemonic.replace(/\n/g, ""));
      this.mnemonic = "";
      this.loginDialog = false;
      const publicKey = Buffer.from(wallet.publicKey, "hex");
      const privateKey = Buffer.from(wallet.privateKey, "hex");
      this.signer = (signMessage) => {
        const signature = signWithPrivateKey(signMessage, privateKey);
        return { signature, publicKey: publicKey };
      }
      this.address = wallet.cosmosAddress;
    },
    logout() {
      this.signer = null;
      this.address = "";
      this.account = {};
    },
    createErrorDialog(errorMessage) {
      this.errorMessage = errorMessage;
      this.errorDialog = true;
    },
    createTxDialog(txHash) {
      this.txHash = txHash;
      this.txDialog = true;
    },
    checkValue(value) {
      if (!value) {
        return "Please enter a value";
      }
      const strippedValue = value.replace(/^\s+/g, "").replace(/\s+$/, "");
      if (strippedValue.length === 0) {
        return "Please enter a value";
      }
      if (!/^[0-9]+$/.test(strippedValue)) {
        return "Invalid number";
      }
      const numberValue = Number.parseInt(strippedValue);
      if (this.balance < numberValue) {
        return "Not enough balance";
      }
      return true;
    },
    async sendTx(msgCallPromise) {
      try {
        const { simulate, send } = await msgCallPromise;
        const gas = (await simulate({})).toString();
        const { hash, included } = await send({ gas }, this.signer);
        console.log(hash);
        this.createTxDialog(hash);
        await included();
        console.log("Included");
      } catch (err) {
        this.txDialog = false;
        this.createErrorDialog(err);
      }
    },
    delegateSelect(validator) {
      this.validator = validator;
      this.delegateDialog = true;
    },
    async delegate() {
      this.delegateDialog = false;
      const from = normalizeAddress(this.address);
      const amount = likeToNanolike(this.delegateValue);
      const msgPromise = api.MsgDelegate(from, {
        validator_address: this.validator.operator_address,
        amount,
        denom: DENOM,
      });
      this.sendTx(msgPromise);
    },
    async transfer() {
      this.transferDialog = false;
      const from = normalizeAddress(this.address);
      const toAddress = normalizeAddress(this.transferTo);
      const value = this.transferValue;
      const amount = likeToAmount(value);
      const msgPromise = api.MsgSend(from, { toAddress, amounts: [amount] });
      this.sendTx(msgPromise);
    },
    governance(proposal) {
      console.log(proposal);
    },
  },
}
</script>

<style>
.anchor {
  padding-top: 5rem;
  padding-left: 2rem;
}

.validator-card {
  margin: 1rem;
  padding: 1rem;
}
</style>
