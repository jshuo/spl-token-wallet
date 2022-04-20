import { PublicKey } from '@solana/web3.js';
import { DERIVATION_PATH } from './localStorage';
import { buildPathBuffer } from "@secux/utility";
import { EllipticCurve } from '@secux/transport/lib/ITransaction';
import { ITransport, StatusCode, TransportStatusError } from "@secux/transport";

const bs58 = require('bs58');

const INS_GET_PUBKEY = 0xc1;
const INS_GET_XPUBKEY = 0xc0;
const INS_SIGN_MESSAGE = 0xa3;

const P1_NON_CONFIRM = 0x00;
const P1_CONFIRM = 0x01;

const P2_EXTEND = 0x01;
const P2_MORE = 0x02;
const bip44Path = `m/44'/330'/0'`

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

  const pk = await transport.getPublickey(bip44Path, EllipticCurve.ED25519, false)
  console.log('solana_secux_get_pubkey:' + pk.toString('hex'))
  return pk
}

export async function solana_secux_sign_transaction(
  transport,
  derivation_path,
  transaction,
) {
  const msg_bytes = transaction.serializeMessage();
  return solana_secux_sign_bytes(transport, derivation_path, msg_bytes);
}

function buildTxBuffer(paths, txs, tp, chainId) {
  if (paths.length != txs.length) throw Error('Inconsistent length of paths and txs');

  const head = [], data = [];
  for (let i = 0; i < paths.length; i++) {
    const headerBuffer = Buffer.alloc(4);
    headerBuffer.writeUInt16LE(tp, 0);
    headerBuffer.writeUInt16LE(chainId, 2);

    const path = paths[i];
    const { pathNum, pathBuffer } = buildPathBuffer(path);
    // generic prepare can use 3 or 5 path level key to sign
    if (pathNum !== 5 && pathNum !== 3) throw Error('Invalid Path for Signing Transaction');
    //@ts-ignore
    head.push(Buffer.concat([Buffer.from([pathNum * 4 + 4]), headerBuffer, pathBuffer]));


    // fixed 2 byte length
    const preparedTxLenBuf = Buffer.alloc(2);
    preparedTxLenBuf.writeUInt16BE(txs[i].length, 0);
    //@ts-ignore
    data.push(Buffer.concat([preparedTxLenBuf, txs[i]]));
  }

  return Buffer.concat([Buffer.from([paths.length]), ...head, ...data]);
}

export async function solana_secux_sign_bytes(
  transport,
  derivation_path,
  msg_bytes,
) {
  const SIGNATURE_LENGTH = 65;
  var num_paths = Buffer.alloc(1);
  num_paths.writeUInt8(1);
  const payload = Buffer.concat([num_paths, derivation_path, msg_bytes]);
  console.log(payload.toString('hex'))
  const rsp = await transport.Send(0x70, INS_SIGN_MESSAGE, 1, 0,
    Buffer.concat([payload]));
  if (rsp.status !== StatusCode.SUCCESS) throw new TransportStatusError(rsp.status);
  if (rsp.dataLength !== SIGNATURE_LENGTH) throw Error('Invalid length Signature');
  console.log(rsp.data)
  return rsp.data
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
  // const from_pubkey_string = 'CDLTxfPMz3EGLx7XdBwnhs1SwUirr2pQzson3xFzJCjU'
  console.log(from_pubkey_string)

  return new PublicKey(from_pubkey_string);
}

export async function solana_secux_confirm_public_key(
  transport,
  derivation_path,
) {
  const pk = await transport.getPublickey(bip44Path, EllipticCurve.ED25519, false)
  console.log('solana_secux_confirm_public_key:' + pk.toString('hex'))
  return pk
}
