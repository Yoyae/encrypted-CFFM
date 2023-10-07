# Solidity API

## CFMM

_This contract implements a decentralized exchange (DEX) for trading two tokens with encryption._

### tokenA

```solidity
address tokenA
```

### tokenB

```solidity
address tokenB
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

### contractOwner

```solidity
address contractOwner
```

### onlyContractOwner

```solidity
modifier onlyContractOwner()
```

_Modifier to restrict access to only the contract owner._

### constructor

```solidity
constructor(address _tokenA, address _tokenB) public
```

_Constructor to initialize the CFMM contract with token addresses._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenA | address | Address of the first token. |
| _tokenB | address | Address of the second token. |

### addLiquidity

```solidity
function addLiquidity(bytes encryptedAmountA, bytes encryptedAmountB) external
```

_Function to add liquidity to the CFMM._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmountA | bytes | Encrypted amount of tokenA. |
| encryptedAmountB | bytes | Encrypted amount of tokenB. |

### swapAtoB

```solidity
function swapAtoB(bytes encryptedAmountAIn) external
```

_Function to swap tokenA for tokenB._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmountAIn | bytes | Encrypted amount of tokenA to swap. |

### swapBtoA

```solidity
function swapBtoA(bytes encryptedAmountBIn) external
```

_Function to swap tokenB for tokenA._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| encryptedAmountBIn | bytes | Encrypted amount of tokenB to swap. |

### getAmountBOut

```solidity
function getAmountBOut(euint32 amountAIn) internal view returns (euint32)
```

_Function to calculate the amount of tokenB to receive for a given amount of tokenA._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountAIn | euint32 | Amount of tokenA. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint32 | Amount of tokenB to receive. |

### getAmountAOut

```solidity
function getAmountAOut(euint32 amountBIn) internal view returns (euint32)
```

_Function to calculate the amount of tokenA to receive for a given amount of tokenB._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amountBIn | euint32 | Amount of tokenB. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | euint32 | Amount of tokenA to receive. |

### getReserveA

```solidity
function getReserveA(bytes32 publicKey, bytes signature) public view returns (bytes)
```

_Function to retrieve the reserve amount of tokenA (onlyOwner)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| publicKey | bytes32 | Public key for reencryption. |
| signature | bytes | Signature for authentication. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes | Encrypted reserve amount of tokenA. |

### getReserveB

```solidity
function getReserveB(bytes32 publicKey, bytes signature) public view returns (bytes)
```

_Function to retrieve the reserve amount of tokenB (onlyOwner)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| publicKey | bytes32 | Public key for reencryption. |
| signature | bytes | Signature for authentication. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes | Encrypted reserve amount of tokenB. |

### getConstantProduct

```solidity
function getConstantProduct(bytes32 publicKey, bytes signature) public view returns (bytes)
```

_Function to retrieve the constant product (onlyOwner)._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| publicKey | bytes32 | Public key for reencryption. |
| signature | bytes | Signature for authentication. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bytes | Encrypted constant product. |

