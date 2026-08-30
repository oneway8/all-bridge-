#!/usr/bin/env python3
"""
Lightweight Multi-Chain Diagnostic Tool for ARC, INK, GIWA, and Sepolia.
Uses native Python standard library (urllib.request / json) - Zero dependencies required!
"""

import os
import json
import urllib.request
import ssl

CHAINS = {
    "ARC Testnet (Circle L1)": {
        "rpc": "https://rpc.testnet.arc.network",
        "expected_id": 5042002,
        "symbol": "USDC",
        "explorer": "https://testnet.arcscan.app"
    },
    "INK Sepolia (Kraken L2)": {
        "rpc": "https://rpc-gel-sepolia.inkonchain.com",
        "expected_id": 763373,
        "symbol": "ETH",
        "explorer": "https://explorer-sepolia.inkonchain.com"
    },
    "GIWA Sepolia (Dunamu L2)": {
        "rpc": "https://sepolia-rpc.giwa.io",
        "expected_id": 91342,
        "symbol": "ETH",
        "explorer": "https://sepolia-explorer.giwa.io"
    },
    "Ethereum Sepolia (L1)": {
        "rpc": "https://gateway.tenderly.co/public/sepolia",
        "expected_id": 11155111,
        "symbol": "ETH",
        "explorer": "https://sepolia.etherscan.io"
    }
}

WALLET_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "burner_wallet.json")

def rpc_call(rpc_url, method, params=[]):
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
        "id": 1
    }
    req = urllib.request.Request(
        rpc_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "AirdropCopilot/2.0"}
    )
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    with urllib.request.urlopen(req, context=ctx, timeout=6) as response:
        res = json.loads(response.read().decode("utf-8"))
        if "error" in res:
            raise Exception(res["error"])
        return res.get("result")

def main():
    print("=" * 80)
    print("🌐 [ARC · INK · GIWA · Sepolia] 멀티체인 네트워크 진단 및 상태 점검")
    print("=" * 80)

    wallet_address = None
    if os.path.exists(WALLET_FILE):
        try:
            with open(WALLET_FILE, "r") as f:
                w_data = json.load(f)
                wallet_address = w_data.get("address")
                print(f"📍 테스트 지갑: {wallet_address}\n")
        except Exception:
            pass

    for name, info in CHAINS.items():
        print(f"🔗 [{name}] 점검 중...")
        try:
            # 1. Chain ID
            chain_id_hex = rpc_call(info["rpc"], "eth_chainId")
            chain_id = int(chain_id_hex, 16)
            match_id = "✅ 일치" if chain_id == info["expected_id"] else f"⚠️ 불일치 (실제: {chain_id}, 기대: {info['expected_id']})"

            # 2. Block Number
            block_hex = rpc_call(info["rpc"], "eth_blockNumber")
            block_num = int(block_hex, 16)

            # 3. Gas Price
            gas_hex = rpc_call(info["rpc"], "eth_gasPrice")
            gas_gwei = int(gas_hex, 16) / 1e9

            print(f"  • Chain ID    : {chain_id} ({match_id})")
            print(f"  • 최신 블록   : #{block_num:,}")
            print(f"  • 가스비      : {gas_gwei:.2f} Gwei")

            # 4. Wallet Balance
            if wallet_address:
                bal_hex = rpc_call(info["rpc"], "eth_getBalance", [wallet_address, "latest"])
                bal_eth = int(bal_hex, 16) / 1e18
                status = "✅ 잔액 있음" if bal_eth > 0 else "⚪ 0"
                print(f"  • 지갑 잔액   : {bal_eth:.6f} {info['symbol']} ({status})")

            print(f"  • 익스플로러  : {info['explorer']}")
            print("  🟢 상태: 정상 작동 중\n")

        except Exception as e:
            print(f"  ⚠️ 연결 또는 응답 오류: {e}\n")

    print("=" * 80)

if __name__ == "__main__":
    main()
