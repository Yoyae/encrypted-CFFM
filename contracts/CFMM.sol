// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "fhevm/abstracts/EIP712WithModifier.sol";
import "fhevm/lib/TFHE.sol";
import "./IEncryptedERC20.sol";

/**
 * @title CFMM (Constant Function Market Maker) Contract
 * @dev This contract implements a encrypted liquidity pool where you can trade two tokens.
 */
contract CFMM is EIP712WithModifier {
    // Addresses of the two tokens to be traded
    address public tokenA;
    address public tokenB;

    // Reserve amounts for tokenA and tokenB (encrypted)
    euint32 internal reserveA;
    euint32 internal reserveB;

    // Encrypted constant product of the reserves (invariant in a constant function market maker)
    euint32 internal constantProduct;

    // Swap fee in % (400 = 4%)
    uint public fee;
    uint public constant FEE_PERCENT = 10000;

    // Balance of fees of tokenA and tokenB
    euint32 internal balanceFeeTokenA;
    euint32 internal balanceFeeTokenB;

    // Address of the contract owner
    address public contractOwner;

    /**
     * @dev Modifier to restrict access to only the contract owner.
     */
    modifier onlyContractOwner() {
        require(msg.sender == contractOwner, "Only the contract owner");
        _;
    }

    /**
     * @dev Constructor to initialize the CFMM contract with token addresses.
     * @param _tokenA Address of the first token.
     * @param _tokenB Address of the second token.
     */
    constructor(address _tokenA, address _tokenB, uint _fee) EIP712WithModifier("Authorization token", "1") {
        require(_tokenA != address(0), "Invalid tokenA address");
        require(_tokenB != address(0), "Invalid tokenB address");
        tokenA = _tokenA;
        tokenB = _tokenB;
        contractOwner = msg.sender;
        fee = _fee;
    }

    /**
     * @dev Function to add liquidity to the CFMM.
     * @param encryptedAmountA Encrypted amount of tokenA.
     * @param encryptedAmountB Encrypted amount of tokenB.
     */
    function addLiquidity(bytes calldata encryptedAmountA, bytes calldata encryptedAmountB) external {
        // Validate the input amounts
        euint32 amountA = TFHE.asEuint32(encryptedAmountA);
        require(TFHE.decrypt(TFHE.gt(amountA, 0)), "AmountA must be > 0");
        euint32 amountB = TFHE.asEuint32(encryptedAmountB);
        require(TFHE.decrypt(TFHE.gt(amountB, 0)), "AmountB must be > 0");

        // Check for overflow when adding to reserves
        require(TFHE.decrypt(TFHE.ge(amountA + amountB, amountA)), "Overflow check failed");
        require(TFHE.decrypt(TFHE.ge(amountA + amountB, amountB)), "Overflow check failed");

        // Update reserveA and reserveB
        reserveA = reserveA + amountA;
        reserveB = reserveB + amountB;

        // Update constantProduct
        constantProduct = reserveA * reserveB;

        // Transfer tokens from the sender to the contract
        IEncryptedERC20(tokenA).transferFrom(msg.sender, address(this), encryptedAmountA);
        IEncryptedERC20(tokenB).transferFrom(msg.sender, address(this), encryptedAmountB);
    }

    /**
     * @dev Function to swap tokenA for tokenB.
     * @param encryptedAmountAIn Encrypted amount of tokenA to swap.
     */
    function swapAtoB(bytes calldata encryptedAmountAIn) external {
        // Validate the input amount
        euint32 amountAIn = TFHE.asEuint32(encryptedAmountAIn);
        require(TFHE.decrypt(TFHE.gt(amountAIn, 0)), "AmountAIn must be > 0");

        // Calculate the amount of tokenB to be received and validate it
        euint32 amountBOut = getAmountBOut(amountAIn);
        require(TFHE.decrypt(TFHE.gt(amountBOut, 0)), "AmountBOut must be > 0");

        // Check for overflow and underflow
        require(TFHE.decrypt(TFHE.ge(amountAIn + reserveA, reserveA)), "Overflow failed");
        require(TFHE.decrypt(TFHE.le(amountBOut, reserveB)), "Underflow failed");

        // Update reserves
        reserveA = reserveA + amountAIn;
        reserveB = reserveB - amountBOut;

        // Ensure reserveB remains positive
        require(TFHE.decrypt(TFHE.ge(reserveB, 1)), "ReserveB must be > 0");

        // Fees calculation
        euint32 amountOfFee = TFHE.asEuint32((TFHE.decrypt(amountBOut) * fee) / FEE_PERCENT);

        // Update balance fee of token B
        balanceFeeTokenB = balanceFeeTokenB + amountOfFee;

        // Transfer tokens
        IEncryptedERC20(tokenA).transferFrom(msg.sender, address(this), encryptedAmountAIn);
        IEncryptedERC20(tokenB).transfer(msg.sender, amountBOut - amountOfFee);
    }

    /**
     * @dev Function to swap tokenB for tokenA.
     * @param encryptedAmountBIn Encrypted amount of tokenB to swap.
     */
    function swapBtoA(bytes calldata encryptedAmountBIn) external {
        // Validate the input amount
        euint32 amountBIn = TFHE.asEuint32(encryptedAmountBIn);
        require(TFHE.decrypt(TFHE.gt(amountBIn, 0)), "AmountBIn must be > 0");

        // Calculate the amount of tokenA to be received
        euint32 amountAOut = getAmountAOut(amountBIn);
        require(TFHE.decrypt(TFHE.gt(amountAOut, 0)), "AmountAOut must be > 0");

        // Check for overflow and underflow
        require(TFHE.decrypt(TFHE.ge(amountBIn + reserveB, reserveB)), "Overflow failed");
        require(TFHE.decrypt(TFHE.le(amountAOut, reserveA)), "Underflow failed");

        // Update reserves
        reserveB = reserveB + amountBIn;
        reserveA = reserveA - amountAOut;

        // Ensure reserveA remains positive
        require(TFHE.decrypt(TFHE.ge(reserveA, 1)), "ReserveA must be > 0");

        // Fees calculation
        euint32 amountOfFee = TFHE.asEuint32((TFHE.decrypt(amountAOut) * fee) / FEE_PERCENT);

        // Update balance fee of token B
        balanceFeeTokenB = balanceFeeTokenB + amountOfFee;

        // Transfer tokens
        IEncryptedERC20(tokenB).transferFrom(msg.sender, address(this), encryptedAmountBIn);
        IEncryptedERC20(tokenA).transfer(msg.sender, amountAOut - amountOfFee);
    }

    /**
     * @dev Function to withdraw fee tokens
     * @param to address to receive tokens fee.
     */
    function withdrawFee(address to) external onlyContractOwner {
        // Balance needs to be > 0
        require(
            TFHE.decrypt(TFHE.gt(balanceFeeTokenA | balanceFeeTokenB, 0)),
            "balanceFeeTokenA or balanceFeeTokenB must be > 0"
        );

        // Using temp variables then reset state variable to avoid reentrancy
        euint32 tempBalanceFeeTokenA = balanceFeeTokenA;
        euint32 tempBalanceFeeTokenB = balanceFeeTokenB;

        balanceFeeTokenA = TFHE.asEuint32(0);
        balanceFeeTokenB = TFHE.asEuint32(0);

        IEncryptedERC20(tokenA).transfer(to, tempBalanceFeeTokenA);
        IEncryptedERC20(tokenB).transfer(to, tempBalanceFeeTokenB);
    }

    /**
     * @dev Function to calculate the amount of tokenB to receive for a given amount of tokenA.
     * @param amountAIn Amount of tokenA.
     * @return Amount of tokenB to receive.
     */
    function getAmountBOut(euint32 amountAIn) internal view returns (euint32) {
        // Validate the input amount
        require(TFHE.decrypt(TFHE.gt(amountAIn, 0)), "AmountAIn must be > 0");

        // Calculate new reserveA after the swap
        euint32 newReserveA = reserveA + amountAIn;

        // Calculate the corresponding amount of tokenB
        euint32 newReserveB = TFHE.asEuint32(TFHE.decrypt(constantProduct) / TFHE.decrypt(newReserveA));
        euint32 amountBOut = reserveB - newReserveB;

        return amountBOut;
    }

    /**
     * @dev Function to calculate the amount of tokenA to receive for a given amount of tokenB.
     * @param amountBIn Amount of tokenB.
     * @return Amount of tokenA to receive.
     */
    function getAmountAOut(euint32 amountBIn) internal view returns (euint32) {
        // Validate the input amount
        require(TFHE.decrypt(TFHE.gt(amountBIn, 0)), "AmountBIn must be > 0");

        // Calculate new reserveB after the swap
        euint32 newReserveB = reserveB + amountBIn;

        // Calculate the corresponding amount of tokenA
        euint32 newReserveA = TFHE.asEuint32(TFHE.decrypt(constantProduct) / TFHE.decrypt(newReserveB));
        euint32 amountAOut = reserveA - newReserveA;

        return amountAOut;
    }

    /**
     * @dev Function to retrieve the reserve amount of tokenA (onlyOwner).
     * @param publicKey Public key for reencryption.
     * @param signature Signature for authentication.
     * @return Encrypted (with passed publicKey) reserve amount of tokenA.
     */
    function getReserveA(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
        return TFHE.reencrypt(reserveA, publicKey, 0);
    }

    /**
     * @dev Function to retrieve the reserve amount of tokenB (onlyOwner).
     * @param publicKey Public key for reencryption.
     * @param signature Signature for authentication.
     * @return Encrypted (with passed publicKey) reserve amount of tokenB.
     */
    function getReserveB(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
        return TFHE.reencrypt(reserveB, publicKey, 0);
    }

    /**
     * @dev Function to retrieve the constant product (onlyOwner).
     * @param publicKey Public key for reencryption.
     * @param signature Signature for authentication.
     * @return Encrypted (with passed publicKey) constant product.
     */
    function getConstantProduct(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
        return TFHE.reencrypt(constantProduct, publicKey, 0);
    }

    /**
     * @dev Function to retrieve the fee balances (tokenA and tokenB) (onlyOwner).
     * @param publicKey Public key for reencryption.
     * @param signature Signature for authentication.
     * @return Encrypted (with passed publicKey) tokenA and tokenB fee balances.
     */
    function getFeeBalances(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory, bytes memory) {
        return (TFHE.reencrypt(balanceFeeTokenA, publicKey, 0), TFHE.reencrypt(balanceFeeTokenB, publicKey, 0));
    }
}
