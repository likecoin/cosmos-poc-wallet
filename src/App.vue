<template>
  <div id="app">
    <v-app>
      <v-navigation-drawer
        v-model="isMenuOpened"
        app
        dark
        fixed
        temporary
      >
        <v-list>
          <v-list-tile>
            <v-list-tile-title class="title">
              Cosmos Wallet PoC
            </v-list-tile-title>
          </v-list-tile>
          <v-divider />
          <v-list-tile href="#validators" @click="isMenuOpened = false">
            <v-list-tile-action>
              <v-icon>dns</v-icon>
            </v-list-tile-action>
            <v-list-tile-title class="subheading">
              Validators
            </v-list-tile-title>
          </v-list-tile>
          <v-list-tile
            :disabled="!logined"
            @click="transferDialog = true;isMenuOpened = false"
          >
            <v-list-tile-action>
              <v-icon>swap_horiz</v-icon>
            </v-list-tile-action>
            <v-list-tile-title class="subheading">
              Transfer
            </v-list-tile-title>
          </v-list-tile>
          <v-list-tile
            :disabled="!logined"
            @click="faucet"
          >
            <v-list-tile-action>
              <v-icon>attach_money</v-icon>
            </v-list-tile-action>
            <v-list-tile-title class="subheading">
              Faucet
            </v-list-tile-title>
          </v-list-tile>
          <v-divider v-if="logined" />
          <v-list-tile
            v-if="logined"
            @click="logout"
          >
            <v-list-tile-action>
              <v-icon>exit_to_app</v-icon>
            </v-list-tile-action>
            <v-list-tile-title class="subheading">
              Logout
            </v-list-tile-title>
          </v-list-tile>
        </v-list>
      </v-navigation-drawer>
      <v-toolbar app>
        <v-toolbar-side-icon @click="isMenuOpened = !isMenuOpened" />
        <v-spacer />
        <v-flex
          v-if="logined"
          class="text-xs-right"
          xs10
          shrink
        >
          <v-layout
            column
            align-content-end
          >
            <v-flex xs12 class="text-truncate">
              <code class="elevation-0">{{ address }}</code>
            </v-flex>
            <v-flex xs12>{{ balance}} LIKE</v-flex>
          </v-layout>
        </v-flex>
        <v-btn
          v-else
          class="font-weight-black" color="primary"
          flat
          @click="loginDialog = true"
        >Login</v-btn>
      </v-toolbar>
      <v-content>
        <v-container fluid>
          <div>
            <h1
              id="validators"
              class="font-weight-thin display-1"
            >Validators / Delegation</h1>
            <v-card
              v-for="(v, i) in validators"
              :key="v.operator_address"
              class="my-4"
            >
              <v-card-title primary-title>
                <v-flex xs12 class="headline">{{ v.description.moniker }}</v-flex>
                <v-flex xs12 class="text-truncate grey--text">
                  <code class="elevation-0">{{ v.operator_address }}</code>
                </v-flex>
              </v-card-title>
              <v-card-text>{{ v.description.details }}</v-card-text>
              <v-divider light></v-divider>
              <v-card-actions>
                <v-btn
                  class="font-weight-bold"
                  :disabled="!logined"
                  flat
                  @click="delegateSelect(v, i)"
                >Delegate</v-btn>
              </v-card-actions>
            </v-card>
          </div>
        </v-container>
      </v-content>
      <v-dialog v-model="loginDialog">
        <v-card>
          <v-card-title class="headline">
            Please enter your mnemonic
          </v-card-title>
          <v-card-text>
            <v-textarea label="mnenomic" v-model="mnemonic" ref="mnemonic"></v-textarea>
          </v-card-text>
          <v-divider />
          <v-card-actions>
            <v-btn class="font-weight-black" color="primary" flat @click="commitMnemonic">Login</v-btn>
            <v-btn flat @click="loginDialog = false">Cancel</v-btn>
            <v-btn class="font-weight-black" flat @click="generateMnemonic">Create</v-btn>
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
          <v-divider />
          <v-card-actions>
            <v-btn flat @click="errorDialog = false">OK</v-btn>
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
          <v-divider />
          <v-card-actions>
            <v-btn flat @click="txDialog = false">OK</v-btn>
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
          <v-divider />
          <v-card-actions>
            <v-btn class="font-weight-black" color="primary" flat @click="transfer">Send</v-btn>
            <v-btn flat @click="transferDialog = false">Cancel</v-btn>
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
          <v-divider />
          <v-card-actions>
            <v-btn class="font-weight-black" color="primary" flat @click="delegate">Send</v-btn>
            <v-btn flat @click="delegateDialog = false">Cancel</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-app>
  </div>
</template>

<script>
import { getSeed, getNewWalletFromSeed, signWithPrivateKey } from "@lunie/cosmos-keys";
import Cosmos from "@lunie/cosmos-js";
import { CHAIN_ID, DENOM, ACCOUNT_INFO_FETCH_INTERVAL_MS } from "../config.js";
import axios from "axios";

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
      isMenuOpened: false,
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
    commitMnemonic() {
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
      this.isMenuOpened = false;
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
    async faucet() {
      this.isMenuOpened = false;
      try {
        const address = normalizeAddress(this.address);
        const res = await axios.post(`/faucet/${address}`);
        if (res.status === 200) {
          this.createTxDialog(res.data.txHash);
        } else {
          this.createErrorDialog(res.statusText);
        }
      } catch (err) {
        this.createErrorDialog(err);
      }
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
