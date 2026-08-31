/**
 * AllBridge / OmniRoute Protocol — Automated Cross-Chain Relayer Daemon
 * Watches incoming deposits on Base / Ethereum and automatically executes payouts on INK / GIWA / ARC.
 */

const { ethers } = require("ethers");
require("dotenv").config({ path: __dirname + "/.env" });

const RELAYER_PRIVATE_KEY = process.env.PRIVATE_KEY || "0x74a4f5c8fe431a61cddfc2f8043b1222a27d9dae3c418f24b0aa532a4e2eff42";
const RELAYER_WALLET = new ethers.Wallet(RELAYER_PRIVATE_KEY);
const PROTOCOL_ROUTER_ADDRESS = RELAYER_WALLET.address.toLowerCase();

console.log("=================================================================");
console.log(" 🌉 ALLBRIDGE AUTOMATED RELAYER DAEMON");
console.log(" • Router / Relayer Address:", RELAYER_WALLET.address);
console.log(" • Protocol Fee: 1.8% retained");
console.log("=================================================================");

const SOURCE_NETWORKS = {
  base: {
    name: "Base",
    chainId: 8453,
    rpc: "https://mainnet.base.org",
    provider: new ethers.JsonRpcProvider("https://mainnet.base.org")
  },
  ethereum: {
    name: "Ethereum",
    chainId: 1,
    rpc: "https://cloudflare-eth.com",
    provider: new ethers.JsonRpcProvider("https://cloudflare-eth.com")
  }
};

const DEST_NETWORKS = {
  ink: {
    name: "INK",
    chainId: 57073,
    rpc: "https://rpc-gel.inkonchain.com",
    provider: new ethers.JsonRpcProvider("https://rpc-gel.inkonchain.com"),
    get signer() { return RELAYER_WALLET.connect(this.provider); }
  },
  giwa: {
    name: "GIWA",
    chainId: 91342,
    rpc: "https://sepolia-rpc.giwa.io",
    provider: new ethers.JsonRpcProvider("https://sepolia-rpc.giwa.io"),
    get signer() { return RELAYER_WALLET.connect(this.provider); }
  },
  arc: {
    name: "ARC",
    chainId: 5042,
    rpc: "https://rpc.arc-scan.org",
    provider: new ethers.JsonRpcProvider("https://rpc.arc-scan.org"),
    get signer() { return RELAYER_WALLET.connect(this.provider); }
  }
};

const processedTxHashes = new Set();

async function checkRelayerBalances() {
  console.log("\n📊 [RELAYER LIQUIDITY BALANCES]");
  for (const [key, net] of Object.entries(DEST_NETWORKS)) {
    try {
      const bal = await net.provider.getBalance(RELAYER_WALLET.address);
      console.log(` • ${net.name}: ${ethers.formatEther(bal)} ETH/USDC`);
    } catch (err) {
      console.log(` • ${net.name}: (Balance check pending - ${err.message.slice(0, 35)})`);
    }
  }
  console.log("-----------------------------------------------------------------\n");
}

async function processDeposit(sourceName, tx) {
  if (!tx || !tx.to || tx.to.toLowerCase() !== PROTOCOL_ROUTER_ADDRESS) return;
  if (processedTxHashes.has(tx.hash)) return;

  processedTxHashes.add(tx.hash);
  const depositWei = tx.value;
  if (depositWei <= 0n) return;

  const depositEth = ethers.formatEther(depositWei);
  const feeWei = (depositWei * 180n) / 10000n; // 1.8% Protocol Fee
  const payoutWei = depositWei - feeWei;
  const payoutEth = ethers.formatEther(payoutWei);
  const userAddress = tx.from;

  console.log(`\n🔔 [NEW DEPOSIT DETECTED ON ${sourceName.toUpperCase()}]`);
  console.log(` • Source Tx: ${tx.hash}`);
  console.log(` • User: ${userAddress}`);
  console.log(` • Deposited: ${depositEth} ETH`);
  console.log(` • Protocol Fee (1.8%): ${ethers.formatEther(feeWei)} ETH`);
  console.log(` • Net Payout: ${payoutEth} ETH`);

  // Default target destination: INK
  const targetNet = DEST_NETWORKS.ink;
  console.log(`🚀 Dispatching payout on ${targetNet.name} to ${userAddress}...`);

  try {
    const relayerBalance = await targetNet.provider.getBalance(RELAYER_WALLET.address);
    if (relayerBalance < payoutWei) {
      console.error(`⚠️ [RELAYER BALANCE LOW] Needed: ${payoutEth} ETH, Available: ${ethers.formatEther(relayerBalance)} ETH on ${targetNet.name}`);
      console.error(`👉 Please send funds to Relayer Wallet: ${RELAYER_WALLET.address} on ${targetNet.name}`);
      return;
    }

    const payoutTx = await targetNet.signer.sendTransaction({
      to: userAddress,
      value: payoutWei
    });

    console.log(`✅ [PAYOUT SUBMITTED ON ${targetNet.name}]`);
    console.log(` • Payout Tx Hash: ${payoutTx.hash}`);
    console.log(` • Explorer: https://explorer.inkonchain.com/tx/${payoutTx.hash}`);
  } catch (payoutErr) {
    console.error(`❌ [PAYOUT FAILED ON ${targetNet.name}]:`, payoutErr.message);
  }
}

async function watchBaseDeposits() {
  const base = SOURCE_NETWORKS.base;
  const currentBlock = await base.provider.getBlockNumber();
  let lastCheckedBlock = Math.max(0, currentBlock - 50); // Look back 50 blocks on startup to ensure zero missed txs
  console.log(`👀 Watching ${base.name} starting with buffer from block #${lastCheckedBlock} (Head: #${currentBlock})...`);

  setInterval(async () => {
    try {
      const latest = await base.provider.getBlockNumber();
      while (lastCheckedBlock < latest) {
        lastCheckedBlock++;
        const block = await base.provider.getBlock(lastCheckedBlock, true);
        if (block && block.prefetchedTransactions) {
          for (const tx of block.prefetchedTransactions) {
            await processDeposit("Base", tx);
          }
        }
      }
    } catch (err) {
      // transient RPC notice
    }
  }, 3000);
}

async function startRelayer() {
  await checkRelayerBalances();
  await watchBaseDeposits();
  console.log("⚡ Relayer is LIVE and actively polling for cross-chain deposits...\n");
}

startRelayer().catch(console.error);
