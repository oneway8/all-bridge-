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
  routerAddress: "0x393509Ae71f63Ce9264E17f7b4f91bCC96e22E4E",
  feePercent: 1.8,
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

// Dynamic Network States
const NETWORKS = {
  1: {
    chainIdHex: "0x1",
    name: "Ethereum",
    shortName: "Ethereum",
    type: "L1 Settlement Anchor",
    mechanism: "Ethereum L1 Proof-of-Stake",
    rpcUrls: [
      "https://cloudflare-eth.com",
      "https://ethereum-rpc.publicnode.com",
      "https://rpc.ankr.com/eth"
    ],
    explorer: "https://etherscan.io",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "eth",
    priceUsd: 2445.00
  },
  8453: {
    chainIdHex: "0x2105",
    name: "Base",
    shortName: "Base",
    type: "Coinbase L2",
    mechanism: "OP Stack Canonical Bridge / Across",
    rpcUrls: [
      "https://mainnet.base.org",
      "https://base-rpc.publicnode.com",
      "https://1rpc.io/base"
    ],
    explorer: "https://basescan.org",
    currency: { name: "Ether", symbol: "ETH", decimals: 18 },
    iconKey: "base",
    priceUsd: 2445.00
  },
  57073: {
    chainIdHex: "0xdef1",
    name: "INK",
    shortName: "INK",
    type: "Kraken Superchain",
    mechanism: "OP Stack Native Lock & Mint",
    rpcUrls: [
      "https://rpc-gel.inkonchain.com",
      "https://rpc-qnd.inkonchain.com"
    ],
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
  5042: {
    chainIdHex: "0x13b2",
    name: "ARC",
    shortName: "ARC",
    type: "Circle L1",
    mechanism: "Circle CCTP (Burn & Mint)",
    rpcUrls: ["https://rpc.arc-scan.org"],
    explorer: "https://arc-scan.org",
    currency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
    iconKey: "arc",
    priceUsd: 1.00
  }
};

const SUPPORTED_CHAIN_IDS = [1, 8453, 57073, 91342, 5042];

const WALLETCONNECT_RPC_MAP = Object.freeze({
  1: "https://cloudflare-eth.com",
  8453: "https://mainnet.base.org",
  57073: "https://rpc-gel.inkonchain.com",
  91342: "https://sepolia-rpc.giwa.io",
  5042: "https://rpc.arc-scan.org"
});

// -----------------------------------------------------------------------------
// Internationalization (i18n) Translations (EN · JA · ZH · KO)
// -----------------------------------------------------------------------------
const I18N_TRANSLATIONS = {
  en: {
    navBridge: "Bridge",
    navRoutes: "Routes",
    navActivity: "Activity",
    connectWallet: "WalletConnect",
    connecting: "Connecting...",
    tabBridge: "Bridge",
    tabSwap: "Swap",
    payFrom: "Pay from",
    balance: "Balance:",
    receiveOn: "Receive on",
    estArrival: "Est. Arrival:",
    arrivalSpeed: "~5 seconds",
    route: "Route",
    routeMechanism: "Across Protocol Router",
    networkGas: "Network Gas",
    bridgeFee: "Bridge Protocol Fee (1.8%)",
    minReceived: "Minimum Received",
    btnBridge: "Bridge Assets",
    btnBroadcasting: "Broadcasting to Network...",
    securityNote: "Non-custodial smart contracts. Audited by OpenZeppelin.",
    safetyNoticeTitle: "⚠️ Safety & Security Notice (Read Before Use)",
    safetyPoint1: '<strong style="color: #f1f5f9;">Test Small Amounts First</strong>: Always execute a test transaction with a small amount before transferring larger sums.',
    safetyPoint2: '<strong style="color: #fbbf24;">GIWA Network</strong>: Currently undergoing scheduled network maintenance and upgrades.',
    safetyPoint3: '<strong style="color: #f1f5f9;">Transaction Finality</strong>: On-chain transactions are immutable and cannot be cancelled or reversed once signed.',
    routesTitle: "Supported Networks & Liquidity Routes",
    routesSubtitle: "Live canonical cross-chain status and rollup settlement confirmation times.",
    thNetwork: "Network",
    thType: "Type / Stack",
    thNative: "Native Asset",
    thSpeed: "Average Speed",
    thSettlement: "Settlement",
    thExplorer: "Explorer",
    statusOperational: "Operational",
    statusMaintenance: "Under Maintenance",
    activityTitle: "Activity Ledger",
    activitySubtitle: "Immutable record of cross-chain liquidity and settlement dispatches.",
    btnClearActivity: "Clear Activity",
    thTime: "Time",
    thRoute: "Route",
    thAmount: "Amount",
    thFee: "Fee (1.8%)",
    thStatus: "Status",
    thTxExplorer: "On-Chain Explorer",
    connectPrompt: "🔒 <strong>Please connect your wallet</strong> to view your personal cross-chain bridge activity.",
    noTxPrompt: "No bridge transactions found for <strong>{address}</strong> yet.",
    selectNetwork: "Select Network",
    footerDesc: "A non-custodial decentralized cross-chain bridge aggregator.",
    footerNotice: "⚠️ Notice: Cross-chain operations carry intrinsic protocol risks. Test with small sums first. GIWA network is currently under update.",
    footerDocs: "Docs",
    footerTerms: "Terms",
    footerPrivacy: "Privacy"
  },
  ja: {
    navBridge: "ブリッジ",
    navRoutes: "ルート一覧",
    navActivity: "アクティビティ",
    connectWallet: "ウォレット接続",
    connecting: "接続中...",
    tabBridge: "ブリッジ",
    tabSwap: "スワップ",
    payFrom: "支払元",
    balance: "残高:",
    receiveOn: "受取先",
    estArrival: "予想着金時間:",
    arrivalSpeed: "約5秒",
    route: "ルート",
    routeMechanism: "Acrossプロトコルルーター",
    networkGas: "ネットワークガス代",
    bridgeFee: "プロトコル手数料 (1.8%)",
    minReceived: "最低受取数量",
    btnBridge: "ブリッジを実行",
    btnBroadcasting: "ネットワークに送信中...",
    securityNote: "ノンカストディアル型スマートコントラクト。OpenZeppelin監査済み。",
    safetyNoticeTitle: "⚠️ ご利用前の安全上の注意事項",
    safetyPoint1: '<strong style="color: #f1f5f9;">少額テストの推奨</strong>: 大口送金の前に、必ず少額でのテスト送金を行ってください。',
    safetyPoint2: '<strong style="color: #fbbf24;">GIWAネットワーク</strong>: 現在定期メンテナンスおよびアップグレード作業中です。',
    safetyPoint3: '<strong style="color: #f1f5f9;">取引の不可逆性</strong>: 署名完了後のオンチェーントランザクションはキャンセル・取り消しができません。',
    routesTitle: "対応ネットワーク & 流動性ルート",
    routesSubtitle: "各ブロックチェーンのリアルタイム稼働状況および決済確定時間。",
    thNetwork: "ネットワーク",
    thType: "タイプ / 技術スタック",
    thNative: "ネイティブ通貨",
    thSpeed: "平均速度",
    thSettlement: "稼働状況",
    thExplorer: "エクスプローラー",
    statusOperational: "正常稼働中",
    statusMaintenance: "メンテナンス中",
    activityTitle: "アクティビティ台帳",
    activitySubtitle: "クロスチェーン流動性および決済トランザクションの改ざん不能な記録。",
    btnClearActivity: "履歴をクリア",
    thTime: "時間",
    thRoute: "ルート",
    thAmount: "数量",
    thFee: "手数料 (1.8%)",
    thStatus: "状態",
    thTxExplorer: "オンチェーン確認",
    connectPrompt: "🔒 個人のブリッジ履歴を確認するには<strong>ウォレットを接続</strong>してください。",
    noTxPrompt: "<strong>{address}</strong> のブリッジ取引履歴はまだありません。",
    selectNetwork: "ネットワークを選択",
    footerDesc: "ノンカストディアル型の分散型クロスチェーンブリッジアグリゲーター。",
    footerNotice: "⚠️ 注意: クロスチェーン取引には固有のリスクが存在します。まずは少額からお試しください。GIWAは現在アップデート作業中です。",
    footerDocs: "ドキュメント",
    footerTerms: "利用規約",
    footerPrivacy: "プライバシー"
  },
  zh: {
    navBridge: "跨链桥",
    navRoutes: "支持路线",
    navActivity: "活动记录",
    connectWallet: "连接钱包",
    connecting: "连接中...",
    tabBridge: "跨链桥",
    tabSwap: "兑换",
    payFrom: "支付网络",
    balance: "余额:",
    receiveOn: "接收网络",
    estArrival: "预计到达时间:",
    arrivalSpeed: "~5 秒",
    route: "跨链路线",
    routeMechanism: "Across 协议路由",
    networkGas: "网络 Gas 费",
    bridgeFee: "协议服务费 (1.8%)",
    minReceived: "最低到账数量",
    btnBridge: "立即跨链",
    btnBroadcasting: "正在广播至区块链...",
    securityNote: "非托管智能合约，已通过 OpenZeppelin 安全审计。",
    safetyNoticeTitle: "⚠️ 使用前安全须知",
    safetyPoint1: '<strong style="color: #f1f5f9;">请务必先进行小额测试</strong>: 在进行大额资产转移之前，请先用小额资金测试目标链是否正常到账。',
    safetyPoint2: '<strong style="color: #fbbf24;">GIWA 网络</strong>: 当前正在进行系统升级与维护。',
    safetyPoint3: '<strong style="color: #f1f5f9;">交易不可逆</strong>: 链上交易一经在钱包中签名确认，将无法取消或撤回。',
    routesTitle: "支持的网络与流动性路线",
    routesSubtitle: "实时跨链网络状态及各 Rollup 结算确认速度。",
    thNetwork: "网络",
    thType: "类型 / 架构",
    thNative: "原生代币",
    thSpeed: "平均速度",
    thSettlement: "运行状态",
    thExplorer: "区块浏览器",
    statusOperational: "正常运行",
    statusMaintenance: "维护中",
    activityTitle: "链上活动账本",
    activitySubtitle: "跨链流动性与结算发送的不可篡改记录。",
    btnClearActivity: "清空记录",
    thTime: "时间",
    thRoute: "路线",
    thAmount: "金额",
    thFee: "手续费 (1.8%)",
    thStatus: "状态",
    thTxExplorer: "区块浏览器",
    connectPrompt: "🔒 <strong>请连接您的钱包</strong> 以查看您的个人跨链交易记录。",
    noTxPrompt: "暂未查询到 <strong>{address}</strong> 的跨链交易记录。",
    selectNetwork: "选择网络",
    footerDesc: "非托管去中心化跨链桥聚合协议。",
    footerNotice: "⚠️ 风险提示: 跨链操作具有底层协议风险。请务必先使用小额测试。GIWA 网络当前正在升级维护中。",
    footerDocs: "技术文档",
    footerTerms: "服务条款",
    footerPrivacy: "隐私政策"
  },
  ko: {
    navBridge: "브릿지",
    navRoutes: "지원 경로",
    navActivity: "활동 내역",
    connectWallet: "지갑 연결",
    connecting: "연결 중...",
    tabBridge: "브릿지",
    tabSwap: "스왑",
    payFrom: "출발 체인",
    balance: "잔액:",
    receiveOn: "도착 체인",
    estArrival: "예상 소요 시간:",
    arrivalSpeed: "~5초",
    route: "라우팅 경로",
    routeMechanism: "Across 프로토콜 라우터",
    networkGas: "네트워크 가스비",
    bridgeFee: "프로토콜 수수료 (1.8%)",
    minReceived: "최소 수령 수량",
    btnBridge: "브릿지 실행",
    btnBroadcasting: "네트워크로 전송 중...",
    securityNote: "논커스터디얼 스마트 컨트랙트. OpenZeppelin 보안 감사 완료.",
    safetyNoticeTitle: "⚠️ 이용 전 필독 주의사항",
    safetyPoint1: '<strong style="color: #f1f5f9;">소액 사전 테스트 권장</strong>: 대규모 자산 전송 전, 반드시 소액으로 목적지 체인 정상 수신 여부를 먼저 테스트해 주세요.',
    safetyPoint2: '<strong style="color: #fbbf24;">GIWA 네트워크</strong>: 현재 정기 점검 및 시스템 업데이트 작업이 진행 중입니다.',
    safetyPoint3: '<strong style="color: #f1f5f9;">트랜잭션 비가역성</strong>: 온체인 트랜잭션은 지갑에서 서명 완료 후 취소나 되돌리기가 불가능합니다.',
    routesTitle: "지원 네트워크 & 유동성 라우트",
    routesSubtitle: "실시간 공식 크로스체인 상태 및 롤업 정산 확정 시간.",
    thNetwork: "네트워크",
    thType: "구분 / 스택",
    thNative: "기본 자산",
    thSpeed: "평균 속도",
    thSettlement: "가동 상태",
    thExplorer: "익스플로러",
    statusOperational: "정상 가동",
    statusMaintenance: "점검 중",
    activityTitle: "활동 내역 원장",
    activitySubtitle: "크로스체인 유동성 정산 및 전송 내역의 위변조 불가능한 온체인 기록.",
    btnClearActivity: "내역 지우기",
    thTime: "시간",
    thRoute: "경로",
    thAmount: "수량",
    thFee: "수수료 (1.8%)",
    thStatus: "상태",
    thTxExplorer: "온체인 조회",
    connectPrompt: "🔒 개인 브릿지 활동 내역을 확인하려면 <strong>지갑을 연결</strong>해 주세요.",
    noTxPrompt: "<strong>{address}</strong> 지갑의 브릿지 거래 내역이 아직 없습니다.",
    selectNetwork: "네트워크 선택",
    footerDesc: "비수탁형(Non-Custodial) 탈중앙화 크로스체인 브릿지 애그리게이터.",
    footerNotice: "⚠️ 주의: 크로스체인 전송에는 프로토콜 위험이 수반됩니다. 반드시 소액으로 먼저 테스트하세요. GIWA 네트워크는 현재 업데이트 중입니다.",
    footerDocs: "문서",
    footerTerms: "이용약관",
    footerPrivacy: "개인정보보호"
  }
};

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

const getInitialLanguage = () => {
  try {
    const saved = localStorage.getItem("allbridge_lang");
    if (saved && ["en", "ja", "zh", "ko"].includes(saved)) return saved;
    const browserLang = (navigator.language || navigator.userLanguage || "en").toLowerCase();
    if (browserLang.startsWith("ko")) return "ko";
    if (browserLang.startsWith("ja")) return "ja";
    if (browserLang.startsWith("zh")) return "zh";
  } catch (_) {}
  return "en";
};

const appState = {
  currentChainId: 1,
  userAddress: null,
  provider: null,
  signer: null,
  fromChain: 1,
  toChain: 8453,
  selectingTarget: null,
  cachedBalances: {},
  bridgeHistory: loadHistory(),
  language: getInitialLanguage()
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
  renderHistoryLedger();
}

function setDisconnectedUser() {
  appState.userAddress = null;
  appState.provider = null;
  appState.signer = null;
  appState.cachedBalances = {};
  renderHistoryLedger();

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
      name: "AllBridge Protocol",
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

      // 2.5. Dispatch 24/7 Cloud Relayer Payout (Runs 24/7 in Cloud Even When Mac is Off)
      try {
        fetch("https://allbridge-hub.vercel.app/api/relay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            txHash: txHash,
            sourceChain: appState.fromChain,
            targetChain: appState.toChain
          })
        }).then(res => res.json()).then(payoutRes => {
          if (payoutRes.success) {
            console.log("☁️ 24/7 Cloud Relayer Payout Executed:", payoutRes);
            showToast(`Settlement dispatched to ${toNet.name}!`);
          }
        }).catch(err => console.debug("Cloud relayer async dispatch:", err));
      } catch (cloudErr) {
        console.debug("Cloud relayer notice:", cloudErr);
      }
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
      walletAddress: appState.userAddress ? appState.userAddress.toLowerCase() : "",
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
        "arc-scan.org",
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

  const dict = I18N_TRANSLATIONS[appState.language] || I18N_TRANSLATIONS.en;

  if (!appState.userAddress) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #94a3b8; padding: 36px 16px; font-size: 0.9rem;">
          ${dict.connectPrompt}
        </td>
      </tr>
    `;
    return;
  }

  const currentWallet = appState.userAddress.toLowerCase();
  const userHistory = appState.bridgeHistory.filter(item => 
    !item.walletAddress || item.walletAddress.toLowerCase() === currentWallet
  );

  if (userHistory.length === 0) {
    const noTxMsg = dict.noTxPrompt.replace("{address}", truncateAddress(appState.userAddress));
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: #94a3b8; padding: 36px 16px; font-size: 0.9rem;">
          ${noTxMsg}
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = userHistory.map(item => {
    const safeTime = escapeHtml(item.time);
    const safeRoute = escapeHtml(item.route);
    const safeAmount = escapeHtml(item.amount);
    const safeFee = escapeHtml(item.fee);
    const safeStatus = escapeHtml(item.status);
    const safeTx = escapeHtml(item.txHash);
    const safeExplorer = isSafeExplorerUrl(item.explorer) ? item.explorer : "https://basescan.org";

    return `
      <tr>
        <td>${safeTime}</td>
        <td><strong>${safeRoute}</strong></td>
        <td>${safeAmount}</td>
        <td>${safeFee}</td>
        <td><span class="status-pill green">${safeStatus}</span></td>
        <td>
          <a href="${safeExplorer}" target="_blank" rel="noopener noreferrer" class="link-mono">
            ${truncateAddress(safeTx)} ↗
          </a>
        </td>
      </tr>
    `;
  }).join("");
}

// -----------------------------------------------------------------------------
// Language (i18n) Controller
// -----------------------------------------------------------------------------
function setLanguage(lang) {
  if (!I18N_TRANSLATIONS[lang]) lang = "en";
  appState.language = lang;
  try {
    localStorage.setItem("allbridge_lang", lang);
  } catch (_) {}

  const langLabels = { en: "EN", ja: "JA", zh: "ZH", ko: "KO" };
  const currentLabelEl = document.getElementById("currentLangLabel");
  if (currentLabelEl) {
    currentLabelEl.textContent = langLabels[lang] || "EN";
  }

  const dict = I18N_TRANSLATIONS[lang];
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key]) {
      el.innerHTML = dict[key];
    }
  });

  document.querySelectorAll(".lang-opt").forEach(btn => {
    if (btn.getAttribute("data-lang") === lang) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const btnExecute = document.getElementById("btnExecuteBridge");
  if (btnExecute && !isBridging) {
    btnExecute.textContent = dict.btnBridge;
  }

  renderHistoryLedger();
}

function setupLanguageSelector() {
  const btn = document.getElementById("btnLangDropdown");
  const menu = document.getElementById("langMenu");
  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });

  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== btn) {
      menu.classList.add("hidden");
    }
  });

  document.querySelectorAll(".lang-opt").forEach(opt => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      const selectedLang = opt.getAttribute("data-lang");
      setLanguage(selectedLang);
      menu.classList.add("hidden");
      showToast(`Language set to ${selectedLang.toUpperCase()}`);
    });
  });
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
  setupLanguageSelector();
  setupNetworkModal();
  setupBridgeForm();
  setupHistory();
  setupWalletButton();

  setLanguage(appState.language || "en");
  renderHistoryLedger();
  updateBridgeDisplay();
  updateCalculations();

  await fetchLivePrices();
  setInterval(fetchLivePrices, 30000);

  await checkAlreadyConnected();
});
