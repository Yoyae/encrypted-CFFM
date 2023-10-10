// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

// Importing the EncryptedERC20 contract which import TFHE.sol
import "fhevm/lib/TFHE.sol";

interface IEncryptedERC20 {
    function transferFrom(address sender, address recipient, bytes calldata amount) external;

    function transfer(address recipient, euint32 amount) external;

    function approve(address spender, bytes calldata amount) external;

    function balanceOf(address account) external view returns (bytes memory);
}
