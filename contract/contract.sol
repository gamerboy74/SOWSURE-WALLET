// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AgriculturalContract {
    // Struct to store contract details
    struct ContractDetails {
        uint256 contractId;
        address farmerWallet;
        address buyerWallet;
        string cropName;
        uint256 quantity;
        uint256 amount; // Total amount in Wei (ETH)
        uint256 advanceAmount; // Advance amount in Wei (ETH)
        uint256 startDate; // Unix timestamp
        uint256 endDate; // Unix timestamp
        string deliveryMethod;
        string deliveryLocation;
        string additionalNotes;
        string status; // PENDING, FUNDED, IN_PROGRESS, DELIVERED, COMPLETED, CANCELLED, DISPUTED
        uint256 escrowBalance; // Current balance in Wei (ETH)
        bool farmerConfirmedDelivery;
        bool buyerConfirmedReceipt;
        bool isBuyerInitiated;
    }

    // Mapping to store contracts by ID
    mapping(uint256 => ContractDetails) public contracts;
    uint256 public contractCounter;
    address public owner;
    uint256 public platformFeePercentage = 5; // 5% fee in basis points (0.05)
    uint256 public accumulatedFees; // Total fees collected in Wei

    // Events for off-chain monitoring
    event ContractCreated(uint256 indexed contractId, address indexed farmerWallet, address indexed buyerWallet);
    event ContractStatusUpdated(uint256 indexed contractId, string newStatus);
    event FundsDeposited(uint256 indexed contractId, uint256 amount);
    event FundsReleased(uint256 indexed contractId, uint256 amount, address recipient);
    event DisputeRaised(uint256 indexed contractId, address raisedBy);
    event PlatformFeesWithdrawn(uint256 amount, address to);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier validContract(uint256 _contractId) {
        require(_contractId > 0 && _contractId <= contractCounter, "Invalid contract ID");
        _;
    }

    // Farmer creates a sell contract (no funds required upfront)
    function createSellContract(
        string memory _cropName,
        uint256 _quantity,
        uint256 _amount, // Amount in Wei (ETH)
        uint256 _startDate,
        uint256 _endDate,
        string memory _deliveryMethod,
        string memory _deliveryLocation,
        string memory _additionalNotes
    ) public {
        require(_amount > 0, "Amount must be greater than 0");
        require(_startDate < _endDate, "Start date must be before end date");

        contractCounter++;
        contracts[contractCounter] = ContractDetails({
            contractId: contractCounter,
            farmerWallet: msg.sender,
            buyerWallet: address(0),
            cropName: _cropName,
            quantity: _quantity,
            amount: _amount,
            advanceAmount: 0, // No advance for sell contracts initially
            startDate: _startDate,
            endDate: _endDate,
            deliveryMethod: _deliveryMethod,
            deliveryLocation: _deliveryLocation,
            additionalNotes: _additionalNotes,
            status: "PENDING",
            escrowBalance: 0,
            farmerConfirmedDelivery: false,
            buyerConfirmedReceipt: false,
            isBuyerInitiated: false
        });

        emit ContractCreated(contractCounter, msg.sender, address(0));
    }

    // Buyer creates a buy contract (funds escrow immediately)
    function createBuyContract(
        string memory _cropName,
        uint256 _quantity,
        uint256 _amount, // Amount in Wei (ETH)
        uint256 _startDate,
        uint256 _endDate,
        string memory _deliveryMethod,
        string memory _deliveryLocation,
        string memory _additionalNotes
    ) public payable {
        require(_amount > 0, "Amount must be greater than 0");
        require(msg.value == _amount, "Incorrect ETH amount sent");
        require(_startDate < _endDate, "Start date must be before end date");

        contractCounter++;
        uint256 advance = _amount / 5; // 20% advance
        contracts[contractCounter] = ContractDetails({
            contractId: contractCounter,
            farmerWallet: address(0),
            buyerWallet: msg.sender,
            cropName: _cropName,
            quantity: _quantity,
            amount: _amount,
            advanceAmount: advance,
            startDate: _startDate,
            endDate: _endDate,
            deliveryMethod: _deliveryMethod,
            deliveryLocation: _deliveryLocation,
            additionalNotes: _additionalNotes,
            status: "PENDING",
            escrowBalance: _amount,
            farmerConfirmedDelivery: false,
            buyerConfirmedReceipt: false,
            isBuyerInitiated: true
        });

        emit ContractCreated(contractCounter, address(0), msg.sender);
        emit FundsDeposited(contractCounter, _amount);
    }

    // Buyer accepts a sell contract (funds escrow)
    function acceptSellContract(uint256 _contractId) public payable validContract(_contractId) {
        ContractDetails storage contract = contracts[_contractId];
        require(keccak256(bytes(contract.status)) == keccak256(bytes("PENDING")), "Contract not pending");
        require(contract.buyerWallet == address(0), "Contract already accepted");
        require(msg.value == contract.amount, "Incorrect ETH amount sent");

        contract.buyerWallet = msg.sender;
        contract.status = "FUNDED";
        contract.escrowBalance = msg.value;

        emit ContractStatusUpdated(_contractId, "FUNDED");
        emit FundsDeposited(_contractId, msg.value);
    }

    // Farmer accepts a buy contract (receives advance)
    function acceptBuyContract(uint256 _contractId) public validContract(_contractId) {
        ContractDetails storage contract = contracts[_contractId];
        require(keccak256(bytes(contract.status)) == keccak256(bytes("PENDING")), "Contract not pending");
        require(contract.farmerWallet == address(0), "Contract already accepted");
        require(contract.isBuyerInitiated, "Not a buyer-initiated contract");

        contract.farmerWallet = msg.sender;
        contract.status = "FUNDED";
        contract.escrowBalance -= contract.advanceAmount;

        payable(msg.sender).transfer(contract.advanceAmount);

        emit ContractStatusUpdated(_contractId, "FUNDED");
        emit FundsReleased(_contractId, contract.advanceAmount, msg.sender);
    }

    // Farmer confirms delivery
    function confirmDelivery(uint256 _contractId) public validContract(_contractId) {
        ContractDetails storage contract = contracts[_contractId];
        require(msg.sender == contract.farmerWallet, "Only farmer can confirm delivery");
        require(keccak256(bytes(contract.status)) == keccak256(bytes("FUNDED")), "Contract not funded");

        contract.farmerConfirmedDelivery = true;
        contract.status = "IN_PROGRESS";

        emit ContractStatusUpdated(_contractId, "IN_PROGRESS");
    }

    // Buyer confirms receipt (releases funds minus fee)
    function confirmReceipt(uint256 _contractId) public validContract(_contractId) {
        ContractDetails storage contract = contracts[_contractId];
        require(msg.sender == contract.buyerWallet, "Only buyer can confirm receipt");
        require(contract.farmerConfirmedDelivery, "Delivery not confirmed by farmer");
        require(keccak256(bytes(contract.status)) == keccak256(bytes("IN_PROGRESS")), "Contract not in progress");

        uint256 fee = (contract.amount * platformFeePercentage) / 100;
        uint256 farmerPayment = contract.escrowBalance - fee;

        contract.status = "COMPLETED";
        contract.escrowBalance = 0;
        accumulatedFees += fee;

        payable(contract.farmerWallet).transfer(farmerPayment);

        emit ContractStatusUpdated(_contractId, "COMPLETED");
        emit FundsReleased(_contractId, farmerPayment, contract.farmerWallet);
    }

    // Either party raises a dispute
    function raiseDispute(uint256 _contractId) public validContract(_contractId) {
        ContractDetails storage contract = contracts[_contractId];
        require(
            msg.sender == contract.farmerWallet || msg.sender == contract.buyerWallet,
            "Only contract parties can raise dispute"
        );
        require(
            keccak256(bytes(contract.status)) != keccak256(bytes("COMPLETED")) &&
            keccak256(bytes(contract.status)) != keccak256(bytes("CANCELLED")),
            "Contract already finalized"
        );

        contract.status = "DISPUTED";
        emit DisputeRaised(_contractId, msg.sender);
    }

    // Owner withdraws platform fees
    function withdrawPlatformFees(address payable _to) public onlyOwner {
        require(accumulatedFees > 0, "No fees to withdraw");
        uint256 amount = accumulatedFees;
        accumulatedFees = 0;

        _to.transfer(amount);
        emit PlatformFeesWithdrawn(amount, _to);
    }

    // Helper function to get contract details
    function getContractDetails(uint256 _contractId) public view validContract(_contractId) returns (ContractDetails memory) {
        return contracts[_contractId];
    }
}