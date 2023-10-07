# Solidity API

## EncryptedERC20

### name

```solidity
string name
```

### symbol

```solidity
string symbol
```

### decimals

```solidity
uint8 decimals
```

### balances

```solidity
mapping(address => euint32) balances
```

### allowances

```solidity
mapping(address => mapping(address => euint32)) allowances
```

### contractOwner

```solidity
address contractOwner
```

### constructor

```solidity
constructor(string _name, string _symbol) public
```

### mint

```solidity
function mint(bytes encryptedAmount) public
```

### transfer

```solidity
function transfer(address to, bytes encryptedAmount) public
```

### transfer

```solidity
function transfer(address to, euint32 amount) public
```

### getTotalSupply

```solidity
function getTotalSupply(bytes32 publicKey, bytes signature) public view returns (bytes)
```

### balanceOf

```solidity
function balanceOf(bytes32 publicKey, bytes signature) public view returns (bytes)
```

### approve

```solidity
function approve(address spender, bytes encryptedAmount) public
```

### allowance

```solidity
function allowance(address spender, bytes32 publicKey, bytes signature) public view returns (bytes)
```

### transferFrom

```solidity
function transferFrom(address from, address to, bytes encryptedAmount) public
```

### transferFrom

```solidity
function transferFrom(address from, address to, euint32 amount) public
```

### \_approve

```solidity
function _approve(address owner, address spender, euint32 amount) internal
```

### \_allowance

```solidity
function _allowance(address owner, address spender) internal view returns (euint32)
```

### \_updateAllowance

```solidity
function _updateAllowance(address owner, address spender, euint32 amount) internal
```

### \_transfer

```solidity
function _transfer(address from, address to, euint32 amount) internal
```

### onlyContractOwner

```solidity
modifier onlyContractOwner()
```
