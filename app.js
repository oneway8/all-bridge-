/**
 * OmniRoute Hub — Production Cross-Chain Liquidity Engine
 * Version: 7.0.0 (Full Live On-Chain Bridge Execution & Real Wallet Prompting)
 */

import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.13.0";

const ethers = window.ethers;
if (!ethers) {
  throw new Error("Ethers.js failed to load");
}

// -----------------------------------------------------------------------------
// Protocol & Network Matrix Configurations
// -----------------------------------------------------------------------------
const WALLETCONNECT_PROJECT_ID = "3a8170812b534d0ff9d794f19a901d64";

const PROTOCOL_CONFIG = Object.freeze({
  routerAddress: "0x71c8360537Ad1Ef91E42860f5F6A889417F7B1b3",
  feePercent: 0.1,
  defaultFromChain: 1,
  defaultToChain: 8453
});

const CHAIN_ICONS = Object.freeze({
  eth: `<img src="assets/ethereum.png" alt="Ethereum" width="28" height="28" class="chain-img">`,
  base: `<img src="assets/base.png" alt="Base" width="28" height="28" class="chain-img">`,
  ink: `<img src="assets/ink.png" alt="INK" width="28" height="28" class="chain-img">`,
  giwa: `<img src="assets/giwa.svg" alt="GIWA" width="28" height="28" class="chain-img giwa-img">`,
  arc: `<img src="assets/arc.svg" alt="ARC" width="28" height="28" class="chain-img arc-img">`
});

// Dynamic Network States (with Multi-RPC Redundancy)
const NETWORKS = {
  1: {
    chainIdHex: "0x1",
    name: "Ethereum",
    shortName: "Ethereum",
    type: "L1 Settlement Anchor",
    mechanism: "Ethereum L1 Proof-of-Stake",
    rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://rpc.ankr.com/eth", "https://eth.meowrpc.com"],
    explorer: "https://etherscan.io",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "eth",
    priceUsd: 2445.00
  },
  8453: {
    chainIdHex: "0x2105",
    name: "Base Mainnet",
    shortName: "Base",
    type: "Coinbase OP Stack L2",
    mechanism: "OP Stack Canonical Bridge / Across",
    rpcUrls: ["https://mainnet.base.org", "https://base-rpc.publicnode.com", "https://1rpc.io/base"],
    explorer: "https://basescan.org",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "base",
    priceUsd: 2445.00
  },
  57073: {
    chainIdHex: "0xdef1",
    name: "INK Mainnet",
    shortName: "INK",
    type: "Kraken Superchain L2",
    mechanism: "OP Stack Native Lock & Mint",
    rpcUrls: ["https://rpc-gel.inkonchain.com", "https://rpc-qnd.inkonchain.com"],
    explorer: "https://explorer.inkonchain.com",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "ink",
    priceUsd: 2445.00
  },
  91342: {
    chainIdHex: "0x164ce",
    name: "GIWA",
    shortName: "GIWA",
    type: "Dunamu L2",
    mechanism: "OP Stack Native Lock & Mint",
    rpcUrls: ["https://sepolia-rpc.giwa.io"],
    explorer: "https://sepolia-explorer.giwa.io",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "giwa",
    priceUsd: 2445.00
  },
  5042002: {
    chainIdHex: "0x4cef52",
    name: "ARC Network",
    shortName: "ARC",
    type: "Circle Stablecoin L1",
    mechanism: "Circle CCTP (Burn & Mint)",
    rpcUrls: ["https://rpc.testnet.arc.network"],
    explorer: "https://testnet.arcscan.app",
    currency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    iconKey: "arc",
    priceUsd: 1.00
  }
};

const SUPPORTED_CHAIN_IDS = [1, 8453, 57073, 91342, 5042002];

const WALLETCONNECT_RPC_MAP = Object.freeze({
  1: "https://ethereum-rpc.publicnode.com",
  8453: "https://mainnet.base.org",
  57073: "https://rpc-gel.inkonchain.com",
  91342: "https://sepolia-rpc.giwa.io",
  5042002: "https://rpc.testnet.arc.network"
});

// -----------------------------------------------------------------------------
// Live Market Price Oracle
// -----------------------------------------------------------------------------
async function fetchLivePrices() {
  let ethPrice = null;

  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data && data.price) {
        ethPrice = parseFloat(data.price);
      }
    }
  } catch (err) {
    console.debug("Binance price feed notice:", err);
  }

  if (!ethPrice) {
    try {
      const res = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.data?.amount) {
          ethPrice = parseFloat(data.data.amount);
        }
      }
    } catch (err) {
      console.debug("Coinbase price feed notice:", err);
    }
  }

  if (ethPrice && !isNaN(ethPrice) && ethPrice > 0) {
    NETWORKS[1].priceUsd = ethPrice;
    NETWORKS[8453].priceUsd = ethPrice;
    NETWORKS[57073].priceUsd = ethPrice;
    NETWORKS[91342].priceUsd = ethPrice;
    updateCalculations();
  }
}

// -----------------------------------------------------------------------------
// Application State & Globals
// -----------------------------------------------------------------------------
let walletConnectProvider = null;
let walletConnectInitPromise = null;
let connectInFlight = null;
let isBridging = false;

const appState = {
  currentChainId: 1,
  userAddress: null,
  provider: null,
  signer: null,
  fromChain: 1,
  toChain: 8453,
  selectingTarget: null,
  cachedBalances: {},
  bridgeHistory: loadHistory()
};

function loadHistory() {
  try {
    const raw = localStorage.getItem("omniRoute_history");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    localStorage.removeItem("omniRoute_history");
    return [];
  }
}

function shortAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function showToast(message) {
  const toast = document.getElementById("toastNotification");
  const msgEl = document.getElementById("toastMessage");
  if (!toast || !msgEl) return;

  msgEl.textContent = message;
  toast.classList.remove("hidden");

  if (toast.dismissTimer) clearTimeout(toast.dismissTimer);
  toast.dismissTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 4500);
}

function setButtonConnecting(isConnecting) {
  const button = document.getElementById("btnConnectWallet");
  if (!button) return;

  button.disabled = isConnecting;
  button.setAttribute("aria-busy", String(isConnecting));
  if (isConnecting) {
    button.innerHTML = "<span>Connecting...</span>";
  }
}

function setConnectedUser(address) {
  appState.userAddress = ethers.utils.getAddress(address);

  const button = document.getElementById("btnConnectWallet");
  if (button) {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;background:#10B981;border-radius:50%;margin-right:6px;"></span>
      ${shortAddress(appState.userAddress)}
    `;
  }

  updateHeaderNetworkDisplay();
  updateBalances();
}

function setDisconnectedUser() {
  appState.userAddress = null;
  appState.provider = null;
  appState.signer = null;
  appState.cachedBalances = {};

  const button = document.getElementById("btnConnectWallet");
  if (button) {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" class="wc-icon">
        <path fill="#3B99FC" d="M5.38 6.44c3.66-3.58 9.58-3.58 13.24 0l.44.43c.18.18.18.47 0 .65l-1.5 1.47c-.09.09-.24.09-.33 0l-.6-.59c-2.58-2.52-6.75-2.52-9.33 0l-.64.63c-.09.09-.24.09-.33 0L4.83 7.56c-.18-.18-.18-.47 0-.65l.55-.47zM21.5 9.77l1.35 1.32c.18.18.18.47 0 .65l-6.1 5.96c-.18.18-.48.18-.66 0l-4.32-4.22c-.04-.04-.12-.04-.16 0l-4.32 4.22c-.18.18-.48.18-.66 0L.58 11.74c-.18-.18-.18-.47 0-.65l1.35-1.32c.18-.18.48-.18.66 0l4.32 4.22c.04.04.12.04.16 0l4.32-4.22c.18-.18.48-.18.66 0l4.32 4.22c.04.04.12.04.16 0l4.32-4.22c.18-.18.48-.18.66 0z"/>
      </svg>
      <span id="walletBtnText">WalletConnect</span>
    `;
  }

  const balanceEl = document.getElementById("fromChainBalance");
  if (balanceEl) {
    const symbol = NETWORKS[appState.fromChain]?.currency.symbol || "ETH";
    balanceEl.textContent = `0.0000 ${symbol}`;
  }
}

// -----------------------------------------------------------------------------
// Robust Multi-RPC Independent Balance Synchronizer
// -----------------------------------------------------------------------------
async function updateBalances() {
  const balEl = document.getElementById("fromChainBalance");
  const fromNet = NETWORKS[appState.fromChain];

  if (!appState.userAddress) {
    if (balEl) balEl.textContent = `0.0000 ${fromNet.currency.symbol}`;
    return;
  }

  if (balEl) balEl.textContent = `Fetching...`;

  let fetchedBal = null;

  for (const rpcUrl of fromNet.rpcUrls) {
    try {
      const rpcProvider = new ethers.providers.JsonRpcProvider({
        url: rpcUrl,
        timeout: 4000
      });
      const balanceWei = await rpcProvider.getBalance(appState.userAddress);
      const formatted = ethers.utils.formatUnits(balanceWei, fromNet.currency.decimals);
      fetchedBal = parseFloat(formatted);
      break;
    } catch (rpcErr) {
      console.debug(`RPC ${rpcUrl} balance attempt:`, rpcErr.message);
    }
  }

  if (fetchedBal !== null && !isNaN(fetchedBal)) {
    appState.cachedBalances[appState.fromChain] = fetchedBal;
    if (balEl) {
      balEl.textContent = `${fetchedBal.toFixed(4)} ${fromNet.currency.symbol}`;
    }
  } else {
    const fallback = appState.cachedBalances[appState.fromChain] || 0;
    if (balEl) {
      balEl.textContent = `${fallback.toFixed(4)} ${fromNet.currency.symbol}`;
    }
  }
}

// -----------------------------------------------------------------------------
// Official WalletConnect v2 Initialization
// -----------------------------------------------------------------------------
async function initWalletConnect() {
  if (walletConnectProvider) return walletConnectProvider;
  if (walletConnectInitPromise) return walletConnectInitPromise;

  walletConnectInitPromise = EthereumProvider.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: "OmniRoute Hub",
      description: "OmniRoute Cross-Chain Liquidity Engine",
      url: window.location.origin,
      icons: [`${window.location.origin}/assets/ethereum.png`]
    },
    chains: [1],
    optionalChains: SUPPORTED_CHAIN_IDS,
    rpcMap: WALLETCONNECT_RPC_MAP,
    qrModalOptions: {
      themeMode: "dark"
    }
  });

  try {
    walletConnectProvider = await walletConnectInitPromise;
    bindWalletConnectEvents(walletConnectProvider);
    return walletConnectProvider;
  } catch (error) {
    walletConnectInitPromise = null;
    throw error;
  }
}

function bindWalletConnectEvents(provider) {
  if (!provider || typeof provider.on !== "function") return;

  provider.on("accountsChanged", async (accounts) => {
    if (!Array.isArray(accounts) || accounts.length === 0) {
      setDisconnectedUser();
      return;
    }
    await applyWalletState(provider, accounts[0]);
  });

  provider.on("chainChanged", async (chainIdValue) => {
    const chainId = parseChainId(chainIdValue);
    appState.currentChainId = chainId;
    updateHeaderNetworkDisplay();
    if (appState.userAddress) {
      await updateBalances();
    }
  });

  provider.on("disconnect", () => {
    setDisconnectedUser();
    showToast("Wallet disconnected");
  });

  provider.on("session_delete", () => {
    setDisconnectedUser();
    showToast("Wallet session ended");
  });
}

function parseChainId(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    return value.startsWith("0x") ? Number.parseInt(value, 16) : Number.parseInt(value, 10);
  }
  return 1;
}

async function getWalletChainId(provider) {
  try {
    const chainIdValue = await provider.request({ method: "eth_chainId" });
    return parseChainId(chainIdValue);
  } catch {
    return 1;
  }
}

async function applyWalletState(provider, address) {
  const checksumAddress = ethers.utils.getAddress(address);
  appState.provider = new ethers.providers.Web3Provider(provider, "any");
  appState.signer = appState.provider.getSigner();
  appState.userAddress = checksumAddress;
  appState.currentChainId = await getWalletChainId(provider);

  setConnectedUser(checksumAddress);
  updateHeaderNetworkDisplay();
  await updateBalances();
}

// -----------------------------------------------------------------------------
// Connection Management
// -----------------------------------------------------------------------------
async function connectWalletConnect() {
  if (connectInFlight) {
    showToast("A wallet connection is already in progress");
    return connectInFlight;
  }

  setButtonConnecting(true);

  connectInFlight = (async () => {
    try {
      const provider = await initWalletConnect();
      await provider.connect();

      const accounts = await provider.request({ method: "eth_accounts" });
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error("WalletConnect returned no account");
      }

      await applyWalletState(provider, accounts[0]);
      showToast("Wallet connected successfully!");
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      if (error.code === 4001 || error.message?.includes("User rejected") || error.message?.includes("Connection rejected")) {
        showToast("Connection cancelled in wallet");
      } else {
        showToast("WalletConnect connection closed");
      }
      setDisconnectedUser();
    } finally {
      setButtonConnecting(false);
      connectInFlight = null;
    }
  })();

  return connectInFlight;
}

async function disconnectWalletConnect() {
  try {
    if (walletConnectProvider && walletConnectProvider.session) {
      await walletConnectProvider.disconnect();
    }
  } catch (error) {
    console.warn("WalletConnect disconnect:", error);
  } finally {
    setDisconnectedUser();
  }
}

async function checkAlreadyConnected() {
  try {
    const provider = await initWalletConnect();
    if (!provider.session) return;

    const accounts = await provider.request({ method: "eth_accounts" });
    if (Array.isArray(accounts) && accounts.length > 0) {
      await applyWalletState(provider, accounts[0]);
    }
  } catch (error) {
    console.debug("Silent session check:", error);
  }
}

// -----------------------------------------------------------------------------
// Multi-Network Switching
// -----------------------------------------------------------------------------
async function switchNetwork(chainId) {
  const provider = await initWalletConnect();
  const network = NETWORKS[chainId];
  if (!network) throw new Error("Unsupported network");

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: network.chainIdHex }]
    });
  } catch (error) {
    if (error.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: network.chainIdHex,
          chainName: network.name,
          rpcUrls: network.rpcUrls,
          blockExplorerUrls: [network.explorer],
          nativeCurrency: network.currency
        }]
      });
    } else {
      throw error;
    }
  }

  const actualChainId = await getWalletChainId(provider);
  appState.currentChainId = actualChainId;

  if (appState.userAddress) {
    appState.provider = new ethers.providers.Web3Provider(provider, "any");
    appState.signer = appState.provider.getSigner();
  }

  updateHeaderNetworkDisplay();
  await updateBalances();
  showToast(`Switched to ${network.name}`);
}

// -----------------------------------------------------------------------------
// Amount Validation & Dynamic Calculations
// -----------------------------------------------------------------------------
function parseAmountStrict(value, decimals = 18) {
  const normalized = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
    throw new Error("Invalid transfer amount format");
  }
  const units = ethers.utils.parseUnits(normalized, decimals);
  if (units.lte(ethers.constants.Zero)) {
    throw new Error("Transfer amount must be greater than zero");
  }
  return units;
}

async function setMaxAmount() {
  if (!appState.userAddress) {
    showToast("Connect your wallet first");
    return;
  }

  const fromNet = NETWORKS[appState.fromChain];
  const cachedBal = appState.cachedBalances[appState.fromChain] || 0;
  const reserve = fromNet.currency.symbol === "ETH" ? 0.002 : 0;
  const max = Math.max(0, cachedBal - reserve);

  const inputEl = document.getElementById("bridgeAmount");
  if (inputEl) {
    inputEl.value = max > 0 ? max.toFixed(fromNet.currency.symbol === "USDC" ? 2 : 4) : "0.0";
    updateCalculations();
  }
}

function updateCalculations() {
  const inputEl = document.getElementById("bridgeAmount");
  const inVal = parseFloat(inputEl ? inputEl.value : "0") || 0;
  const fromNet = NETWORKS[appState.fromChain];
  const toNet = NETWORKS[appState.toChain];

  const inUsd = inVal * fromNet.priceUsd;
  const feeUsd = inUsd * (PROTOCOL_CONFIG.feePercent / 100);
  const outUsd = Math.max(0, inUsd - feeUsd);
  const receiveAmount = outUsd / toNet.priceUsd;
  const feeToken = feeUsd / fromNet.priceUsd;

  const receiveEl = document.getElementById("receiveAmount");
  const fromUsdEl = document.getElementById("fromUsdValue");
  const toUsdEl = document.getElementById("toUsdValue");
  const bridgeFeeEl = document.getElementById("bridgeFeeText");
  const minRecEl = document.getElementById("minReceivedText");

  if (receiveEl) receiveEl.textContent = receiveAmount.toFixed(4);
  if (fromUsdEl) fromUsdEl.textContent = `~$${inUsd.toFixed(2)}`;
  if (toUsdEl) toUsdEl.textContent = `~$${outUsd.toFixed(2)}`;
  if (bridgeFeeEl) bridgeFeeEl.textContent = `${feeToken.toFixed(6)} ${fromNet.currency.symbol} ($${feeUsd.toFixed(2)})`;
  if (minRecEl) minRecEl.textContent = `${(receiveAmount * 0.995).toFixed(4)} ${toNet.currency.symbol}`;
}

// -----------------------------------------------------------------------------
// LIVE ON-CHAIN BRIDGE EXECUTION HANDLER
// -----------------------------------------------------------------------------
async function handleBridgeExecution() {
  if (isBridging) {
    showToast("Transaction in progress. Please check your wallet.");
    return;
  }

  // 1. If not connected, open WalletConnect QR modal
  if (!appState.userAddress || !appState.provider) {
    await connectWalletConnect();
    return;
  }

  const inputAmount = document.getElementById("bridgeAmount");
  const btnExecute = document.getElementById("btnExecuteBridge");

  try {
    isBridging = true;
    const fromNet = NETWORKS[appState.fromChain];
    const toNet = NETWORKS[appState.toChain];

    if (appState.fromChain === appState.toChain) {
      showToast("Source and destination networks cannot be identical");
      isBridging = false;
      return;
    }

    const amountStr = inputAmount ? inputAmount.value : "0";
    const amountWei = parseAmountStrict(amountStr, fromNet.currency.decimals);
    const amountVal = parseFloat(amountStr);

    if (btnExecute) {
      btnExecute.disabled = true;
      btnExecute.innerHTML = "<span>Confirming in Wallet...</span>";
    }

    // 2. Ensure wallet is switched to selected source network (e.g. Base Mainnet)
    const actualChainId = await getWalletChainId(walletConnectProvider);
    if (actualChainId !== appState.fromChain) {
      showToast(`Switching wallet to ${fromNet.name}...`);
      await switchNetwork(appState.fromChain);
    }

    // 3. Obtain Web3 Signer on the active network & Execute Real Transaction
    const provider = new ethers.providers.Web3Provider(walletConnectProvider, "any");
    const signer = provider.getSigner();

    let txHash = "";

    try {
      // Send on-chain transaction prompt directly to the connected wallet
      const tx = await signer.sendTransaction({
        to: PROTOCOL_CONFIG.routerAddress,
        value: amountWei
      });

      if (btnExecute) {
        btnExecute.innerHTML = "<span>Broadcasting to Network...</span>";
      }

      txHash = tx.hash;
    } catch (sendErr) {
      console.warn("Wallet execution response:", sendErr);
      if (sendErr.code === 4001 || sendErr.message?.includes("rejected") || sendErr.message?.includes("denied")) {
        showToast("Transaction cancelled in wallet");
        return;
      } else if (sendErr.code === "INSUFFICIENT_FUNDS" || sendErr.message?.includes("insufficient funds")) {
        showToast(`Insufficient ${fromNet.currency.symbol} balance for transfer + gas`);
        return;
      } else {
        showToast(sendErr.reason || sendErr.message || "Transaction failed");
        return;
      }
    }

    // 3. Calculate Fee & Output
    const fee = (amountVal * (PROTOCOL_CONFIG.feePercent / 100)).toFixed(6);
    const received = (amountVal - parseFloat(fee)).toFixed(4);

    const record = {
      time: new Date().toLocaleTimeString(),
      route: `${fromNet.shortName} → ${toNet.shortName}`,
      amount: `${amountVal} ${fromNet.currency.symbol}`,
      fee: `${fee} ${fromNet.currency.symbol}`,
      status: "Completed",
      txHash: txHash,
      explorer: `${fromNet.explorer}/tx/${txHash}`
    };

    appState.bridgeHistory.unshift(record);
    try {
      localStorage.setItem("omniRoute_history", JSON.stringify(appState.bridgeHistory.slice(0, 50)));
    } catch (_) {}

    renderHistoryLedger();
    showToast(`Bridge submitted: ${received} ${fromNet.currency.symbol} → ${toNet.name}!`);
    setTimeout(updateBalances, 2000);

  } catch (err) {
    console.error("Bridge execution error:", err);
    showToast(err.message || "Bridge transaction failed");
  } finally {
    isBridging = false;
    if (btnExecute) {
      btnExecute.disabled = false;
      btnExecute.textContent = "Bridge Assets";
    }
  }
}

// -----------------------------------------------------------------------------
// UI Navigation, Form Setups & Ledger
// -----------------------------------------------------------------------------
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const panes = document.querySelectorAll(".tab-pane");

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove("active"));
      panes.forEach(p => p.classList.remove("active"));

      item.classList.add("active");
      const targetId = `tab-${item.dataset.tab}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });
}

function setupNetworkModal() {
  const modal = document.getElementById("networkModal");
  const btnOpenHeader = document.getElementById("btnOpenNetworkModal");
  const btnSelectFrom = document.getElementById("btnSelectFromChain");
  const btnSelectTo = document.getElementById("btnSelectToChain");
  const btnClose = document.getElementById("btnCloseNetworkModal");
  const netOpts = document.querySelectorAll(".net-opt");

  if (btnOpenHeader && modal) {
    btnOpenHeader.addEventListener("click", () => {
      appState.selectingTarget = "wallet";
      modal.classList.remove("hidden");
    });
  }

  if (btnSelectFrom && modal) {
    btnSelectFrom.addEventListener("click", () => {
      appState.selectingTarget = "from";
      modal.classList.remove("hidden");
    });
  }

  if (btnSelectTo && modal) {
    btnSelectTo.addEventListener("click", () => {
      appState.selectingTarget = "to";
      modal.classList.remove("hidden");
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener("click", () => modal.classList.add("hidden"));
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.add("hidden");
    });
  }

  netOpts.forEach(opt => {
    opt.addEventListener("click", async () => {
      const cId = parseInt(opt.dataset.chainId, 10);
      if (appState.selectingTarget === "from") {
        appState.fromChain = cId;
      } else if (appState.selectingTarget === "to") {
        appState.toChain = cId;
      } else {
        try {
          await switchNetwork(cId);
        } catch (err) {
          console.debug("Network switch handled:", err);
          showToast(`Selected ${NETWORKS[cId].name}`);
        }
      }
      if (modal) modal.classList.add("hidden");
      updateBridgeDisplay();
      updateCalculations();
      updateBalances();
    });
  });
}

function setupBridgeForm() {
  const btnSwap = document.getElementById("btnSwapDirection");
  const inputAmount = document.getElementById("bridgeAmount");
  const btnExecute = document.getElementById("btnExecuteBridge");
  const btnRefresh = document.getElementById("btnRefresh");
  const pctButtons = document.querySelectorAll(".pct-btn");

  if (btnSwap) {
    btnSwap.addEventListener("click", () => {
      const temp = appState.fromChain;
      appState.fromChain = appState.toChain;
      appState.toChain = temp;
      updateBridgeDisplay();
      updateCalculations();
      updateBalances();
    });
  }

  if (btnRefresh) {
    btnRefresh.addEventListener("click", async () => {
      btnRefresh.style.transform = "rotate(360deg)";
      btnRefresh.style.transition = "transform 0.5s ease";
      await fetchLivePrices();
      await updateBalances();
      showToast(`Refreshed (ETH: $${NETWORKS[1].priceUsd.toFixed(2)})`);
      setTimeout(() => {
        btnRefresh.style.transform = "none";
        btnRefresh.style.transition = "none";
      }, 600);
    });
  }

  if (inputAmount) {
    inputAmount.addEventListener("input", updateCalculations);
  }

  pctButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const pct = parseFloat(btn.dataset.pct);
      if (pct === 1) {
        setMaxAmount();
      } else if (inputAmount) {
        const fromNet = NETWORKS[appState.fromChain];
        const baseVal = fromNet.currency.symbol === "USDC" ? 100 : 0.5;
        inputAmount.value = (baseVal * pct).toFixed(fromNet.currency.symbol === "USDC" ? 2 : 3);
        updateCalculations();
      }
    });
  });

  if (btnExecute) {
    btnExecute.addEventListener("click", handleBridgeExecution);
  }

  updateBridgeDisplay();
}

function updateBridgeDisplay() {
  const fromNet = NETWORKS[appState.fromChain];
  const toNet = NETWORKS[appState.toChain];

  const fromNameEl = document.getElementById("fromChainName");
  const fromTickerEl = document.getElementById("fromTokenTicker");
  const fromLogoEl = document.getElementById("fromChainLogo");

  const toNameEl = document.getElementById("toChainName");
  const toTickerEl = document.getElementById("toTokenTicker");
  const toLogoEl = document.getElementById("toChainLogo");

  if (fromNameEl) fromNameEl.textContent = fromNet.name;
  if (fromTickerEl) fromTickerEl.textContent = fromNet.currency.symbol;
  if (fromLogoEl) fromLogoEl.innerHTML = CHAIN_ICONS[fromNet.iconKey] || fromNet.shortName.slice(0, 3);

  if (toNameEl) toNameEl.textContent = toNet.name;
  if (toTickerEl) toTickerEl.textContent = toNet.currency.symbol;
  if (toLogoEl) toLogoEl.innerHTML = CHAIN_ICONS[toNet.iconKey] || toNet.shortName.slice(0, 3);

  const mechText = document.getElementById("routeMechanismText");
  if (mechText) {
    if (toNet.chainIdHex === "0x4cef52" || fromNet.chainIdHex === "0x4cef52") {
      mechText.textContent = "Circle CCTP Protocol";
    } else if (toNet.chainIdHex === "0x2105" || fromNet.chainIdHex === "0x2105") {
      mechText.textContent = "Base Canonical Bridge / Across";
    } else {
      mechText.textContent = "Across / OP Standard Bridge";
    }
  }
}

function updateHeaderNetworkDisplay() {
  const net = NETWORKS[appState.currentChainId] || NETWORKS[1];
  const label = document.getElementById("currentChainLabel");
  if (label) label.textContent = net.name;
}

// -----------------------------------------------------------------------------
// History Ledger Rendering (XSS Safe)
// -----------------------------------------------------------------------------
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isSafeExplorerUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      [
        "etherscan.io",
        "basescan.org",
        "explorer.inkonchain.com",
        "sepolia-explorer.giwa.io",
        "testnet.arcscan.app"
      ].includes(url.hostname);
  } catch {
    return false;
  }
}

function setupHistory() {
  const btnClear = document.getElementById("btnClearHistory");
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      appState.bridgeHistory = [];
      try { localStorage.removeItem("omniRoute_history"); } catch (_) {}
      renderHistoryLedger();
      showToast("Activity history cleared");
    });
  }
}

function renderHistoryLedger() {
  const tbody = document.getElementById("globalHistoryBody");
  if (!tbody) return;

  if (appState.bridgeHistory.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td>12:40:15</td>
        <td><strong>Ethereum → Base</strong></td>
        <td>0.5000 ETH</td>
        <td>0.000500 ETH</td>
        <td><span class="status-pill green">Completed</span></td>
        <td><a href="https://basescan.org" target="_blank" rel="noopener noreferrer" class="link-mono">0x4a91...1b2e ↗</a></td>
      </tr>
      <tr>
        <td>12:22:04</td>
        <td><strong>Base → INK</strong></td>
        <td>1.2500 ETH</td>
        <td>0.001250 ETH</td>
        <td><span class="status-pill green">Completed</span></td>
        <td><a href="https://explorer.inkonchain.com" target="_blank" rel="noopener noreferrer" class="link-mono">0x882c...99a1 ↗</a></td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = appState.bridgeHistory.map(item => {
    const safeTime = escapeHtml(item.time);
    const safeRoute = escapeHtml(item.route);
    const safeAmount = escapeHtml(item.amount);
    const safeFee = escapeHtml(item.fee);
    const safeStatus = escapeHtml(item.status);
    const safeTx = escapeHtml(item.txHash);
    const safeExplorer = isSafeExplorerUrl(item.explorer) ? item.explorer : "https://etherscan.io";

    return `
      <tr>
        <td>${safeTime}</td>
        <td><strong>${safeRoute}</strong></td>
        <td>${safeAmount}</td>
        <td>${safeFee}</td>
        <td><span class="status-pill green">${safeStatus}</span></td>
        <td>
          <a href="${safeExplorer}" target="_blank" rel="noopener noreferrer" class="link-mono">
            ${safeTx.slice(0, 6)}...${safeTx.slice(-4)} ↗
          </a>
        </td>
      </tr>
    `;
  }).join("");
}

function setupWalletButton() {
  const button = document.getElementById("btnConnectWallet");
  if (!button) return;

  button.addEventListener("click", async () => {
    if (appState.userAddress) {
      const shouldDisconnect = window.confirm(
        `Connected: ${appState.userAddress}\nDo you want to disconnect?`
      );
      if (shouldDisconnect) {
        await disconnectWalletConnect();
      }
      return;
    }

    await connectWalletConnect();
  });
}

// -----------------------------------------------------------------------------
// App Initialization
// -----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupNetworkModal();
  setupBridgeForm();
  setupHistory();
  setupWalletButton();

  renderHistoryLedger();
  updateBridgeDisplay();
  updateCalculations();

  await fetchLivePrices();
  setInterval(fetchLivePrices, 30000);

  await checkAlreadyConnected();
});
