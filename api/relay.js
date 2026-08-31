import { ethers } from "ethers";

const PROTOCOL_ROUTER = "0x393509Ae71f63Ce9264E17f7b4f91bCC96e22E4E".toLowerCase();

const SOURCE_RPCS = {
  8453: "https://mainnet.base.org",
  1: "https://cloudflare-eth.com"
};

const DEST_NETWORKS = {
  57073: {
    name: "INK",
    rpc: "https://rpc-gel.inkonchain.com",
    explorer: "https://explorer.inkonchain.com"
  },
  5042: {
    name: "ARC",
    rpc: "https://rpc.arc-scan.org",
    explorer: "https://arc-scan.org"
  },
  91342: {
    name: "GIWA",
    rpc: "https://sepolia-rpc.giwa.io",
    explorer: "https://sepolia-explorer.giwa.io"
  }
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({ error: "PRIVATE_KEY not configured in Vercel Cloud" });
  }

  const cleanKey = privateKey.trim().startsWith("0x") ? privateKey.trim() : "0x" + privateKey.trim();
  const relayerWallet = new ethers.Wallet(cleanKey);

  // Status or Balance Check (GET)
  if (req.method === "GET") {
    const balances = {};
    for (const [chainId, net] of Object.entries(DEST_NETWORKS)) {
      try {
        const p = new ethers.JsonRpcProvider(net.rpc);
        const bal = await p.getBalance(relayerWallet.address);
        balances[net.name] = ethers.formatEther(bal);
      } catch {
        balances[net.name] = "check failed";
      }
    }
    return res.status(200).json({
      status: "ONLINE",
      relayerAddress: relayerWallet.address,
      balances
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { txHash, sourceChain = 8453, targetChain = 57073 } = req.body || {};

    if (!txHash || typeof txHash !== "string" || !txHash.startsWith("0x")) {
      return res.status(400).json({ error: "Valid txHash is required" });
    }

    const sourceRpc = SOURCE_RPCS[sourceChain] || SOURCE_RPCS[8453];
    const sourceProvider = new ethers.JsonRpcProvider(sourceRpc);

    // Fetch and verify on-chain source deposit transaction
    const tx = await sourceProvider.getTransaction(txHash);
    const receipt = await sourceProvider.getTransactionReceipt(txHash);

    if (!tx || !receipt || receipt.status !== 1) {
      return res.status(400).json({ error: "Transaction not confirmed on source chain" });
    }

    if (!tx.to || tx.to.toLowerCase() !== PROTOCOL_ROUTER) {
      return res.status(400).json({ error: "Transaction recipient is not protocol treasury" });
    }

    const depositWei = tx.value;
    if (depositWei <= 0n) {
      return res.status(400).json({ error: "Deposit amount is 0" });
    }

    const feeWei = (depositWei * 180n) / 10000n; // 1.8% Fee
    const payoutWei = depositWei - feeWei; // 98.2% Payout
    const userAddress = tx.from;

    const destConfig = DEST_NETWORKS[targetChain] || DEST_NETWORKS[57073];
    const destProvider = new ethers.JsonRpcProvider(destConfig.rpc);
    const destSigner = relayerWallet.connect(destProvider);

    const relayerBal = await destProvider.getBalance(relayerWallet.address);
    if (relayerBal < payoutWei) {
      return res.status(503).json({
        error: `Relayer liquidity balance insufficient on ${destConfig.name}`,
        required: ethers.formatEther(payoutWei),
        available: ethers.formatEther(relayerBal)
      });
    }

    // Dispatch automatic payout on destination chain 24/7 in the cloud
    const payoutTx = await destSigner.sendTransaction({
      to: userAddress,
      value: payoutWei
    });

    return res.status(200).json({
      success: true,
      sourceTxHash: txHash,
      payoutTxHash: payoutTx.hash,
      destinationChain: destConfig.name,
      amountSent: ethers.formatEther(payoutWei),
      userAddress,
      explorerUrl: `${destConfig.explorer}/tx/${payoutTx.hash}`
    });
  } catch (error) {
    console.error("Vercel Cloud Relayer Error:", error);
    return res.status(500).json({
      error: error.reason || error.message || "Failed to execute payout"
    });
  }
}
