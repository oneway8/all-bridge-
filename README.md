# 🌉 ALL BRIDGE — Next-Gen Cross-Chain Portal
### Unified Cross-Chain Liquidity Mesh for ARC (Circle), INK (Kraken), and GIWA (Dunamu)

ALL BRIDGE is a production-grade, non-custodial, high-speed cross-chain portal and automated airdrop farming suite connecting Ethereum Sepolia (L1), GIWA Sepolia (Dunamu), INK Sepolia (Kraken), and ARC Testnet (Circle).

---

## 🚀 Live Local Quickstart

### 1. Launch the Web DApp
```bash
cd trinity-bridge
python3 -m http.server 8088
```
Open **`http://localhost:8088`** in your browser.

### 2. Connect Web3 Wallet & Auto-Switch Networks
- Click **[Connect Wallet]** (MetaMask, Rabby, OKX).
- Select any network from the dropdown (**GIWA**, **INK**, **ARC**, **Sepolia**) and click **[Switch Chain]** — MetaMask will automatically register and switch RPC configurations with zero manual entry.

---

## 🌐 Supported Network Matrix & Routing Protocols

| Network | Entity / Type | Chain ID | Gas Token | Protocol Routing | Explorer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GIWA Sepolia** | Dunamu (Upbit) $1.2B L2 | `91342` | ETH | OP Stack Native Lock & Mint | [GiwaScan](https://sepolia-explorer.giwa.io) |
| **INK Sepolia** | Kraken Superchain L2 | `763373` | ETH | OP Stack Native Lock & Mint | [InkScan](https://explorer-sepolia.inkonchain.com) |
| **ARC Testnet** | Circle Stablecoin L1 | `5042002` | USDC | Circle CCTP (Burn & Mint) | [ArcScan](https://testnet.arcscan.app) |
| **Ethereum Sepolia**| Ethereum L1 Testnet | `11155111` | ETH | L1 Settlement Anchor | [Etherscan](https://sepolia.etherscan.io) |

---

## 💰 Fee Settlement & Revenue Stream

Every cross-chain teleportation executes an automated 0.1% protocol fee split directly into your configured Treasury wallet address.

To update the fee collector wallet, edit `app.js` (lines 7-11):
```javascript
const TREASURY_CONFIG = {
  feeReceiverAddress: "0xYourWalletAddressHere", // Your personal EVM address
  bridgeFeePercent: 0.1,      // 0.1% Protocol Fee
  minRelayTimeSeconds: 5      // 5-second Instant Finality
};
```

---

## 🚢 1-Click Vercel Deployment

This project is pre-configured with `vercel.json`.

1. Push this directory to your GitHub account:
```bash
git init
git add .
git commit -m "feat: launch trinity bridge v1.0"
git remote add origin https://github.com/your-username/trinity-bridge.git
git push -u origin main
```
2. Log into [Vercel.com](https://vercel.com) → Click **[Add New Project]** → **[Import]**.
3. Live Global Production Domain: **[https://all-bridge-hub.vercel.app](https://all-bridge-hub.vercel.app)**

---

## 📜 Legal Compliance Notice
TRINITY BRIDGE is a decentralized, non-custodial interface. It does not store user private keys or hold custody of funds. All asset movements route via audited on-chain smart contracts.
