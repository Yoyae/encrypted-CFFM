// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external;

    function transfer(address recipient, uint256 amount) external;

    function approve(address spender, uint256 amount) external;

    function balanceOf(address account) external view returns (uint256);
}

contract CFMM {
    // Addresses of the two tokens to be traded
    address public tokenA;
    address public tokenB;

    // Reserve amounts for tokenA and tokenB (encrypted)
    uint internal reserveA;
    uint internal reserveB;

    // Encrypted constant product of the reserves (invariant in a constant function market maker)
    uint internal constantProduct;

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
    constructor(address _tokenA, address _tokenB) {
        require(_tokenA != address(0), "Invalid tokenA address");
        require(_tokenB != address(0), "Invalid tokenB address");
        tokenA = _tokenA;
        tokenB = _tokenB;
        contractOwner = msg.sender;
    }

    /**
     * @dev Function to add liquidity to the CFMM.
     * @param encryptedAmountA Encrypted amount of tokenA.
     * @param encryptedAmountB Encrypted amount of tokenB.
     */
    function addLiquidity(uint encryptedAmountA, uint encryptedAmountB) external {
        // Validate the input amounts
        uint amountA = encryptedAmountA;
        require(amountA > 0, "AmountA must be > 0");
        uint amountB = encryptedAmountB;
        require(amountB > 0, "AmountB must be > 0");

        // Update reserveA and reserveB
        reserveA = reserveA + amountA;
        reserveB = reserveB + amountB;

        // Update constantProduct
        constantProduct = reserveA * reserveB;

        // Transfer tokens from the sender to the contract
        IERC20(tokenA).transferFrom(msg.sender, address(this), encryptedAmountA);
        IERC20(tokenB).transferFrom(msg.sender, address(this), encryptedAmountB);
    }

    /**
     * @dev Function to swap tokenA for tokenB.
     * @param encryptedAmountAIn Encrypted amount of tokenA to swap.
     */
    function swapAtoB(uint encryptedAmountAIn) external {
        // Validate the input amount
        uint amountAIn = encryptedAmountAIn;
        require(amountAIn > 0, "AmountAIn must be > 0");

        // Calculate the amount of tokenB to be received and validate it
        uint amountBOut = getAmountBOut(amountAIn);
        require(amountBOut > 0, "AmountBOut must be > 0");

        // Update reserves
        reserveA = reserveA + amountAIn;
        reserveB = reserveB - amountBOut;

        // Ensure reserveB remains positive
        require(reserveB >= 1, "ReserveB must be > 0");

        // Transfer tokens
        IERC20(tokenA).transferFrom(msg.sender, address(this), encryptedAmountAIn);
        IERC20(tokenB).transfer(msg.sender, amountBOut);
    }

    /**
     * @dev Function to swap tokenB for tokenA.
     * @param encryptedAmountBIn Encrypted amount of tokenB to swap.
     */
    function swapBtoA(uint encryptedAmountBIn) external {
        // Validate the input amount
        uint amountBIn = encryptedAmountBIn;
        require(amountBIn > 0, "AmountBIn must be > 0");

        // Calculate the amount of tokenA to be received
        uint amountAOut = getAmountAOut(amountBIn);
        require(amountAOut > 0, "AmountAOut must be > 0");

        // Update reserves
        reserveB = reserveB + amountBIn;
        reserveA = reserveA - amountAOut;

        // Ensure reserveA remains positive
        require(reserveA >= 1, "ReserveA must be > 0");

        // Transfer tokens
        IERC20(tokenB).transferFrom(msg.sender, address(this), encryptedAmountBIn);
        IERC20(tokenA).transfer(msg.sender, amountAOut);
    }

    /**
     * @dev Function to calculate the amount of tokenB to receive for a given amount of tokenA.
     * @param amountAIn Amount of tokenA.
     * @return Amount of tokenB to receive.
     */
    function getAmountBOut(uint amountAIn) internal view returns (uint) {
        // Validate the input amount
        require(amountAIn > 0, "AmountAIn must be > 0");

        // Calculate new reserveA after the swap
        uint newReserveA = reserveA + amountAIn;

        // Calculate the corresponding amount of tokenB
        uint newReserveB = constantProduct / newReserveA;
        uint amountBOut = reserveB - newReserveB;
        return amountBOut;
    }

    /**
     * @dev Function to calculate the amount of tokenA to receive for a given amount of tokenB.
     * @param amountBIn Amount of tokenB.
     * @return Amount of tokenA to receive.
     */
    function getAmountAOut(uint amountBIn) internal view returns (uint) {
        // Validate the input amount
        require(amountBIn > 0, "AmountBIn must be > 0");

        // Calculate new reserveB after the swap
        uint newReserveB = reserveB + amountBIn;

        // Calculate the corresponding amount of tokenA
        uint newReserveA = constantProduct / newReserveB;
        uint amountAOut = reserveA - newReserveA;
        return amountAOut;
    }

    /**
     * @dev Function to retrieve the reserve amount of tokenA (onlyOwner).
     * @return Encrypted (with passed publicKey) reserve amount of tokenA.
     */
    function getReserveA() external view onlyContractOwner returns (uint) {
        return reserveA;
    }

    /**
     * @dev Function to retrieve the reserve amount of tokenB (onlyOwner).
     * @return Encrypted (with passed publicKey) reserve amount of tokenB.
     */
    function getReserveB() external view onlyContractOwner returns (uint) {
        return reserveB;
    }

    /**
     * @dev Function to retrieve the constant product (onlyOwner).
     * @return Encrypted (with passed publicKey) constant product.
     */
    function getConstantProduct() external view onlyContractOwner returns (uint) {
        return constantProduct;
    }
}
