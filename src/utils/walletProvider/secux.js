import {SecuxWebUSB} from '@secux/transport-webusb';
import {
  getPublicKey,
  solana_derivation_path,
  solana_secux_sign_bytes,
  solana_secux_sign_transaction,
  solana_secux_confirm_public_key,
} from './secux-core';
import { DERIVATION_PATH } from './localStorage';
import bs58 from 'bs58';

let TRANSPORT = null;

export class SecuxWalletProvider {
  constructor(args) {
    this.onDisconnect = (args && args.onDisconnect) || (() => {});
    this.derivationPath = args
      ? args.derivationPath
      : DERIVATION_PATH.bip44Change;
    this.account = args ? args.account : undefined;
    this.change = args ? args.change : undefined;
    this.solanaDerivationPath = solana_derivation_path(
      this.account,
      this.change,
      this.derivationPath,
    );
  }

  init = async () => {
    if (TRANSPORT === null) {
      TRANSPORT = await SecuxWebUSB.Create(
        () => console.log('connected'),
        async () => {
          console.log('disconnected')
        }
      )
      await TRANSPORT.Connect()
    }
    this.transport = TRANSPORT;
    this.pubKey = await getPublicKey(this.transport, this.solanaDerivationPath);
    return this;
  };

  get publicKey() {
    return this.pubKey;
  }

  signTransaction = async (transaction) => {
    const sig_bytes = await solana_secux_sign_transaction(
      this.transport,
      this.solanaDerivationPath,
      transaction,
    );
    transaction.addSignature(this.publicKey, sig_bytes);
    return transaction;
  };

  createSignature = async (message) => {
    const sig_bytes = await solana_secux_sign_bytes(
      this.transport,
      this.solanaDerivationPath,
      message,
    );
    return bs58.encode(sig_bytes);
  };

  confirmPublicKey = async () => {
    return await solana_secux_confirm_public_key(
      this.transport,
      this.solanaDerivationPath,
    );
  };
}
