// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AgriculturalContract {
    address public owner;
    uint256 public contractCounter;
    uint256 public platformFeePercentage = 5; // 5% fee
    uint256 public confirmationPeriod = 7 days;
    uint256 public totalPlatformFees;

    enum ContractStatus { PENDING, FUNDED, IN_PROGRESS, COMPLETED, DISPUTED, RESOLVED }

    struct BasicDetails {
        uint256 contractId;
        address farmerWallet;
        address buyerWallet;
        string cropName;
        uint256 quantity;
        uint256 amount;
        uint256 advanceAmount;
        uint256 remainingAmount;
    }

    struct TimeDetails {
        uint256 startDate;
        uint256 endDate;
        uint256 confirmationDeadline;
    }

    struct DeliveryDetails {
        string deliveryMethod;
        string deliveryLocation;
        string additionalNotes;
    }

    struct StatusDetails {
        ContractStatus status;
        uint256 escrowBalance;
        bool farmerConfirmedDelivery;
        bool buyerConfirmedReceipt;
        bool isBuyerInitiated;
    }

    struct Contract {
        BasicDetails basic;
        TimeDetails time;
        DeliveryDetails delivery;
        StatusDetails status;
    }

    mapping(uint256 => Contract) public contracts;

    event ContractCreated(uint256 contractId, address indexed farmer, address indexed buyer, bool isBuyerInitiated);
    event ContractStatusUpdated(uint256 contractId, ContractStatus status);
    event FundsDeposited(uint256 contractId, uint256 amount);
    event FundsReleased(uint256 contractId, uint256 amount);
    event DisputeRaised(uint256 contractId, address indexed by);
    event DisputeResolved(uint256 contractId, bool payFarmer);
    event PlatformFeesWithdrawn(uint256 amount);
    event DebugValues(uint256 contractId, uint256 amount, uint256 advanceAmount, uint256 escrowBalance);

    constructor() {
        owner = msg.sender;
        contractCounter = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function createSellContract(
        string memory cropName,
        uint256 quantity,
        uint256 amount,
        uint256 startDate,
        uint256 endDate
    ) public {
        require(amount > 0, "Amount must be greater than 0");
        contractCounter++;
        uint256 contractId = contractCounter;
        contracts[contractId] = Contract({
            basic: BasicDetails({
                contractId: contractId,
                farmerWallet: msg.sender,
                buyerWallet: address(0),
                cropName: cropName,
                quantity: quantity,
                amount: amount,
                advanceAmount: (amount * 20) / 100, // 20% advance
                remainingAmount: (amount * 80) / 100 // 80% remaining
            }),
            time: TimeDetails({
                startDate: startDate,
                endDate: endDate,
                confirmationDeadline: 0
            }),
            delivery: DeliveryDetails({
                deliveryMethod: "",
                deliveryLocation: "",
                additionalNotes: ""
            }),
            status: StatusDetails({
                status: ContractStatus.PENDING,
                escrowBalance: 0,
                farmerConfirmedDelivery: false,
                buyerConfirmedReceipt: false,
                isBuyerInitiated: false
            })
        });

        emit ContractCreated(contractId, msg.sender, address(0), false);
        emit DebugValues(contractId, amount, (amount * 20) / 100, 0);
    }

    function createBuyContract(
        string memory cropName,
        uint256 quantity,
        uint256 amount,
        uint256 startDate,
        uint256 endDate,
        string memory deliveryMethod,
        string memory deliveryLocation,
        string memory additionalNotes
    ) public payable {
        require(amount > 0, "Amount must be greater than 0");
        require(msg.value == amount, "Incorrect ETH amount sent");
        contractCounter++;
        uint256 contractId = contractCounter;
        contracts[contractId] = Contract({
            basic: BasicDetails({
                contractId: contractId,
                farmerWallet: address(0),
                buyerWallet: msg.sender,
                cropName: cropName,
                quantity: quantity,
                amount: amount,
                advanceAmount: (amount * 20) / 100,
                remainingAmount: (amount * 80) / 100
            }),
            time: TimeDetails({
                startDate: startDate,
                endDate: endDate,
                confirmationDeadline: 0
            }),
            delivery: DeliveryDetails({
                deliveryMethod: deliveryMethod,
                deliveryLocation: deliveryLocation,
                additionalNotes: additionalNotes
            }),
            status: StatusDetails({
                status: ContractStatus.PENDING,
                escrowBalance: msg.value,
                farmerConfirmedDelivery: false,
                buyerConfirmedReceipt: false,
                isBuyerInitiated: true
            })
        });

        emit ContractCreated(contractId, address(0), msg.sender, true);
        emit DebugValues(contractId, amount, (amount * 20) / 100, msg.value);
    }

    function acceptSellContract(
        uint256 contractId,
        string memory deliveryMethod,
        string memory deliveryLocation,
        string memory additionalNotes
    ) public payable {
        Contract storage c = contracts[contractId];
        require(c.status.status == ContractStatus.PENDING, "Contract not pending");
        require(c.basic.buyerWallet == address(0), "Already accepted");
        require(msg.value == c.basic.amount, "Incorrect ETH amount sent");

        c.basic.buyerWallet = msg.sender;
        c.status.status = ContractStatus.FUNDED;
        c.status.escrowBalance = msg.value;
        c.delivery.deliveryMethod = deliveryMethod;
        c.delivery.deliveryLocation = deliveryLocation;
        c.delivery.additionalNotes = additionalNotes;

        emit ContractStatusUpdated(contractId, ContractStatus.FUNDED);
        emit FundsDeposited(contractId, msg.value);
    }

    function acceptBuyContract(uint256 contractId) public {
        Contract storage c = contracts[contractId];
        require(c.status.status == ContractStatus.PENDING, "Contract not pending");
        require(c.basic.farmerWallet == address(0), "Already accepted");
        require(c.basic.advanceAmount > 0, "Advance amount must be greater than 0");
        require(c.status.escrowBalance >= c.basic.advanceAmount, "Insufficient escrow balance");

        c.basic.farmerWallet = msg.sender;
        c.status.status = ContractStatus.FUNDED;
        uint256 advance = c.basic.advanceAmount;
        (bool sent, ) = msg.sender.call{value: advance}("");
        require(sent, "Failed to send advance");
        c.status.escrowBalance -= advance;

        emit ContractStatusUpdated(contractId, ContractStatus.FUNDED);
        emit FundsReleased(contractId, advance);
        emit DebugValues(contractId, c.basic.amount, advance, c.status.escrowBalance);
    }

    function confirmDelivery(uint256 contractId) public {
        Contract storage c = contracts[contractId];
        require(c.basic.farmerWallet == msg.sender, "Only farmer can confirm delivery");
        require(c.status.status == ContractStatus.FUNDED, "Contract not funded");
        c.status.farmerConfirmedDelivery = true;
        c.status.status = ContractStatus.IN_PROGRESS;
        c.time.confirmationDeadline = block.timestamp + confirmationPeriod;

        emit ContractStatusUpdated(contractId, ContractStatus.IN_PROGRESS);
    }

    function confirmReceipt(uint256 contractId) public {
        Contract storage c = contracts[contractId];
        require(c.basic.buyerWallet == msg.sender, "Only buyer can confirm receipt");
        require(c.status.status == ContractStatus.IN_PROGRESS, "Contract not in progress");
        require(c.status.farmerConfirmedDelivery, "Delivery not confirmed by farmer");
        c.status.buyerConfirmedReceipt = true;
        c.status.status = ContractStatus.COMPLETED;

        uint256 platformFee = (c.basic.amount * platformFeePercentage) / 100;
        uint256 farmerAmount = c.status.escrowBalance - platformFee;
        totalPlatformFees += platformFee;
        c.status.escrowBalance = 0;

        (bool sent, ) = c.basic.farmerWallet.call{value: farmerAmount}("");
        require(sent, "Failed to send funds to farmer");

        emit ContractStatusUpdated(contractId, ContractStatus.COMPLETED);
        emit FundsReleased(contractId, farmerAmount);
    }

    function claimRemainingAfterTimeout(uint256 contractId) public {
        Contract storage c = contracts[contractId];
        require(c.basic.farmerWallet == msg.sender, "Only farmer can claim");
        require(c.status.status == ContractStatus.IN_PROGRESS, "Contract not in progress");
        require(c.time.confirmationDeadline != 0 && block.timestamp > c.time.confirmationDeadline, "Confirmation period not expired");
        require(!c.status.buyerConfirmedReceipt, "Receipt already confirmed");

        c.status.status = ContractStatus.COMPLETED;
        uint256 platformFee = (c.basic.amount * platformFeePercentage) / 100;
        uint256 farmerAmount = c.status.escrowBalance - platformFee;
        totalPlatformFees += platformFee;
        c.status.escrowBalance = 0;

        (bool sent, ) = msg.sender.call{value: farmerAmount}("");
        require(sent, "Failed to send remaining funds");

        emit ContractStatusUpdated(contractId, ContractStatus.COMPLETED);
        emit FundsReleased(contractId, farmerAmount);
    }

    function raiseDispute(uint256 contractId) public {
        Contract storage c = contracts[contractId];
        require(c.basic.farmerWallet == msg.sender || c.basic.buyerWallet == msg.sender, "Only parties can raise dispute");
        require(c.status.status == ContractStatus.FUNDED || c.status.status == ContractStatus.IN_PROGRESS, "Invalid status for dispute");
        c.status.status = ContractStatus.DISPUTED;

        emit DisputeRaised(contractId, msg.sender);
        emit ContractStatusUpdated(contractId, ContractStatus.DISPUTED);
    }

    function resolveDispute(uint256 contractId, bool payFarmer) public onlyOwner {
        Contract storage c = contracts[contractId];
        require(c.status.status == ContractStatus.DISPUTED, "Contract not disputed");
        c.status.status = ContractStatus.RESOLVED;

        if (payFarmer) {
            uint256 platformFee = (c.basic.amount * platformFeePercentage) / 100;
            uint256 farmerAmount = c.status.escrowBalance - platformFee;
            totalPlatformFees += platformFee;
            c.status.escrowBalance = 0;
            (bool sent, ) = c.basic.farmerWallet.call{value: farmerAmount}("");
            require(sent, "Failed to send funds to farmer");
            emit FundsReleased(contractId, farmerAmount);
        } else {
            (bool sent, ) = c.basic.buyerWallet.call{value: c.status.escrowBalance}("");
            require(sent, "Failed to refund buyer");
            c.status.escrowBalance = 0;
            emit FundsReleased(contractId, c.status.escrowBalance);
        }

        emit DisputeResolved(contractId, payFarmer);
        emit ContractStatusUpdated(contractId, ContractStatus.RESOLVED);
    }

    function withdrawPlatformFees() public onlyOwner {
        uint256 amount = totalPlatformFees;
        totalPlatformFees = 0;
        (bool sent, ) = owner.call{value: amount}("");
        require(sent, "Failed to withdraw fees");
        emit PlatformFeesWithdrawn(amount);
    }

    function getContractDetails(uint256 contractId) public view returns (
        BasicDetails memory basic,
        TimeDetails memory time,
        DeliveryDetails memory delivery,
        StatusDetails memory status
    ) {
        Contract storage c = contracts[contractId];
        return (c.basic, c.time, c.delivery, c.status);
    }
}