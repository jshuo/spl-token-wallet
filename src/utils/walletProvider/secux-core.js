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
const bip44Path = `m/44'/501'/0'`
const bip44Root = `m/44'/501'/`

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
    return bip44Path;
  } else if (derivationPath === DERIVATION_PATH.bip44) {
    return bip44Root`${useAccount}`;
  } else if (derivationPath === DERIVATION_PATH.bip44Change) {
    return bip44Root`${useAccount}/${useChange}`;
  } else {
    throw new Error('Invalid derivation path');
  }
}

async function solana_secux_get_pubkey(transport, derivation_path) {

  const pk = await transport.getPublickey(derivation_path, EllipticCurve.ED25519, false)
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


export async function solana_secux_sign_bytes(
  transport,
  derivation_path,
  msg_bytes,
) {
  const head = [], data = [];
  const SIGNATURE_LENGTH = 65;
  var num_paths = Buffer.alloc(1);
  num_paths.writeUInt8(1);
  const headerBuffer = Buffer.alloc(4);
  const { pathNum, pathBuffer } = buildPathBuffer(bip44Path);
  head.push(Buffer.concat([Buffer.from([pathNum * 4 + 4]), headerBuffer, pathBuffer]));
  // fixed 2 byte length
  const preparedTxLenBuf = Buffer.alloc(2);
  preparedTxLenBuf.writeUInt16BE(msg_bytes.length, 0);
  //@ts-ignore
  data.push(Buffer.concat([preparedTxLenBuf, msg_bytes]));
  const payload = Buffer.concat([num_paths, ...head, ...data]);
  console.log(payload.toString('hex'))
  const rsp = await transport.Send(0x70, 0xa3, 0, 1,
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
  const pk = await transport.getPublickey(derivation_path, EllipticCurve.ED25519, false)
  console.log('solana_secux_confirm_public_key:' + pk.toString('hex'))
  return pk
}
