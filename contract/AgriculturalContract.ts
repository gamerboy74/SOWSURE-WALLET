// Replace with your actual deployed contract address on Sepolia
export const CONTRACT_ADDRESS: string =
  "0x61E139A50735bDEa916147535f2e13Acb9b619f0";

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
				"indexed": false,
				"internalType": "uint256",
				"name": "contractId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "farmer",
				"type": "address"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "buyer",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "isBuyerInitiated",
				"type": "bool"
			}
		],
		"name": "ContractCreated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "contractId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "enum AgriculturalContract.ContractStatus",
				"name": "status",
				"type": "uint8"
			}
		],
		"name": "ContractStatusUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
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
				"internalType": "uint256",
				"name": "advanceAmount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "escrowBalance",
				"type": "uint256"
			}
		],
		"name": "DebugValues",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "contractId",
				"type": "uint256"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "by",
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
				"indexed": false,
				"internalType": "uint256",
				"name": "contractId",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "bool",
				"name": "payFarmer",
				"type": "bool"
			}
		],
		"name": "DisputeResolved",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
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
				"indexed": false,
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
			}
		],
		"name": "PlatformFeesWithdrawn",
		"type": "event"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "contractId",
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
				"name": "contractId",
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
			}
		],
		"name": "acceptSellContract",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "contractId",
				"type": "uint256"
			}
		],
		"name": "claimRemainingAfterTimeout",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "contractId",
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
				"name": "contractId",
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
		"name": "confirmationPeriod",
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
						"name": "remainingAmount",
						"type": "uint256"
					}
				],
				"internalType": "struct AgriculturalContract.BasicDetails",
				"name": "basic",
				"type": "tuple"
			},
			{
				"components": [
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
						"internalType": "uint256",
						"name": "confirmationDeadline",
						"type": "uint256"
					}
				],
				"internalType": "struct AgriculturalContract.TimeDetails",
				"name": "time",
				"type": "tuple"
			},
			{
				"components": [
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
					}
				],
				"internalType": "struct AgriculturalContract.DeliveryDetails",
				"name": "delivery",
				"type": "tuple"
			},
			{
				"components": [
					{
						"internalType": "enum AgriculturalContract.ContractStatus",
						"name": "status",
						"type": "uint8"
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
				"internalType": "struct AgriculturalContract.StatusDetails",
				"name": "status",
				"type": "tuple"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
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
				"name": "startDate",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "endDate",
				"type": "uint256"
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
				"name": "contractId",
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
						"name": "remainingAmount",
						"type": "uint256"
					}
				],
				"internalType": "struct AgriculturalContract.BasicDetails",
				"name": "basic",
				"type": "tuple"
			},
			{
				"components": [
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
						"internalType": "uint256",
						"name": "confirmationDeadline",
						"type": "uint256"
					}
				],
				"internalType": "struct AgriculturalContract.TimeDetails",
				"name": "time",
				"type": "tuple"
			},
			{
				"components": [
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
					}
				],
				"internalType": "struct AgriculturalContract.DeliveryDetails",
				"name": "delivery",
				"type": "tuple"
			},
			{
				"components": [
					{
						"internalType": "enum AgriculturalContract.ContractStatus",
						"name": "status",
						"type": "uint8"
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
				"internalType": "struct AgriculturalContract.StatusDetails",
				"name": "status",
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
				"name": "contractId",
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
				"internalType": "uint256",
				"name": "contractId",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "payFarmer",
				"type": "bool"
			}
		],
		"name": "resolveDispute",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "totalPlatformFees",
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
		"inputs": [],
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
