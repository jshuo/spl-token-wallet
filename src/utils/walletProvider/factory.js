import { LocalStorageWalletProvider } from './localStorage';
import { LedgerWalletProvider } from './ledger';
import { SecuxWalletProvider } from './secux';

export class WalletProviderFactory {
  static getProvider(type, args) {
    if (type === 'local') {
      return new LocalStorageWalletProvider(args);
    }

    if (type === 'ledger') {
      return new SecuxWalletProvider(args);
    }
    
  }
}
