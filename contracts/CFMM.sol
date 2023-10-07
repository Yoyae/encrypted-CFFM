// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "./EncryptedERC20.sol";

contract CFMM is EIP712WithModifier {
    address public tokenA;
    address public tokenB;
    euint32 internal reserveA;
    euint32 internal reserveB;
    euint32 internal constantProduct;

    address public contractOwner;

    modifier onlyContractOwner() {
        require(msg.sender == contractOwner);
        _;
    }

    constructor(address _tokenA, address _tokenB) EIP712WithModifier("Authorization token", "1") {
        tokenA = _tokenA;
        tokenB = _tokenB;
        contractOwner = msg.sender;
    }

    // Function to add liquidity
    function addLiquidity(bytes calldata encryptedAmountA, bytes calldata encryptedAmountB) external {
        euint32 amountA = TFHE.asEuint32(encryptedAmountA);
        require(TFHE.decrypt(TFHE.gt(amountA, 0)));
        euint32 amountB = TFHE.asEuint32(encryptedAmountB);
        require(TFHE.decrypt(TFHE.gt(amountB, 0)));

        //check overflow
        require(TFHE.decrypt(TFHE.ge(amountA + amountB, amountA)));
        require(TFHE.decrypt(TFHE.ge(amountA + amountB, amountB)));

        EncryptedERC20(tokenA).transferFrom(msg.sender, address(this), encryptedAmountA);
        EncryptedERC20(tokenB).transferFrom(msg.sender, address(this), encryptedAmountB);

        reserveA = reserveA + amountA;
        reserveB = reserveB + amountB;

        constantProduct = reserveA * reserveB;
    }

    // Function to swap tokenA to tokenB
    function swapAtoB(bytes calldata encryptedAmountAIn) external {
        euint32 amountAIn = TFHE.asEuint32(encryptedAmountAIn);
        require(TFHE.decrypt(TFHE.gt(amountAIn, 0)));

        euint32 amountBOut = getAmountBOut(amountAIn);
        require(TFHE.decrypt(TFHE.gt(amountBOut, 0)));

        //overflow check
        require(TFHE.decrypt(TFHE.ge(amountAIn + reserveA, reserveA)));
        //underflow check
        require(TFHE.decrypt(TFHE.le(amountBOut, reserveB)));

        reserveA = reserveA + amountAIn;
        reserveB = reserveB - amountBOut;

        EncryptedERC20(tokenA).transferFrom(msg.sender, address(this), encryptedAmountAIn);
        EncryptedERC20(tokenB).transfer(msg.sender, amountBOut);
    }

    // Function to swap tokenA to tokenB
    function swapBtoA(bytes calldata encryptedAmountBIn) external {
        euint32 amountBIn = TFHE.asEuint32(encryptedAmountBIn);
        require(TFHE.decrypt(TFHE.gt(amountBIn, 0)));

        euint32 amountAOut = getAmountAOut(amountBIn);
        require(TFHE.decrypt(TFHE.gt(amountAOut, 0)));

        //overflow check
        require(TFHE.decrypt(TFHE.ge(amountBIn + reserveB, reserveB)));
        //underflow check
        require(TFHE.decrypt(TFHE.le(amountAOut, reserveA)));

        reserveB = reserveB + amountBIn;
        reserveA = reserveA - amountAOut;

        EncryptedERC20(tokenB).transferFrom(msg.sender, address(this), encryptedAmountBIn);
        EncryptedERC20(tokenA).transfer(msg.sender, amountAOut);
    }

    // Function to calculate tokenB amount to withdraw based on tokenA
    function getAmountBOut(euint32 amountAIn) internal view returns (euint32) {
        require(TFHE.decrypt(TFHE.gt(amountAIn, 0)));

        euint32 newReserveA = reserveA + amountAIn;

        // TFHE.div(constantProduct, TFHE.decrypt(newReserveA)); is not working (too much gas).
        // This is a temporary workaround
        euint32 newReserveB = TFHE.asEuint32(TFHE.decrypt(constantProduct) / TFHE.decrypt(newReserveA));

        euint32 amountBOut = reserveB - newReserveB;
        return amountBOut;
    }

    // Function to calculate tokenA amount to withdraw based on tokenB
    function getAmountAOut(euint32 amountBIn) internal view returns (euint32) {
        require(TFHE.decrypt(TFHE.gt(amountBIn, 0)));

        euint32 newReserveB = reserveB + amountBIn;

        // TFHE.div(constantProduct, TFHE.decrypt(newReserveB)); is not working (too much gas).
        // This is a temporary workaround
        euint32 newReserveA = TFHE.asEuint32(TFHE.decrypt(constantProduct) / TFHE.decrypt(newReserveB));

        euint32 amountAOut = reserveA - newReserveA;
        return amountAOut;
    }

    // Function to retreive reserveA (onlyOwner)
    function getReserveA(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
        return TFHE.reencrypt(reserveA, publicKey, 0);
    }

    // Function to retreive reserveB (onlyOwner)
    function getReserveB(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
        return TFHE.reencrypt(reserveB, publicKey, 0);
    }

    // Function to retreive constantProduct (onlyOwner)
    function getConstantProduct(
        bytes32 publicKey,
        bytes calldata signature
    ) public view onlySignedPublicKey(publicKey, signature) onlyContractOwner returns (bytes memory) {
        return TFHE.reencrypt(constantProduct, publicKey, 0);
    }
}
