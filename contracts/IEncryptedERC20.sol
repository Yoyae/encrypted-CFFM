// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "fhevm/lib/TFHE.sol";

interface IEncryptedERC20 {
    function transferFrom(address sender, address recipient, bytes calldata amount) external;

    function transferFrom(address sender, address recipient, euint32 amount) external;

    function transfer(address recipient, bytes calldata amount) external;

    function transfer(address recipient, euint32 amount) external;

    function approve(address spender, bytes calldata amount) external;

    function balanceOf(address account) external view returns (bytes memory);
}
