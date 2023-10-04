// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function approve(address spender, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);
}

contract CFMM {
    address public tokenA;
    address public tokenB;
    uint256 public reserveA;
    uint256 public reserveB;

    event SwapAtoB(address indexed sender, uint256 amountAIn, uint256 amountBOut);
    event SwapBtoA(address indexed sender, uint256 amountBIn, uint256 amountAOut);

    constructor(address _tokenA, address _tokenB) {
        tokenA = _tokenA;
        tokenB = _tokenB;
    }

    // Function to add liquidity
    function addLiquidity(uint256 amountA, uint256 amountB) external {
        require(IERC20(tokenA).transferFrom(msg.sender, address(this), amountA), "Transfer of tokenA failed");
        require(IERC20(tokenB).transferFrom(msg.sender, address(this), amountB), "Transfer of tokenB failed");

        reserveA += amountA;
        reserveB += amountB;
    }

    // Function to swap tokenA to tokenB
    function swapAtoB(uint256 amountAIn) external {
        require(amountAIn > 0, "AmountAIn must be greater than 0");

        uint256 amountBOut = getAmountBOut(amountAIn);
        require(amountBOut > 0, "AmountBOut must be greater than 0");

        require(IERC20(tokenA).transferFrom(msg.sender, address(this), amountAIn), "Transfer of tokenA failed");
        require(IERC20(tokenB).transfer(msg.sender, amountBOut), "Transfer of tokenB failed");

        reserveA += amountAIn;
        reserveB -= amountBOut;

        emit SwapAtoB(msg.sender, amountAIn, amountBOut);
    }

    // Function to swap tokenB to tokenA
    function swapBtoA(uint256 amountBIn) external {
        require(amountBIn > 0, "amountBIn must be greater than 0");

        uint256 amountAOut = getAmountAOut(amountBIn);
        require(amountAOut > 0, "amountAOut must be greater than 0");

        require(IERC20(tokenB).transferFrom(msg.sender, address(this), amountBIn), "Transfer of tokenB failed");
        require(IERC20(tokenA).transfer(msg.sender, amountAOut), "Transfer of tokenA failed");

        reserveB -= amountBIn;
        reserveA -= amountAOut;

        emit SwapBtoA(msg.sender, amountBIn, amountAOut);
    }

    // Function to calculate tokenB amount to withdraw based on tokenA
    function getAmountBOut(uint256 amountAIn) public view returns (uint256) {
        require(amountAIn > 0, "AmountAIn must be greater than 0");

        uint256 constantProduct = reserveA * reserveB;
        uint256 newReserveA = reserveA + amountAIn;
        uint256 newReserveB = constantProduct / newReserveA;

        uint256 amountBOut = reserveB - newReserveB;
        return amountBOut;
    }

    // Function to calculate tokenA amount to withdraw based on tokenB
    function getAmountAOut(uint256 amountBIn) public view returns (uint256) {
        require(amountBIn > 0, "amountBIn must be greater than 0");

        uint256 constantProduct = reserveA * reserveB;
        uint256 newReserveB = reserveB + amountBIn;
        uint256 newReserveA = constantProduct / newReserveB;

        uint256 amountAOut = reserveA - newReserveA;
        return amountAOut;
    }
}
