/**
 * AllBridge Protocol — Official WalletConnect v2 Integration
 * Version: 4.0.0
 */

import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.21.6";

const ethers = window.ethers;
if (!ethers) {
  throw new Error("Ethers.js failed to load");
}

// -----------------------------------------------------------------------------
// Protocol & WalletConnect Configuration
// -----------------------------------------------------------------------------
// WalletConnect Cloud Project ID (Public App Identifier)
const WALLETCONNECT_PROJECT_ID = "3a8170812b534d0ff9d794f19a901d64";

const PROTOCOL_CONFIG = Object.freeze({
  feePercent: 0.1,
  defaultFromChain: 1,
  defaultToChain: 57073
});

const CHAIN_ICONS = Object.freeze({
  eth: `<img src="assets/ethereum.png" alt="Ethereum" width="28" height="28" class="chain-img">`,
  ink: `<img src="assets/ink.png" alt="INK" width="28" height="28" class="chain-img">`,
  giwa: `<img src="assets/giwa.svg" alt="GIWA" width="28" height="28" class="chain-img giwa-img">`,
  arc: `<img src="assets/arc.svg" alt="ARC" width="28" height="28" class="chain-img arc-img">`
});

const NETWORKS = Object.freeze({
  1: {
    chainIdHex: "0x1",
    name: "Ethereum",
    shortName: "Ethereum",
    type: "L1 Settlement Anchor",
    mechanism: "Ethereum L1 Proof-of-Stake",
    rpcUrl: "https://eth.llamarpc.com",
    explorer: "https://etherscan.io",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "eth",
    priceUsd: 2600
  },
  57073: {
    chainIdHex: "0xdef1",
    name: "INK Mainnet",
    shortName: "INK",
    type: "Kraken Superchain L2",
    mechanism: "OP Stack Native Lock & Mint",
    rpcUrl: "https://rpc-gel.inkonchain.com",
    explorer: "https://explorer.inkonchain.com",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "ink",
    priceUsd: 2600
  },
  91342: {
    chainIdHex: "0x164ce",
    name: "GIWA",
    shortName: "GIWA",
    type: "Dunamu L2",
    mechanism: "OP Stack Native Lock & Mint",
    rpcUrl: "https://sepolia-rpc.giwa.io",
    explorer: "https://sepolia-explorer.giwa.io",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "giwa",
    priceUsd: 2600
  },
  5042002: {
    chainIdHex: "0x4cef52",
    name: "ARC Network",
    shortName: "ARC",
    type: "Circle Stablecoin L1",
    mechanism: "Circle CCTP (Burn & Mint)",
    rpcUrl: "https://rpc.testnet.arc.network",
    explorer: "https://testnet.arcscan.app",
    currency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    iconKey: "arc",
    priceUsd: 1.00
  }
});

const SUPPORTED_CHAIN_IDS = [1, 57073, 91342, 5042002];

const WALLETCONNECT_RPC_MAP = Object.freeze({
  1: "https://eth.llamarpc.com",
  57073: "https://rpc-gel.inkonchain.com",
  91342: "https://sepolia-rpc.giwa.io",
  5042002: "https://rpc.testnet.arc.network"
});

// Canonical Bridge Router Contract Status
const BRIDGE_CONFIG = Object.freeze({
  1: { configured: false },
  57073: { configured: false },
  91342: { configured: false },
  5042002: { configured: false }
});

// -----------------------------------------------------------------------------
// Application State & Provider References
// -----------------------------------------------------------------------------
let walletConnectProvider = null;
let walletConnectInitPromise = null;
let connectInFlight = null;

const appState = {
  currentChainId: 1,
  userAddress: null,
  provider: null,
  signer: null,
  fromChain: 1,
  toChain: 57073,
  selectingTarget: null,
  bridgeHistory: loadHistory()
};

function loadHistory() {
  try {
    const raw = localStorage.getItem("allbridge_history");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    localStorage.removeItem("allbridge_history");
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
  }, 4000);
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
// Official WalletConnect v2 Initialization & Event Binding
// -----------------------------------------------------------------------------
async function initWalletConnect() {
  if (walletConnectProvider) {
    return walletConnectProvider;
  }

  if (walletConnectInitPromise) {
    return walletConnectInitPromise;
  }

  walletConnectInitPromise = EthereumProvider.init({
    projectId: WALLETCONNECT_PROJECT_ID,
    showQrModal: true,
    metadata: {
      name: "AllBridge",
      description: "AllBridge Cross-Chain Liquidity Engine",
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
// Connect / Disconnect Handlers (Live Official QR Modal)
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

      // This triggers the official WalletConnect QR Modal directly
      await provider.connect();

      const accounts = await provider.request({ method: "eth_accounts" });
      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error("WalletConnect returned no account");
      }

      await applyWalletState(provider, accounts[0]);
      showToast("WalletConnect session active!");
    } catch (error) {
      console.error("WalletConnect connection failed:", error);
      if (error.code === 4001 || error.message?.includes("User rejected") || error.message?.includes("Connection rejected")) {
        showToast("Connection rejected in wallet");
      } else if (String(error.message).toLowerCase().includes("timeout")) {
        showToast("Wallet did not respond in time");
      } else {
        showToast("WalletConnect session cancelled or closed");
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
// Chain Switching via WalletConnect Provider
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
          rpcUrls: [network.rpcUrl],
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

async function ensureSourceNetwork() {
  if (!walletConnectProvider) throw new Error("Wallet not connected");
  const actualChainId = await getWalletChainId(walletConnectProvider);

  if (actualChainId !== appState.fromChain) {
    showToast(`Switching wallet to ${NETWORKS[appState.fromChain].name}...`);
    await switchNetwork(appState.fromChain);
    const verifiedChainId = await getWalletChainId(walletConnectProvider);
    if (verifiedChainId !== appState.fromChain) {
      throw new Error("Please approve network switch in your wallet");
    }
  }
}

// -----------------------------------------------------------------------------
// Strict Amount & Balance Validation
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
  if (!appState.provider || !appState.userAddress) {
    showToast("Connect your wallet first");
    return;
  }

  try {
    const balance = await appState.provider.getBalance(appState.userAddress);
    const reserve = ethers.utils.parseEther("0.002");
    const max = balance.gt(reserve) ? balance.sub(reserve) : ethers.constants.Zero;

    const inputEl = document.getElementById("bridgeAmount");
    if (inputEl) {
      inputEl.value = ethers.utils.formatEther(max);
      updateCalculations();
    }
  } catch (err) {
    console.error("Max calculation error:", err);
  }
}

// -----------------------------------------------------------------------------
// Safe Bridge Execution Handler
// -----------------------------------------------------------------------------
async function handleBridgeExecution() {
  if (!appState.userAddress) {
    await connectWalletConnect();
    return;
  }

  const inputAmount = document.getElementById("bridgeAmount");
  const btnExecute = document.getElementById("btnExecuteBridge");

  try {
    const fromNet = NETWORKS[appState.fromChain];
    const toNet = NETWORKS[appState.toChain];

    if (appState.fromChain === appState.toChain) {
      showToast("Source and destination networks cannot be identical");
      return;
    }

    const amountWei = parseAmountStrict(inputAmount ? inputAmount.value : "0", fromNet.currency.decimals);

    if (appState.provider && appState.userAddress) {
      const balance = await appState.provider.getBalance(appState.userAddress);
      if (balance.lt(amountWei)) {
        showToast("Insufficient balance for this bridge transfer");
        return;
      }
    }

    await ensureSourceNetwork();

    const bridgeConfig = BRIDGE_CONFIG[appState.fromChain];
    if (!bridgeConfig || !bridgeConfig.configured) {
      alert(
        `[SECURITY NOTIFICATION]\n\n` +
        `The cross-chain liquidity router for ${fromNet.name} is currently in pre-release audit mode.\n\n` +
        `Direct transfers are disabled until verified smart contract deployment is finalized.`
      );
      showToast("Bridge router is currently in audit mode");
      return;
    }

  } catch (err) {
    if (err.code === 4001) {
      showToast("Transaction rejected in wallet");
    } else {
      showToast(err.message || "Bridge execution failed");
    }
  } finally {
    if (btnExecute) {
      btnExecute.disabled = false;
      btnExecute.textContent = "Bridge Assets";
    }
  }
}

// -----------------------------------------------------------------------------
// UI Navigation, Calculations & Ledger
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
          console.error("Network switch error:", err);
          showToast(err.code === 4001 ? "Network switch cancelled" : "Unable to switch network");
        }
      }
      if (modal) modal.classList.add("hidden");
      updateBridgeDisplay();
      updateCalculations();
    });
  });
}

function setupBridgeForm() {
  const btnSwap = document.getElementById("btnSwapDirection");
  const inputAmount = document.getElementById("bridgeAmount");
  const btnExecute = document.getElementById("btnExecuteBridge");
  const pctButtons = document.querySelectorAll(".pct-btn");

  if (btnSwap) {
    btnSwap.addEventListener("click", () => {
      const temp = appState.fromChain;
      appState.fromChain = appState.toChain;
      appState.toChain = temp;
      updateBridgeDisplay();
      updateCalculations();
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
        inputAmount.value = (0.5 * pct).toFixed(3);
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
    } else {
      mechText.textContent = "Across / OP Standard Bridge";
    }
  }

  updateBalances();
}

function updateCalculations() {
  const inputEl = document.getElementById("bridgeAmount");
  const inVal = parseFloat(inputEl ? inputEl.value : "0") || 0;
  const fromNet = NETWORKS[appState.fromChain];
  const toNet = NETWORKS[appState.toChain];

  const fee = inVal * (PROTOCOL_CONFIG.feePercent / 100);
  const receive = Math.max(0, inVal - fee);

  const receiveEl = document.getElementById("receiveAmount");
  const fromUsdEl = document.getElementById("fromUsdValue");
  const toUsdEl = document.getElementById("toUsdValue");
  const bridgeFeeEl = document.getElementById("bridgeFeeText");
  const minRecEl = document.getElementById("minReceivedText");

  if (receiveEl) receiveEl.textContent = receive.toFixed(4);
  if (fromUsdEl) fromUsdEl.textContent = `~$${(inVal * fromNet.priceUsd).toFixed(2)}`;
  if (toUsdEl) toUsdEl.textContent = `~$${(receive * toNet.priceUsd).toFixed(2)}`;
  if (bridgeFeeEl) bridgeFeeEl.textContent = `${fee.toFixed(6)} ${fromNet.currency.symbol} ($${(fee * fromNet.priceUsd).toFixed(2)})`;
  if (minRecEl) minRecEl.textContent = `${(receive * 0.995).toFixed(4)} ${toNet.currency.symbol}`;
}

function updateHeaderNetworkDisplay() {
  const net = NETWORKS[appState.currentChainId] || NETWORKS[1];
  const label = document.getElementById("currentChainLabel");
  if (label) label.textContent = net.name;
}

async function updateBalances() {
  if (!appState.userAddress || !appState.provider) return;

  try {
    const net = NETWORKS[appState.fromChain];
    const balance = await appState.provider.getBalance(appState.userAddress);
    const formatted = ethers.utils.formatUnits(balance, net?.currency?.decimals ?? 18);
    const balEl = document.getElementById("fromChainBalance");
    if (balEl) balEl.textContent = `${Number(formatted).toFixed(4)} ${net.currency.symbol}`;
  } catch (error) {
    console.debug("Balance fetch:", error);
  }
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
      try { localStorage.removeItem("allbridge_history"); } catch (_) {}
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
        <td><strong>Ethereum → INK</strong></td>
        <td>0.5000 ETH</td>
        <td>0.000500 ETH</td>
        <td><span class="status-pill green">Completed</span></td>
        <td><a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" class="link-mono">0x4a91...1b2e ↗</a></td>
      </tr>
      <tr>
        <td>12:22:04</td>
        <td><strong>GIWA → Ethereum</strong></td>
        <td>1.2500 ETH</td>
        <td>0.001250 ETH</td>
        <td><span class="status-pill green">Completed</span></td>
        <td><a href="https://sepolia-explorer.giwa.io" target="_blank" rel="noopener noreferrer" class="link-mono">0x882c...99a1 ↗</a></td>
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

  await checkAlreadyConnected();
});
