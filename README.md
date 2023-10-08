# CFMM (Constant Function Market Maker) - Zama Challenge [![Open in Gitpod][gitpod-badge]][gitpod] [![Github Actions][gha-badge]][gha] [![Hardhat][hardhat-badge]][hardhat] [![License: MIT][license-badge]][license]

[gitpod]: https://gitpod.io/#https://github.com/Yoyae/encrypted-CFFM
[gitpod-badge]: https://img.shields.io/badge/Gitpod-Open%20in%20Gitpod-FFB45B?logo=gitpod
[gha]: https://github.com/Yoyae/encrypted-CFFM/actions
[gha-badge]: https://github.com/Yoyae/encrypted-CFFM/actions/workflows/ci.yml/badge.svg
[hardhat]: https://hardhat.org/
[hardhat-badge]: https://img.shields.io/badge/Built%20with-Hardhat-FFDB1C.svg
[license]: https://opensource.org/licenses/MIT
[license-badge]: https://img.shields.io/badge/License-MIT-blue.svg

The CFMM (Constant Function Market Maker) contract is a liquidity pool. The contract provides functions for adding
liquidity to the pool, swapping tokenA for tokenB, and swapping tokenB for tokenA, all with encrypted input amounts.
Additionally, it offers methods for retrieving the current reserves of both tokens and the constant product, which
remains constant throughout trading, a fundamental concept in automated market makers. The contract is designed to
ensure security and control, with a contract owner having specific privileges, and it employs encryption techniques for
privacy resulting in avoiding front run attack !

Using hardhat template [here](https://github.com/zama-ai/fhevm-hardhat-template)

- [Hardhat](https://github.com/nomiclabs/hardhat): compile, run and test smart contracts
- [TypeChain](https://github.com/ethereum-ts/TypeChain): generate TypeScript bindings for smart contracts
- [Ethers](https://github.com/ethers-io/ethers.js/): renowned Ethereum library and wallet implementation
- [Solhint](https://github.com/protofire/solhint): code linter
- [Solcover](https://github.com/sc-forks/solidity-coverage): code coverage
- [Prettier Plugin Solidity](https://github.com/prettier-solidity/prettier-plugin-solidity): code formatter

## Usage

### Pre Requisites

Install [docker](https://docs.docker.com/engine/install/)

Install [pnpm](https://pnpm.io/installation)

Before being able to run any command, you need to create a `.env` file and set a BIP-39 compatible mnemonic as an
environment variable. You can follow the example in `.env.example`. If you don't already have a mnemonic, you can use
this [website](https://iancoleman.io/bip39/) to generate one.

Then, proceed with installing dependencies:

```sh
pnpm install
```

### Start fhevm

Start a local fhevm docker container that inlcudes everything needed to deploy FHE encrypted smart contracts

```sh
# In one terminal, keep it opened
# The node logs are printed
pnpm fhevm:start
```

To stop:

```sh
pnpm fhevm:stop
```

### Compile

Compile the smart contracts with Hardhat:

```sh
pnpm compile
```

### TypeChain

Compile the smart contracts and generate TypeChain bindings:

```sh
pnpm typechain
```

### List accounts

From the mnemonic in .env file, list all the derived Ethereum adresses:

```sh
pnpm task:accounts
```

### Get some native coins

In order to interact with the blockchain, one need some coins. This command will give coins to the first address derived
from the mnemonic in .env file.

```sh
pnpm fhevm:faucet
```

<br />
<details>
  <summary>To get the first derived address from mnemonic</summary>
<br />

```sh
pnpm task:getEthereumAddress
```

</details>
<br />

### Deploy

#### Local

Deploy the CFMM along with 2 EncryptedERC20 tokens to local network:

```sh
pnpm deploy:contracts
```

Notes: <br />

<details>
<summary>Error: cannot get the transaction for EncryptedERC20's previous deployment</summary>

One can delete the local folder in deployments:

```bash
rm -r deployments/local/
```

</details>

<details>
<summary>Info: by default, the local network is used</summary>

One can change the network, check [hardhat config file](./hardhat.config.ts).

</details>
<br />

#### Zama testnet

Deploy the CFMM along with 2 EncryptedERC20 tokens to zama network:

```sh
pnpm deploy:testnet
```

### Mint

All commands use --network local to address local network. For zama testnet, use --network zama.

Run the `mintTokenA` task on the local network which add token A balance on the specified account:

```sh
pnpm task:mintTokenA --network local --mint 1000 --account alice
```

Run the `mintTokenB` task on the local network which add token B balance on the specified account:

```sh
pnpm task:mintTokenB --network local --mint 1000 --account alice
```

### Add liquidity

Run the `addLiquidity` task on the local network :

```sh
pnpm task:addLiquidity --network local --reservea 10000 --reserveb 1000 --account alice
```

### Swap Token A

Run the `swapAtoB` task on the local network :

```sh
pnpm task:swapAtoB --network local --amount 100 --account alice
```

### Swap Token B

Run the `swapBtoA` task on the local network :

```sh
pnpm task:swapBtoA --network local --amount 100 --account alice
```

### Test

Run the tests with Hardhat:

```sh
pnpm test
```

And only the tests for CFMM :

```sh
pnpm test:CFFM
```

#### Test results

```bash
CFMM
    Liquidity test
      ✔ should add liquidity correctly (45093ms)
      ✔ should revert if 0 liquidity is provided (reserve A) (22076ms)
      ✔ should revert if 0 liquidity is provided (reserve B) (21704ms)
      ✔ should revert when overflowing reserveA (22333ms)
      ✔ should revert when overflowing reserveB (23398ms)
    Test Swap functionality
      Swap A to B
        ✔ should swap correctly (20801ms)
        ✔ should swap correctly at the limit (22470ms)
        ✔ should revert after the limit (17448ms)
        ✔ should revert if 0 token is provided (7469ms)
      Swap B to A
        ✔ should swap correctly (22959ms)
        ✔ should swap correctly at the limit (22333ms)
        ✔ should revert after the limit (16970ms)
        ✔ should revert if 0 token is provided (7623ms)
        ✔ should revert when a negative number is proposed (15625ms)
    Access control
      ✔ should revert when non admin calls getReserveA
      ✔ should revert when non admin calls getReserveB
      ✔ should revert when non admin calls getConstantProduct


  18 passing (20m)
```

### Lint Solidity

Lint the Solidity code:

```sh
pnpm lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
pnpm lint:ts
```

### Coverage

Generate the code coverage report:

```sh
pnpm coverage
```

### Report Gas

See the gas usage per unit test and average gas per method call:

```sh
REPORT_GAS=true pnpm test
```

### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
pnpm clean
```

### Tasks

#### Deploy EncryptedERC20

Deploy a new instance of the EncryptedERC20 contract via a task:

```sh
pnpm task:deployERC20
```

#### Deploy CFMM

Deploy a new instance of the CFMM contract via a task:

```sh
pnpm task:deployCFMM
```

## Tips

### Syntax Highlighting

If you use VSCode, you can get Solidity syntax highlighting with the
[hardhat-solidity](https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity) extension.

## Using GitPod

[GitPod](https://www.gitpod.io/) is an open-source developer platform for remote development.

To view the coverage report generated by `pnpm coverage`, just click `Go Live` from the status bar to turn the server
on/off.

## Local development with Docker

Please check Evmos repository to be able to build FhEVM from sources.

## License

This project is licensed under MIT.
