// Replace with your actual deployed contract address on Sepolia
export const CONTRACT_ADDRESS: string = "0xYourDeployedContractAddressHere";

// Define the ABI with TypeScript type safety
export const CONTRACT_ABI: any[] = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "contractId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "farmerWallet",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "buyerWallet",
        "type": "address"
      }
    ],
    "name": "ContractCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "contractId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "newStatus",
        "type": "string"
      }
    ],
    "name": "ContractStatusUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "contractId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "raisedBy",
        "type": "address"
      }
    ],
    "name": "DisputeRaised",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "contractId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "FundsDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "contractId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "FundsReleased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "to",
        "type": "address"
      }
    ],
    "name": "PlatformFeesWithdrawn",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_contractId",
        "type": "uint256"
      }
    ],
    "name": "acceptBuyContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_contractId",
        "type": "uint256"
      }
    ],
    "name": "acceptSellContract",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "accumulatedFees",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_contractId",
        "type": "uint256"
      }
    ],
    "name": "confirmDelivery",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_contractId",
        "type": "uint256"
      }
    ],
    "name": "confirmReceipt",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "contractCounter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "contracts",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "contractId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "farmerWallet",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "buyerWallet",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "cropName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "quantity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "advanceAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "startDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "endDate",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "deliveryMethod",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "deliveryLocation",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "additionalNotes",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "status",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "escrowBalance",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "farmerConfirmedDelivery",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "buyerConfirmedReceipt",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "isBuyerInitiated",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_cropName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_quantity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_startDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_endDate",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_deliveryMethod",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_deliveryLocation",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_additionalNotes",
        "type": "string"
      }
    ],
    "name": "createBuyContract",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_cropName",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "_quantity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_amount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_startDate",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_endDate",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "_deliveryMethod",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_deliveryLocation",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_additionalNotes",
        "type": "string"
      }
    ],
    "name": "createSellContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_contractId",
        "type": "uint256"
      }
    ],
    "name": "getContractDetails",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "contractId",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "farmerWallet",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "buyerWallet",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "cropName",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "quantity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "advanceAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startDate",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "endDate",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "deliveryMethod",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "deliveryLocation",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "additionalNotes",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "status",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "escrowBalance",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "farmerConfirmedDelivery",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "buyerConfirmedReceipt",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "isBuyerInitiated",
            "type": "bool"
          }
        ],
        "internalType": "struct AgriculturalContract.ContractDetails",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeePercentage",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_contractId",
        "type": "uint256"
      }
    ],
    "name": "raiseDispute",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address payable",
        "name": "_to",
        "type": "address"
      }
    ],
    "name": "withdrawPlatformFees",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// Optional: Define an interface for contract details
export interface ContractDetails {
  contractId: string; // BigInt in ethers.js
  farmerWallet: string;
  buyerWallet: string;
  cropName: string;
  quantity: string; // BigInt in ethers.js
  amount: string; // BigInt in ethers.js
  advanceAmount: string; // BigInt in ethers.js
  startDate: string; // BigInt in ethers.js
  endDate: string; // BigInt in ethers.js
  deliveryMethod: string;
  deliveryLocation: string;
  additionalNotes: string;
  status: string;
  escrowBalance: string; // BigInt in ethers.js
  farmerConfirmedDelivery: boolean;
  buyerConfirmedReceipt: boolean;
  isBuyerInitiated: boolean;
}

export default {
  address: CONTRACT_ADDRESS,
  abi: CONTRACT_ABI,
};