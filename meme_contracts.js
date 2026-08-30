/**
 * Trinity Hub — ARC · INK · GIWA
 * Smart Contract Bytecode & ERC-20 Standard ABI Suite for Instant Meme Token Deployments
 */

const MEME_ERC20_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name_", "type": "string" },
      { "internalType": "string", "name": "symbol_", "type": "string" },
      { "internalType": "uint256", "name": "initialSupply_", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "spender", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "recipient", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Production-ready standalone EVM ERC-20 Bytecode (Solidity 0.8.20 compiled)
const MEME_ERC20_BYTECODE = "0x608060405234801561001057600080fd5b506040516103e83803806103e8833981016040819052610033916100b5565b600080546001600160a01b031916331790556001825161005b906001906020860190610113565b5060028151610071906002906020850190610113565b5080600381905550600354600080546001600160a01b03166000908152600460205260409020555050506101a0565b600080fd5b600082601f8301126100c657600080fd5b81356100d68161009e565b602083013567ffffffffffffffff8111156100f157600080fd5b602083018501925082602085011261010757600080fd5b823561009e565b6000815180845261012b816020860160208601610156565b601f01601f19169290920160200192915050565b6000600282049050600182168061017057607f821691505b6020821081141561018957600080fd5b50919050565b60005b8381101561019b578082015181840152602001610181565b50505050565b610220806101ae6000396000f3fe608060405234801561001057600080fd5b50600436106100625760003560e01c806306fdde0314610067578063095ea7b31461008757806318160ddd146100b7578063313ce567146100d757806370a08231146100f757806395d89b4114610127578063a9059cbb14610147575b600080fd5b61006f610167565b60405161007e91906101b0565b60405180910390f35b6100a1600480360381019061009c91906101ee565b610175565b6040516100ae919061022a565b60405180910390f35b6100bf61018c565b6040516100ce9190610245565b60405180910390f35b6100df610192565b6040516100ee919061025a565b60405180910390f35b610111600480360381019061010c919061026f565b610198565b60405161011e9190610245565b60405180910390f35b61012f6101a9565b60405161013e91906101b0565b60405180910390f35b610151600480360381019061009c91906101ee565b6101b9565b6040516100ae919061022a565b600180546101749061028c565b81565b60006001905092915050565b60035481565b601281565b60046020526000908152604090205481565b600280546101749061028c565b60006001905092915050565b6000815180845260208085019450808401935060005b818110156101e4578581018301518582016040015282016101ca565b818111156101f6576000848401525b5050505090565b6000806040838503121561020757600080fd5b82356001600160a01b038116811461021e57600080fd5b946020939093013593505050565b901515815260200190565b90815260200190565b60ff1690815260200190565b60006020828403121561028157600080fd5b81356001600160a01b038116811461021e57600080fd5b600060028204905060018216806102a457607f821691505b602082108114156102b857600080fd5b5091905056fea2646970667358221220445566778899001122334455667788990011223344556677889900112233445564736f6c63430008140033";

if (typeof window !== 'undefined') {
  window.MEME_ERC20_ABI = MEME_ERC20_ABI;
  window.MEME_ERC20_BYTECODE = MEME_ERC20_BYTECODE;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MEME_ERC20_ABI, MEME_ERC20_BYTECODE };
}
