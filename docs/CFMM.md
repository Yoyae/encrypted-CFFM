# Solidity API

## CFMM

_This contract implements a encrypted liquidity pool where you can trade two tokens._

### tokenA

```solidity
address tokenA
```

### tokenB

```solidity
address tokenB
```

### contractOwner

```solidity
address contractOwner
```

### fee

```solidity
uint256 fee
```

### FEE_PERCENT

```solidity
uint256 FEE_PERCENT
```

### reserveA

```solidity
euint32 reserveA
```

### reserveB

```solidity
euint32 reserveB
```

### constantProduct

```solidity
euint32 constantProduct
```

### balanceFeeTokenA

```solidity
euint32 balanceFeeTokenA
```

### balanceFeeTokenB

```solidity
euint32 balanceFeeTokenB
```

### TokenPair

```solidity
enum TokenPair {
  TokenA_TokenB,
  TokenB_TokenA
}
```

### onlyContractOwner

```solidity
modifier onlyContractOwner()
```

_Modifier to restrict access to only the contract owner._

### constructor

```solidity
constructor(address _tokenA, address _tokenB, uint256 _fee) public
```

_Constructor to initialize the CFMM contract with token addresses._

#### Parameters

| Name     | Type    | Description                  |
| -------- | ------- | ---------------------------- |
| \_tokenA | address | Address of the first token.  |
| \_tokenB | address | Address of the second token. |
| \_fee    | uint256 |                              |

### addLiquidity

```solidity
function addLiquidity(bytes encryptedAmountA, bytes encryptedAmountB) external
```

_Function to add liquidity to the CFMM._

#### Parameters

| Name             | Type  | Description                 |
| ---------------- | ----- | --------------------------- |
| encryptedAmountA | bytes | Encrypted amount of tokenA. |
| encryptedAmountB | bytes | Encrypted amount of tokenB. |

### swap

```solidity
function swap(enum CFMM.TokenPair pair, bytes encryptedAmountIn) external
```

_Function to swap token._

#### Parameters

| Name              | Type                | Description                         |
| ----------------- | ------------------- | ----------------------------------- |
| pair              | enum CFMM.TokenPair |                                     |
| encryptedAmountIn | bytes               | Encrypted amount of tokenA to swap. |

### withdrawFee

```solidity
function withdrawFee(address to) external
```

_Function to withdraw fee tokens_

#### Parameters

| Name | Type    | Description                    |
| ---- | ------- | ------------------------------ |
| to   | address | address to receive tokens fee. |

### \_swapAtoB

```solidity
function _swapAtoB(euint32 amountAIn) internal
```

_Internal function to swap tokenA for tokenB._

#### Parameters

| Name      | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| amountAIn | euint32 | Encrypted amount of tokenA to swap. |

### \_swapBtoA

```solidity
function _swapBtoA(euint32 amountBIn) internal
```

_Internal function to swap tokenB for tokenA._

#### Parameters

| Name      | Type    | Description                         |
| --------- | ------- | ----------------------------------- |
| amountBIn | euint32 | Encrypted amount of tokenB to swap. |

### \_getAmountBOut

```solidity
function _getAmountBOut(euint32 amountAIn) internal view returns (euint32)
```

_Internal function to calculate the amount of tokenB to receive for a given amount of tokenA._

#### Parameters

| Name      | Type    | Description       |
| --------- | ------- | ----------------- |
| amountAIn | euint32 | Amount of tokenA. |

#### Return Values

| Name | Type    | Description                  |
| ---- | ------- | ---------------------------- |
| [0]  | euint32 | Amount of tokenB to receive. |

### \_getAmountAOut

```solidity
function _getAmountAOut(euint32 amountBIn) internal view returns (euint32)
```

_Internal function to calculate the amount of tokenA to receive for a given amount of tokenB._

#### Parameters

| Name      | Type    | Description       |
| --------- | ------- | ----------------- |
| amountBIn | euint32 | Amount of tokenB. |

#### Return Values

| Name | Type    | Description                  |
| ---- | ------- | ---------------------------- |
| [0]  | euint32 | Amount of tokenA to receive. |

### getReserveA

```solidity
function getReserveA(bytes32 publicKey, bytes signature) external view returns (bytes)
```

_Function to retrieve the reserve amount of tokenA (onlyOwner)._

#### Parameters

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| publicKey | bytes32 | Public key for reencryption.  |
| signature | bytes   | Signature for authentication. |

#### Return Values

| Name | Type  | Description                                                 |
| ---- | ----- | ----------------------------------------------------------- |
| [0]  | bytes | Encrypted (with passed publicKey) reserve amount of tokenA. |

### getReserveB

```solidity
function getReserveB(bytes32 publicKey, bytes signature) external view returns (bytes)
```

_Function to retrieve the reserve amount of tokenB (onlyOwner)._

#### Parameters

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| publicKey | bytes32 | Public key for reencryption.  |
| signature | bytes   | Signature for authentication. |

#### Return Values

| Name | Type  | Description                                                 |
| ---- | ----- | ----------------------------------------------------------- |
| [0]  | bytes | Encrypted (with passed publicKey) reserve amount of tokenB. |

### getConstantProduct

```solidity
function getConstantProduct(bytes32 publicKey, bytes signature) external view returns (bytes)
```

_Function to retrieve the constant product (onlyOwner)._

#### Parameters

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| publicKey | bytes32 | Public key for reencryption.  |
| signature | bytes   | Signature for authentication. |

#### Return Values

| Name | Type  | Description                                         |
| ---- | ----- | --------------------------------------------------- |
| [0]  | bytes | Encrypted (with passed publicKey) constant product. |

### getFeeBalances

```solidity
function getFeeBalances(bytes32 publicKey, bytes signature) external view returns (bytes, bytes)
```

_Function to retrieve the fee balances (tokenA and tokenB) (onlyOwner)._

#### Parameters

| Name      | Type    | Description                   |
| --------- | ------- | ----------------------------- |
| publicKey | bytes32 | Public key for reencryption.  |
| signature | bytes   | Signature for authentication. |

#### Return Values

| Name | Type  | Description                                                       |
| ---- | ----- | ----------------------------------------------------------------- |
| [0]  | bytes | Encrypted (with passed publicKey) tokenA and tokenB fee balances. |
| [1]  | bytes |                                                                   |
