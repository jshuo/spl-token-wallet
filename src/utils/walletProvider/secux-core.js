import { PublicKey } from '@solana/web3.js';
import { DERIVATION_PATH } from './localStorage';
const bs58 = require('bs58');

const INS_GET_PUBKEY = 0xc1;
const INS_GET_XPUBKEY = 0xc0;
const INS_SIGN_MESSAGE = 0xa3;

const P1_NON_CONFIRM = 0x00;
const P1_CONFIRM = 0x01;

const P2_EXTEND = 0x01;
const P2_MORE = 0x02;

const BIP32_HARDENED_BIT = (1 << 31) >>> 0;
function _harden(n) {
  return (n | BIP32_HARDENED_BIT) >>> 0;
}

export function solana_derivation_path(account, change, derivationPath) {
  let useAccount = account ? account : 0;
  let useChange = change ? change : 0;
  derivationPath = derivationPath
    ? derivationPath
    : DERIVATION_PATH.bip44Change;
    solana_derivation_path
  if (derivationPath === DERIVATION_PATH.bip44Root) {
    const length = 2;
    const derivation_path = Buffer.alloc(1 + length * 4);
    let offset = 0;
    offset = derivation_path.writeUInt8(length, offset);
    offset = derivation_path.writeUInt32BE(_harden(44), offset); // Using BIP44
    derivation_path.writeUInt32BE(_harden(501), offset); // Solana's BIP44 path
    return derivation_path;
  } else if (derivationPath === DERIVATION_PATH.bip44) {
    const length = 3;
    const derivation_path = Buffer.alloc(1 + length * 4);
    let offset = 0;
    offset = derivation_path.writeUInt8(length, offset);
    offset = derivation_path.writeUInt32BE(_harden(44), offset); // Using BIP44
    offset = derivation_path.writeUInt32BE(_harden(501), offset); // Solana's BIP44 path
    derivation_path.writeUInt32BE(_harden(useAccount), offset);
    return derivation_path;
  } else if (derivationPath === DERIVATION_PATH.bip44Change) {
    const length = 4;
    const derivation_path = Buffer.alloc(1 + length * 4);
    let offset = 0;
    offset = derivation_path.writeUInt8(length, offset);
    offset = derivation_path.writeUInt32BE(_harden(44), offset); // Using BIP44
    offset = derivation_path.writeUInt32BE(_harden(501), offset); // Solana's BIP44 path
    offset = derivation_path.writeUInt32BE(_harden(useAccount), offset);
    derivation_path.writeUInt32BE(_harden(useChange), offset);
    return derivation_path;
  } else {
    throw new Error('Invalid derivation path');
  }
}

async function solana_secux_get_pubkey(transport, derivation_path) {

  const rsp = await transport.Send(0x80, INS_GET_PUBKEY, 0, 0,
    Buffer.concat([derivation_path]));
}

export async function solana_secux_sign_transaction(
  transport,
  derivation_path,
  transaction,
) {
  const msg_bytes = transaction.serializeMessage();
  return solana_secux_sign_bytes(transport, derivation_path, msg_bytes);
}

export async function solana_secux_sign_bytes(
  transport,
  derivation_path,
  msg_bytes,
) {
  var num_paths = Buffer.alloc(1);
  num_paths.writeUInt8(1);
  const payload = Buffer.concat([num_paths, derivation_path, msg_bytes]);

  const rsp = await transport.Send(0x70, INS_SIGN_MESSAGE, 1, 0,
    Buffer.concat([payload]));
}

export async function getPublicKey(transport, path) {
  let from_derivation_path;
  if (path) {
    from_derivation_path = path;
  } else {
    from_derivation_path = solana_derivation_path();
  }
  const from_pubkey_bytes = await solana_secux_get_pubkey(
    transport,
    from_derivation_path,
  );
  const from_pubkey_string = bs58.encode(from_pubkey_bytes);

  return new PublicKey(from_pubkey_string);
}

export async function solana_secux_confirm_public_key(
  transport,
  derivation_path,
) {
  return await solana_send(
    transport,
    INS_GET_PUBKEY,
    P1_CONFIRM,
    derivation_path,
  );
}
