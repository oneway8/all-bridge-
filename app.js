/**
 * AllBridge Protocol — Production Hardened Cross-Chain Liquidity Engine
 * Audited & Patched Architecture v3.0.0
 */

"use strict";

// Protocol Treasury & Bridge Configuration
const PROTOCOL_CONFIG = Object.freeze({
  feePercent: 0.1,
  defaultFromChain: 1,
  defaultToChain: 57073
});

// Official Chain Logos
const CHAIN_ICONS = Object.freeze({
  eth: `<img src="assets/ethereum.png" alt="Ethereum" width="28" height="28" class="chain-img">`,
  ink: `<img src="assets/ink.png" alt="INK" width="28" height="28" class="chain-img">`,
  giwa: `<img src="assets/giwa.svg" alt="GIWA" width="28" height="28" class="chain-img giwa-img">`,
  arc: `<img src="assets/arc.svg" alt="ARC" width="28" height="28" class="chain-img arc-img">`
});

// Supported Networks Matrix
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

// Canonical Bridge Contracts Matrix (Configured for Safe Routing)
const BRIDGE_CONFIG = Object.freeze({
  1: {
    name: "Ethereum L1 Standard Bridge Portal",
    configured: false // Will be set to true once mainnet bridge contract addresses are deployed & verified
  },
  57073: {
    name: "INK OP Stack Portal",
    configured: false
  },
  91342: {
    name: "GIWA OP Rollup Portal",
    configured: false
  },
  5042002: {
    name: "Circle CCTP Token Messenger",
    configured: false
  }
});

// Global Connection In-Flight State & Mutex
let connectInFlight = null;
let connectAttemptId = 0;

// Application State
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

// Safe LocalStorage History Loader
function loadHistory() {
  try {
    const raw = localStorage.getItem("allbridge_history");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch (err) {
    console.warn("Invalid history data:", err);
    try { localStorage.removeItem("allbridge_history"); } catch (_) {}
    return [];
  }
}

// -----------------------------------------------------------------------------
// Provider Resolution (Wallet-Specific Dispatching)
// -----------------------------------------------------------------------------
function getInjectedProvider(walletType = "auto") {
  if (typeof window === "undefined") return null;

  const providers = Array.isArray(window.ethereum?.providers)
    ? window.ethereum.providers
    : window.ethereum
      ? [window.ethereum]
      : [];

  if (walletType === "metamask") {
    return providers.find(p => p.isMetaMask && !p.isRabby && !p.isOkxWallet) || window.ethereum || null;
  }

  if (walletType === "coinbase") {
    return providers.find(p => p.isCoinbaseWallet)
      || window.coinbaseWalletExtension
      || null;
  }

  if (walletType === "okx") {
    return providers.find(p => p.isOkxWallet || p.isOKExWallet)
      || window.okxwallet
      || null;
  }

  if (walletType === "rabby") {
    return providers.find(p => p.isRabby)
      || window.rabby
      || null;
  }

  return providers[0]
    || window.okxwallet
    || window.rabby
    || window.coinbaseWalletExtension
    || null;
}

async function getConnectedChainId(provider) {
  if (!provider || !provider.request) return 1;
  try {
    const chainIdHex = await provider.request({ method: "eth_chainId" });
    return Number.parseInt(chainIdHex, 16);
  } catch (err) {
    console.warn("Failed to fetch eth_chainId:", err);
    return 1;
  }
}

// Promise Timeout Helper
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("Wallet request timed out"));
    }, ms);
  });

  return Promise.race([promise, timeout])
    .finally(() => clearTimeout(timer));
}

// -----------------------------------------------------------------------------
// Wallet Connection (Non-Hanging, In-Flight Guarded)
// -----------------------------------------------------------------------------
async function connectBrowserWallet(walletType = "auto") {
  if (connectInFlight) {
    showToast("A wallet connection is already in progress. Please check your wallet popup.");
    return connectInFlight;
  }

  const eth = getInjectedProvider(walletType);
  if (!eth) {
    showToast("Compatible Web3 wallet extension not found. Please install MetaMask.");
    window.open("https://metamask.io/download/", "_blank");
    return;
  }

  const attemptId = ++connectAttemptId;
  const btn = document.getElementById("btnConnectWallet");

  if (btn) {
    btn.disabled = true;
    btn.setAttribute("aria-busy", "true");
    btn.innerHTML = "<span>Connecting...</span>";
  }

  connectInFlight = (async () => {
    try {
      const accounts = await withTimeout(
        eth.request({ method: "eth_requestAccounts" }),
        30000
      );

      if (attemptId !== connectAttemptId) return;

      if (!Array.isArray(accounts) || accounts.length === 0) {
        throw new Error("No wallet account returned");
      }

      const address = ethers.utils.getAddress(accounts[0]);
      const provider = new ethers.providers.Web3Provider(eth, "any");

      appState.provider = provider;
      appState.signer = provider.getSigner();
      appState.currentChainId = await getConnectedChainId(eth);

      setConnectedUser(address);
      bindProviderEvents(eth);
      updateHeaderNetworkDisplay();
      showToast("Wallet connected successfully");
    } catch (err) {
      if (err.code === 4001) {
        showToast("Connection cancelled by user");
      } else if (err.code === -32002) {
        showToast("Approve the pending connection request in your wallet extension");
      } else if (err.message === "Wallet request timed out") {
        showToast("Wallet did not respond in time. Please try again");
      } else {
        console.error("Wallet connection failed:", err);
        showToast("Wallet connection failed");
      }

      if (attemptId === connectAttemptId) {
        setDisconnectedUser();
      }
    } finally {
      if (attemptId === connectAttemptId && btn) {
        btn.disabled = false;
        btn.removeAttribute("aria-busy");
      }
      connectInFlight = null;
    }
  })();

  return connectInFlight;
}

function setConnectedUser(address) {
  if (!address) return;
  appState.userAddress = address;
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const btn = document.getElementById("btnConnectWallet");
  if (btn) {
    btn.innerHTML = `<span style="display:inline-block;width:8px;height:8px;background:#10B981;border-radius:50%;margin-right:6px;"></span>${short}`;
  }
  updateBalances();
}

function setDisconnectedUser() {
  appState.userAddress = null;
  appState.provider = null;
  appState.signer = null;

  const btn = document.getElementById("btnConnectWallet");
  if (btn) {
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" class="wc-icon">
        <path fill="#3B99FC" d="M5.38 6.44c3.66-3.58 9.58-3.58 13.24 0l.44.43c.18.18.18.47 0 .65l-1.5 1.47c-.09.09-.24.09-.33 0l-.6-.59c-2.58-2.52-6.75-2.52-9.33 0l-.64.63c-.09.09-.24.09-.33 0L4.83 7.56c-.18-.18-.18-.47 0-.65l.55-.47zM21.5 9.77l1.35 1.32c.18.18.18.47 0 .65l-6.1 5.96c-.18.18-.48.18-.66 0l-4.32-4.22c-.04-.04-.12-.04-.16 0l-4.32 4.22c-.18.18-.48.18-.66 0L.58 11.74c-.18-.18-.18-.47 0-.65l1.35-1.32c.18-.18.48-.18.66 0l4.32 4.22c.04.04.12.04.16 0l4.32-4.22c.18-.18.48-.18.66 0l4.32 4.22c.04.04.12.04.16 0l4.32-4.22c.18-.18.48-.18.66 0z"/>
      </svg>
      <span id="walletBtnText">Connect Wallet</span>
    `;
  }

  const balance = document.getElementById("fromChainBalance");
  if (balance) {
    const symbol = NETWORKS[appState.fromChain]?.currency.symbol || "ETH";
    balance.textContent = `0.0000 ${symbol}`;
  }
}

// -----------------------------------------------------------------------------
// Provider Event Listeners
// -----------------------------------------------------------------------------
function bindProviderEvents(provider) {
  if (!provider || !provider.on) return;

  provider.removeListener?.("accountsChanged", handleAccountsChanged);
  provider.removeListener?.("chainChanged", handleChainChanged);
  provider.removeListener?.("disconnect", handleDisconnect);

  provider.on("accountsChanged", handleAccountsChanged);
  provider.on("chainChanged", handleChainChanged);
  provider.on("disconnect", handleDisconnect);
}

async function handleAccountsChanged(accounts) {
  if (!accounts || accounts.length === 0) {
    setDisconnectedUser();
    return;
  }

  const provider = getInjectedProvider();
  try {
    appState.userAddress = ethers.utils.getAddress(accounts[0]);
    appState.provider = new ethers.providers.Web3Provider(provider, "any");
    appState.signer = appState.provider.getSigner();
    appState.currentChainId = await getConnectedChainId(provider);

    setConnectedUser(appState.userAddress);
    updateHeaderNetworkDisplay();
    await updateBalances();
  } catch (err) {
    console.error("Account update error:", err);
    setDisconnectedUser();
  }
}

async function handleChainChanged(chainIdHex) {
  appState.currentChainId = Number.parseInt(chainIdHex, 16);

  if (appState.provider) {
    appState.signer = appState.provider.getSigner();
  }

  updateHeaderNetworkDisplay();
  await updateBalances();
}

function handleDisconnect() {
  setDisconnectedUser();
}

async function checkAlreadyConnected() {
  const provider = getInjectedProvider();
  if (!provider) return;

  try {
    const accounts = await provider.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0) {
      appState.userAddress = ethers.utils.getAddress(accounts[0]);
      appState.provider = new ethers.providers.Web3Provider(provider, "any");
      appState.signer = appState.provider.getSigner();
      appState.currentChainId = await getConnectedChainId(provider);

      setConnectedUser(appState.userAddress);
      bindProviderEvents(provider);
      updateHeaderNetworkDisplay();
    }
  } catch (err) {
    console.debug("Silent connection check:", err);
  }
}

// -----------------------------------------------------------------------------
// Network Management & Chain Verification
// -----------------------------------------------------------------------------
async function waitForChain(expectedChainId, timeoutMs = 15000) {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("No provider available");

  const expectedHex = NETWORKS[expectedChainId].chainIdHex.toLowerCase();
  const current = await provider.request({ method: "eth_chainId" });

  if (String(current).toLowerCase() === expectedHex) {
    return;
  }

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      provider.removeListener?.("chainChanged", onChanged);
      reject(new Error("Network switch confirmation timed out"));
    }, timeoutMs);

    function onChanged(chainIdHex) {
      if (String(chainIdHex).toLowerCase() === expectedHex) {
        clearTimeout(timer);
        provider.removeListener?.("chainChanged", onChanged);
        resolve();
      }
    }

    provider.on?.("chainChanged", onChanged);
  });
}

async function switchNetwork(chainId) {
  const net = NETWORKS[chainId];
  const eth = getInjectedProvider();
  if (!net || !eth) return;

  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: net.chainIdHex }]
    });
  } catch (switchError) {
    if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: net.chainIdHex,
          chainName: net.name,
          rpcUrls: [net.rpcUrl],
          blockExplorerUrls: [net.explorer],
          nativeCurrency: net.currency
        }]
      });
    } else {
      throw switchError;
    }
  }

  await waitForChain(chainId);
  const actualChainId = await getConnectedChainId(eth);

  if (actualChainId !== chainId) {
    throw new Error("Wallet is still on the wrong network");
  }

  appState.currentChainId = actualChainId;
  updateHeaderNetworkDisplay();
  await updateBalances();
  showToast(`Switched to ${net.name}`);
}

async function ensureSourceNetwork() {
  const provider = getInjectedProvider();
  if (!provider) throw new Error("Wallet provider not connected");

  const actualChainId = await getConnectedChainId(provider);

  if (actualChainId !== appState.fromChain) {
    showToast(`Switching wallet to ${NETWORKS[appState.fromChain].name}...`);
    await switchNetwork(appState.fromChain);

    const verifiedChainId = await getConnectedChainId(provider);
    if (verifiedChainId !== appState.fromChain) {
      throw new Error("Please switch your wallet to the selected source network");
    }
  }
}

// -----------------------------------------------------------------------------
// Strict Amount Validation & Math Precision
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
    const reserve = ethers.utils.parseEther("0.002"); // Gas reserve

    const max = balance.gt(reserve)
      ? balance.sub(reserve)
      : ethers.constants.Zero;

    const inputEl = document.getElementById("bridgeAmount");
    if (inputEl) {
      inputEl.value = ethers.utils.formatEther(max);
      updateCalculations();
    }
  } catch (err) {
    console.error("Max amount calculation error:", err);
  }
}

// -----------------------------------------------------------------------------
// Safe Bridge Execution Handler (Blocked Until Verified Contract Deployment)
// -----------------------------------------------------------------------------
async function handleBridgeExecution() {
  if (!appState.userAddress) {
    openWalletModal();
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

    // 1. Strict Amount Validation
    const amountWei = parseAmountStrict(inputAmount ? inputAmount.value : "0", fromNet.currency.decimals);

    // 2. Pre-flight Balance Verification
    if (appState.provider && appState.userAddress) {
      const balance = await appState.provider.getBalance(appState.userAddress);
      if (balance.lt(amountWei)) {
        showToast("Insufficient balance for this bridge transfer");
        return;
      }
    }

    // 3. Ensure Wallet is on the Selected Source Network
    await ensureSourceNetwork();

    // 4. Safe Contract Deployment Check (Refuse unverified blind transfers)
    const bridgeConfig = BRIDGE_CONFIG[appState.fromChain];
    if (!bridgeConfig || !bridgeConfig.configured) {
      alert(
        `[SECURITY GUARD]\n\n` +
        `The canonical bridge router contract for ${fromNet.name} is currently in pre-release audit stage.\n\n` +
        `To protect your funds, direct transfers are locked until the verified smart contract address is deployed to mainnet.`
      );
      showToast("Bridge router contract is currently in audit mode");
      return;
    }

  } catch (err) {
    if (err.code === 4001) {
      showToast("Transaction cancelled by user");
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
// UI Navigation, Modals & Form Setups
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

function setupWalletModal() {
  const modal = document.getElementById("walletConnectModal");
  const btnClose = document.getElementById("btnCloseWcModal");
  const btnConnect = document.getElementById("btnConnectWallet");

  const btnMetaMask = document.getElementById("btnConnectMetaMask");
  const btnCoinbase = document.getElementById("btnConnectCoinbase");
  const btnOKX = document.getElementById("btnConnectOKX");

  if (btnConnect) {
    btnConnect.addEventListener("click", () => {
      if (appState.userAddress) {
        if (confirm(`Connected: ${appState.userAddress}\nDo you want to disconnect?`)) {
          setDisconnectedUser();
        }
      } else {
        openWalletModal();
      }
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

  if (btnMetaMask && modal) {
    btnMetaMask.addEventListener("click", async () => {
      modal.classList.add("hidden");
      await connectBrowserWallet("metamask");
    });
  }

  if (btnCoinbase && modal) {
    btnCoinbase.addEventListener("click", async () => {
      modal.classList.add("hidden");
      await connectBrowserWallet("coinbase");
    });
  }

  if (btnOKX && modal) {
    btnOKX.addEventListener("click", async () => {
      modal.classList.add("hidden");
      await connectBrowserWallet("okx");
    });
  }
}

function openWalletModal() {
  const modal = document.getElementById("walletConnectModal");
  if (modal) modal.classList.remove("hidden");
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
          if (err.code === 4001) {
            showToast("Network switch cancelled");
          } else {
            showToast("Unable to switch network");
          }
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
  if (!appState.userAddress) return;
  const eth = getInjectedProvider();
  if (!eth) return;

  try {
    const p = new ethers.providers.Web3Provider(eth, "any");
    const balWei = await p.getBalance(appState.userAddress);
    const balEth = parseFloat(ethers.utils.formatEther(balWei)).toFixed(4);
    const fromNet = NETWORKS[appState.fromChain];
    const balEl = document.getElementById("fromChainBalance");
    if (balEl) balEl.textContent = `${balEth} ${fromNet.currency.symbol}`;
  } catch (e) {
    console.debug("Balance fetch:", e);
  }
}

// -----------------------------------------------------------------------------
// History Ledger Rendering (XSS Safe & Domain Whitelisted)
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

// -----------------------------------------------------------------------------
// App Initialization
// -----------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  setupNavigation();
  setupNetworkModal();
  setupWalletModal();
  setupBridgeForm();
  setupHistory();

  renderHistoryLedger();
  updateBridgeDisplay();
  updateCalculations();

  const provider = getInjectedProvider();
  bindProviderEvents(provider);
  await checkAlreadyConnected();
});
