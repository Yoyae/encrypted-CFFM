// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "fhevm/abstracts/EIP712WithModifier.sol";
import "fhevm/lib/TFHE.sol";
import "./IEncryptedERC20.sol";

/**
 * @title CFMM (Constant Function Market Maker) Contract
 * @dev This contract implements an encrypted liquidity pool where you can trade two tokens.
 */
contract CFMM is EIP712WithModifier {
    // Addresses of the two tokens to be traded
    // @dev Address of tokenA
    address public tokenA;

    // @dev Address of tokenB
    address public tokenB;

    // @dev Address of the contract owner
    address public contractOwner;

    // Swap fee in % (400 = 4%)
    // @dev Swap fee percentage
    uint public fee;

    // @dev Constant representing 100% for fee calculations
    uint public constant FEE_PERCENT = 10000;

    // Reserve amounts for tokenA and tokenB (encrypted)
    // @dev Encrypted reserve amount for tokenA
    euint32 internal reserveA;

    // @dev Encrypted reserve amount for tokenB
    euint32 internal reserveB;

    // Encrypted constant product of the reserves (invariant in a constant function market maker)
    // @dev Encrypted constant product of the reserves
    euint32 internal constantProduct;

    // @dev Balance of fee tokens for tokenA
    euint32 internal balanceFeeTokenA;

    // @dev Balance of fee tokens for tokenB
    euint32 internal balanceFeeTokenB;

    // Pair token for swap
    // @dev Enum representing the pair of tokens for swap
    enum TokenPair {
        TokenA_TokenB,
        TokenB_TokenA
    }
    /**
     * @dev The amount passed doesn't passed the check (>0)
     */
    error InvalidAmount();

    /**
     * @dev Calculation leads to an overflow
     */
    error OverflowError();

    /**
     * @dev Calculation leads to an underflow
     */
    error UnderflowError();

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error UnauthorizedAccount(address account);

    /**
     * @dev The caller account is not authorized to perform an operation.
     */
    error InvalidAddress(address account);

    /**
     * @dev Modifier to restrict access to only the contract owner.
     */
    modifier onlyContractOwner() {
        if (contractOwner != msg.sender) {
            revert UnauthorizedAccount(msg.sender);
        }
        _;
    }

    /**
     * @dev Constructor to initialize the CFMM contract with token addresses.
     * @param _tokenA Address of the first token.
     * @param _tokenB Address of the second token.
     */
    constructor(address _tokenA, address _tokenB, uint _fee) EIP712WithModifier("Authorization token", "1") {
        if (_tokenA == address(0)) {
            revert InvalidAddress(_tokenA);
        }
        if (_tokenB == address(0)) {
            revert InvalidAddress(address(0));
        }
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
        if (!TFHE.decrypt(TFHE.gt(amountA, 0))) {
            revert InvalidAmount();
        }
        euint32 amountB = TFHE.asEuint32(encryptedAmountB);
        if (!TFHE.decrypt(TFHE.gt(amountB, 0))) {
            revert InvalidAmount();
        }

        // Check for overflow when adding to reserves
        if (!TFHE.decrypt(TFHE.ge(amountA + amountB, amountA))) {
            revert OverflowError();
        }
        if (!TFHE.decrypt(TFHE.ge(amountA + amountB, amountB))) {
            revert OverflowError();
        }

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
     * @dev Function to swap token.
     * @param pair The pair of tokens to swap.
     * @param encryptedAmountIn Encrypted amount of tokenA to swap.
     */
    function swap(TokenPair pair, bytes calldata encryptedAmountIn) external {
        // Validate the input amount
        euint32 amountIn = TFHE.asEuint32(encryptedAmountIn);
        if (!TFHE.decrypt(TFHE.gt(amountIn, 0))) {
            revert InvalidAmount();
        }

        if (pair == TokenPair.TokenA_TokenB) {
            _swapAtoB(amountIn);
        } else if (pair == TokenPair.TokenB_TokenA) {
            _swapBtoA(amountIn);
        }
    }

    /**
     * @dev Function to withdraw fee tokens
     * @param to address to receive tokens fee.
     */
    function withdrawFee(address to) external onlyContractOwner {
        // Balance needs to be > 0
        if (!TFHE.decrypt(TFHE.gt(balanceFeeTokenA | balanceFeeTokenB, 0))) {
            revert InvalidAmount();
        }

        // Using temp variables then reset state variable to avoid reentrancy
        euint32 tempBalanceFeeTokenA = balanceFeeTokenA;
        euint32 tempBalanceFeeTokenB = balanceFeeTokenB;

        balanceFeeTokenA = TFHE.asEuint32(0);
        balanceFeeTokenB = TFHE.asEuint32(0);

        IEncryptedERC20(tokenA).transfer(to, tempBalanceFeeTokenA);
        IEncryptedERC20(tokenB).transfer(to, tempBalanceFeeTokenB);
    }

    /**
     * @dev Internal function to swap tokenA for tokenB.
     * @param amountAIn Encrypted amount of tokenA to swap.
     */
    function _swapAtoB(euint32 amountAIn) internal {
        // Calculate the amount of tokenB to be received and validate it
        euint32 amountBOut = _getAmountBOut(amountAIn);
        if (!TFHE.decrypt(TFHE.gt(amountBOut, 0))) {
            revert InvalidAmount();
        }

        // Check for overflow and underflow
        if (!TFHE.decrypt(TFHE.ge(amountAIn + reserveA, reserveA))) {
            revert OverflowError();
        }
        if (!TFHE.decrypt(TFHE.le(amountBOut, reserveB))) {
            revert UnderflowError();
        }

        // Update reserves
        reserveA = reserveA + amountAIn;
        reserveB = reserveB - amountBOut;

        // Ensure reserveB remains positive
        if (!TFHE.decrypt(TFHE.gt(reserveB, 0))) {
            revert InvalidAmount();
        }

        // Fees calculation
        euint32 amountOfFee = TFHE.asEuint32((TFHE.decrypt(amountBOut) * fee) / FEE_PERCENT);

        // Update balance fee of token B
        balanceFeeTokenB = balanceFeeTokenB + amountOfFee;

        // Transfer tokens
        IEncryptedERC20(tokenA).transferFrom(msg.sender, address(this), amountAIn);
        IEncryptedERC20(tokenB).transfer(msg.sender, amountBOut - amountOfFee);
    }

    /**
     * @dev Internal function to swap tokenB for tokenA.
     * @param amountBIn Encrypted amount of tokenB to swap.
     */
    function _swapBtoA(euint32 amountBIn) internal {
        // Calculate the amount of tokenA to be received
        euint32 amountAOut = _getAmountAOut(amountBIn);
        if (!TFHE.decrypt(TFHE.gt(amountAOut, 0))) {
            revert InvalidAmount();
        }

        // Check for overflow and underflow
        if (!TFHE.decrypt(TFHE.ge(amountBIn + reserveB, reserveB))) {
            revert OverflowError();
        }
        if (!TFHE.decrypt(TFHE.le(amountAOut, reserveA))) {
            revert UnderflowError();
        }

        // Update reserves
        reserveB = reserveB + amountBIn;
        reserveA = reserveA - amountAOut;

        // Ensure reserveA remains positive
        if (!TFHE.decrypt(TFHE.ge(reserveA, 1))) {
            revert InvalidAmount();
        }

        // Fees calculation
        euint32 amountOfFee = TFHE.asEuint32((TFHE.decrypt(amountAOut) * fee) / FEE_PERCENT);

        // Update balance fee of token A
        balanceFeeTokenA = balanceFeeTokenA + amountOfFee;

        // Transfer tokens
        IEncryptedERC20(tokenB).transferFrom(msg.sender, address(this), amountBIn);
        IEncryptedERC20(tokenA).transfer(msg.sender, amountAOut - amountOfFee);
    }

    /**
     * @dev Internal function to calculate the amount of tokenB to receive for a given amount of tokenA.
     * @param amountAIn Amount of tokenA.
     * @return Amount of tokenB to receive.
     */
    function _getAmountBOut(euint32 amountAIn) internal view returns (euint32) {
        // Validate the input amount
        if (!TFHE.decrypt(TFHE.gt(amountAIn, 0))) {
            revert InvalidAmount();
        }

        // Calculate new reserveA after the swap
        euint32 newReserveA = reserveA + amountAIn;

        // Calculate the corresponding amount of tokenB
        euint32 newReserveB = TFHE.asEuint32(TFHE.decrypt(constantProduct) / TFHE.decrypt(newReserveA));
        euint32 amountBOut = reserveB - newReserveB;

        return amountBOut;
    }

    /**
     * @dev Internal function to calculate the amount of tokenA to receive for a given amount of tokenB.
     * @param amountBIn Amount of tokenB.
     * @return Amount of tokenA to receive.
     */
    function _getAmountAOut(euint32 amountBIn) internal view returns (euint32) {
        // Validate the input amount
        if (!TFHE.decrypt(TFHE.gt(amountBIn, 0))) {
            revert InvalidAmount();
        }

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
    ) external view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
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
    ) external view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
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
    ) external view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
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
    ) external view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory, bytes memory) {
        return (TFHE.reencrypt(balanceFeeTokenA, publicKey, 0), TFHE.reencrypt(balanceFeeTokenB, publicKey, 0));
    }
}
