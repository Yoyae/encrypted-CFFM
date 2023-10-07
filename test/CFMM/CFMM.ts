import { expect } from "chai";
import { ethers } from "hardhat";

import { deployEncryptedERC20Fixture } from "../encryptedERC20/EncryptedERC20.fixture";
import { createInstances } from "../instance";
import { getSigners } from "../signers";
import { createTransaction } from "../utils";
import { deployCFMMFixture } from "./CFMM.fixture";

describe("CFMM", function () {
  const MAX_UINT32 = 2 ** 32 / 2 - 1; //This is NOT a uint32 but a int32.
  const TOKENA_LIQUIDITY = 10000;
  const TOKENB_LIQUIDITY = 1000;

  beforeEach(async function () {
    this.signers = await getSigners(ethers);

    const contractTokenA = await deployEncryptedERC20Fixture("Naraggara", "NARA");
    this.tokenAAddress = await contractTokenA.getAddress();
    this.tokenA = contractTokenA;
    this.instancesTokenA = await createInstances(this.tokenAAddress, ethers, this.signers);

    //Mint some token A
    let encryptedAmount = this.instancesTokenA.alice.encrypt32(MAX_UINT32);
    let transaction = await createTransaction(this.tokenA.mint, encryptedAmount);
    await transaction.wait();

    const contractTokenB = await deployEncryptedERC20Fixture("Margaron", "MARG");
    this.tokenBAddress = await contractTokenB.getAddress();
    this.tokenB = contractTokenB;
    this.instancesTokenB = await createInstances(this.tokenBAddress, ethers, this.signers);

    //Mint some token B
    encryptedAmount = this.instancesTokenB.alice.encrypt32(MAX_UINT32);
    transaction = await createTransaction(this.tokenB.mint, encryptedAmount);
    await transaction.wait();

    const contractCFMM = await deployCFMMFixture(this.tokenAAddress, this.tokenBAddress);
    this.CFMMAddress = await contractCFMM.getAddress();
    this.cfmm = contractCFMM;
    this.instancesCFMM = await createInstances(this.CFMMAddress, ethers, this.signers);
    this.CFMMInstance = ethers.deployContract("CFMM");
  });

  describe("Liquidity test", function () {
    it("should add liquidity correctly", async function () {
      //Add liquidity
      const encryptedAmountA = this.instancesTokenA.alice.encrypt32(TOKENA_LIQUIDITY);
      const encryptedAmountB = this.instancesTokenB.alice.encrypt32(TOKENB_LIQUIDITY);

      let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountA);
      await transaction.wait();
      transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountB);
      await transaction.wait();

      transaction = await createTransaction(this.cfmm.addLiquidity, encryptedAmountA, encryptedAmountB);
      await transaction.wait();

      //Check token balances
      const tokenA = this.instancesTokenA.alice.getTokenSignature(this.tokenAAddress);
      const encryptedBalanceA = await this.tokenA.balanceOf(tokenA.publicKey, tokenA.signature);
      const balanceA = this.instancesTokenA.alice.decrypt(this.tokenAAddress, encryptedBalanceA);

      const tokenB = this.instancesTokenB.alice.getTokenSignature(this.tokenBAddress);
      const encryptedBalanceB = await this.tokenB.balanceOf(tokenB.publicKey, tokenB.signature);
      const balanceB = this.instancesTokenB.alice.decrypt(this.tokenBAddress, encryptedBalanceB);

      expect(balanceA).to.be.equal(MAX_UINT32 - TOKENA_LIQUIDITY);
      expect(balanceB).to.be.equal(MAX_UINT32 - TOKENB_LIQUIDITY);

      //Check reserves and constant product
      const signCFFMAlice = this.instancesCFMM.alice.getTokenSignature(this.CFMMAddress);
      const encryptedReserveA = await this.cfmm.getReserveA(signCFFMAlice.publicKey, signCFFMAlice.signature);
      const reserveA = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveA);

      const encryptedReserveB = await this.cfmm.getReserveB(signCFFMAlice.publicKey, signCFFMAlice.signature);
      const reserveB = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveB);

      const encryptedCP = await this.cfmm.getConstantProduct(signCFFMAlice.publicKey, signCFFMAlice.signature);
      const constantProduct = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedCP);

      expect(reserveA).to.be.equal(TOKENA_LIQUIDITY);
      expect(reserveB).to.be.equal(TOKENB_LIQUIDITY);
      expect(constantProduct).to.be.equal(TOKENA_LIQUIDITY * TOKENB_LIQUIDITY);
    });

    // avoid unnecessary operations
    it("should revert if 0 liquidity is provided (reserve A)", async function () {
      const encryptedAmountA = this.instancesTokenA.alice.encrypt32(1);
      const encryptedAmountB = this.instancesTokenB.alice.encrypt32(0);

      let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountA);
      await transaction.wait();
      transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountB);
      await transaction.wait();

      transaction = await createTransaction(this.cfmm.addLiquidity, encryptedAmountA, encryptedAmountB);
      await expect(transaction.wait()).to.be.reverted;
    });

    // avoid unnecessary operations
    it("should revert if 0 liquidity is provided (reserve B)", async function () {
      const encryptedAmountA = this.instancesTokenA.alice.encrypt32(0);
      const encryptedAmountB = this.instancesTokenB.alice.encrypt32(1);

      let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountA);
      await transaction.wait();
      transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountB);
      await transaction.wait();

      transaction = await createTransaction(this.cfmm.addLiquidity, encryptedAmountA, encryptedAmountB);
      await expect(transaction.wait()).to.be.reverted;
    });
    it("should revert when overflowing reserveA", async function () {
      const encryptedAmountA = this.instancesTokenA.alice.encrypt32(MAX_UINT32 + 1);
      const encryptedAmountB = this.instancesTokenB.alice.encrypt32(1);

      let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountA);
      await transaction.wait();
      transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountB);
      await transaction.wait();

      transaction = await createTransaction(this.cfmm.addLiquidity, encryptedAmountA, encryptedAmountB);
      await expect(transaction.wait()).to.be.reverted;
    });

    it("should revert when overflowing reserveB", async function () {
      const encryptedAmountA = this.instancesTokenA.alice.encrypt32(1);
      const encryptedAmountB = this.instancesTokenB.alice.encrypt32(MAX_UINT32 + 1);

      let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountA);
      await transaction.wait();
      transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountB);
      await transaction.wait();

      transaction = await createTransaction(this.cfmm.addLiquidity, encryptedAmountA, encryptedAmountB);
      await expect(transaction.wait()).to.be.reverted;
    });
  });

  describe("Test Swap functionality", function () {
    beforeEach(async function () {
      //Add liquidity
      const encryptedAmountA = this.instancesTokenA.alice.encrypt32(TOKENA_LIQUIDITY);
      const encryptedAmountB = this.instancesTokenB.alice.encrypt32(TOKENB_LIQUIDITY);

      let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountA);
      await transaction.wait();
      transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountB);
      await transaction.wait();

      transaction = await createTransaction(this.cfmm.addLiquidity, encryptedAmountA, encryptedAmountB);
      await transaction.wait();
    });
    describe("Swap A to B", function () {
      it("should swap correctly", async function () {
        let encryptedAmountSwap = this.instancesTokenA.alice.encrypt32(100);

        let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountSwap);
        await transaction.wait();

        // Swap
        encryptedAmountSwap = this.instancesCFMM.alice.encrypt32(100);
        transaction = await createTransaction(this.cfmm.swapAtoB, encryptedAmountSwap);
        await transaction.wait();

        //Check token balances
        const tokenA = this.instancesTokenA.alice.getTokenSignature(this.tokenAAddress);
        const encryptedBalanceA = await this.tokenA.balanceOf(tokenA.publicKey, tokenA.signature);
        const balanceA = this.instancesTokenA.alice.decrypt(this.tokenAAddress, encryptedBalanceA);

        const tokenB = this.instancesTokenB.alice.getTokenSignature(this.tokenBAddress);
        const encryptedBalanceB = await this.tokenB.balanceOf(tokenB.publicKey, tokenB.signature);
        const balanceB = this.instancesTokenB.alice.decrypt(this.tokenBAddress, encryptedBalanceB);

        expect(balanceA).to.be.equal(MAX_UINT32 - TOKENA_LIQUIDITY - 100); //Mint - Liquidity - Swap
        expect(balanceB).to.be.equal(MAX_UINT32 - TOKENB_LIQUIDITY + 10); //Mint - Liquidity + Swap (which is ReserveB - (K / (reserveA + swap)))

        // Check reserves and constant product
        const signCFFMAlice = this.instancesCFMM.alice.getTokenSignature(this.CFMMAddress);
        const encryptedReserveA = await this.cfmm.getReserveA(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const reserveA = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveA);

        const encryptedReserveB = await this.cfmm.getReserveB(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const reserveB = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveB);

        const encryptedCP = await this.cfmm.getConstantProduct(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const constantProduct = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedCP);

        expect(reserveA).to.be.equal(10100); // 10000 + 100
        expect(reserveB).to.be.equal(990); // (K / (reserveA + swap)) : ((10000 * 1000) / (10000 + 100))
        expect(constantProduct).to.be.equal(TOKENA_LIQUIDITY * TOKENB_LIQUIDITY);
      });

      it("should swap correctly at the limit", async function () {
        let encryptedAmountSwap = this.instancesTokenA.alice.encrypt32(
          TOKENA_LIQUIDITY * TOKENB_LIQUIDITY - TOKENA_LIQUIDITY,
        );

        let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountSwap);
        await transaction.wait();

        // Swap
        encryptedAmountSwap = this.instancesCFMM.alice.encrypt32(
          TOKENA_LIQUIDITY * TOKENB_LIQUIDITY - TOKENA_LIQUIDITY,
        );
        transaction = await createTransaction(this.cfmm.swapAtoB, encryptedAmountSwap);
        await transaction.wait();

        //Check token balances
        const tokenA = this.instancesTokenA.alice.getTokenSignature(this.tokenAAddress);
        const encryptedBalanceA = await this.tokenA.balanceOf(tokenA.publicKey, tokenA.signature);
        const balanceA = this.instancesTokenA.alice.decrypt(this.tokenAAddress, encryptedBalanceA);

        const tokenB = this.instancesTokenB.alice.getTokenSignature(this.tokenBAddress);
        const encryptedBalanceB = await this.tokenB.balanceOf(tokenB.publicKey, tokenB.signature);
        const balanceB = this.instancesTokenB.alice.decrypt(this.tokenBAddress, encryptedBalanceB);

        expect(balanceA).to.be.equal(
          MAX_UINT32 - TOKENA_LIQUIDITY - (TOKENA_LIQUIDITY * TOKENB_LIQUIDITY - TOKENA_LIQUIDITY),
        ); //Mint - Liquidity - Swap
        expect(balanceB).to.be.equal(MAX_UINT32 - TOKENB_LIQUIDITY + TOKENB_LIQUIDITY - 1); //Mint - Liquidity + Swap (which is ReserveB - (K / (reserveA + swap)))

        // Check reserves and constant product
        const signCFFMAlice = this.instancesCFMM.alice.getTokenSignature(this.CFMMAddress);
        const encryptedReserveA = await this.cfmm.getReserveA(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const reserveA = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveA);

        const encryptedReserveB = await this.cfmm.getReserveB(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const reserveB = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveB);

        const encryptedCP = await this.cfmm.getConstantProduct(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const constantProduct = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedCP);

        expect(reserveA).to.be.equal(TOKENA_LIQUIDITY * TOKENB_LIQUIDITY);
        expect(reserveB).to.be.equal(1);
        expect(constantProduct).to.be.equal(TOKENA_LIQUIDITY * TOKENB_LIQUIDITY);
      });

      it("should revert after the limit", async function () {
        const encryptedAmountSwap = this.instancesTokenA.alice.encrypt32(
          TOKENA_LIQUIDITY * TOKENB_LIQUIDITY - TOKENA_LIQUIDITY + 1,
        );

        let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountSwap);
        await transaction.wait();

        // Swap
        transaction = await createTransaction(this.cfmm.swapAtoB, encryptedAmountSwap);
        await expect(transaction.wait()).to.be.reverted;
      });

      // avoid unnecessary operations
      it("should revert if 0 token is provided", async function () {
        const encryptedAmountSwap = this.instancesCFMM.alice.encrypt32(0);

        const transaction = await createTransaction(this.cfmm.swapAtoB, encryptedAmountSwap);
        await expect(transaction.wait()).to.be.reverted;
      });

      it("should revert when a negative number is proposed", async function () {
        const encryptedAmountSwap = this.instancesTokenA.alice.encrypt32(-1);

        let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountSwap);
        await transaction.wait();

        // Swap
        transaction = await createTransaction(this.cfmm.swapAtoB, encryptedAmountSwap);
        await expect(transaction.wait()).to.be.reverted;
      });
    });

    describe("Swap B to A", function () {
      it("should swap correctly", async function () {
        let encryptedAmountSwap = this.instancesTokenB.alice.encrypt32(20);

        let transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountSwap);
        await transaction.wait();

        // Swap
        encryptedAmountSwap = this.instancesCFMM.alice.encrypt32(20);
        transaction = await createTransaction(this.cfmm.swapBtoA, encryptedAmountSwap);
        await transaction.wait();

        //Check token balances
        const tokenA = this.instancesTokenA.alice.getTokenSignature(this.tokenAAddress);
        const encryptedBalanceA = await this.tokenA.balanceOf(tokenA.publicKey, tokenA.signature);
        const balanceA = this.instancesTokenA.alice.decrypt(this.tokenAAddress, encryptedBalanceA);

        const tokenB = this.instancesTokenB.alice.getTokenSignature(this.tokenBAddress);
        const encryptedBalanceB = await this.tokenB.balanceOf(tokenB.publicKey, tokenB.signature);
        const balanceB = this.instancesTokenB.alice.decrypt(this.tokenBAddress, encryptedBalanceB);

        expect(balanceA).to.be.equal(MAX_UINT32 - TOKENA_LIQUIDITY + 197); //Mint - Liquidity + Swap (which is ReserveA - (K / (reserveB + swap)))
        expect(balanceB).to.be.equal(MAX_UINT32 - TOKENB_LIQUIDITY - 20); //Mint - Liquidity - Swap

        // Check reserves and constant product
        const signCFFMAlice = this.instancesCFMM.alice.getTokenSignature(this.CFMMAddress);
        const encryptedReserveA = await this.cfmm.getReserveA(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const reserveA = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveA);

        const encryptedReserveB = await this.cfmm.getReserveB(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const reserveB = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveB);

        const encryptedCP = await this.cfmm.getConstantProduct(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const constantProduct = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedCP);

        expect(reserveA).to.be.equal(9803); // (K / (reserveB + swap)) : ((10000 * 1000) / (1000 + 20))
        expect(reserveB).to.be.equal(1020); // 1000 + 20
        expect(constantProduct).to.be.equal(TOKENA_LIQUIDITY * TOKENB_LIQUIDITY);
      });

      it("should swap correctly at the limit", async function () {
        let encryptedAmountSwap = this.instancesTokenB.alice.encrypt32(
          TOKENA_LIQUIDITY * TOKENB_LIQUIDITY - TOKENB_LIQUIDITY,
        );

        let transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountSwap);
        await transaction.wait();

        // Swap
        encryptedAmountSwap = this.instancesCFMM.alice.encrypt32(
          TOKENA_LIQUIDITY * TOKENB_LIQUIDITY - TOKENB_LIQUIDITY,
        );
        transaction = await createTransaction(this.cfmm.swapBtoA, encryptedAmountSwap);
        await transaction.wait();

        //Check token balances
        const tokenA = this.instancesTokenA.alice.getTokenSignature(this.tokenAAddress);
        const encryptedBalanceA = await this.tokenA.balanceOf(tokenA.publicKey, tokenA.signature);
        const balanceA = this.instancesTokenA.alice.decrypt(this.tokenAAddress, encryptedBalanceA);

        const tokenB = this.instancesTokenB.alice.getTokenSignature(this.tokenBAddress);
        const encryptedBalanceB = await this.tokenB.balanceOf(tokenB.publicKey, tokenB.signature);
        const balanceB = this.instancesTokenB.alice.decrypt(this.tokenBAddress, encryptedBalanceB);

        expect(balanceA).to.be.equal(MAX_UINT32 - TOKENA_LIQUIDITY + TOKENA_LIQUIDITY - 1);
        expect(balanceB).to.be.equal(
          MAX_UINT32 - TOKENB_LIQUIDITY - (TOKENA_LIQUIDITY * TOKENB_LIQUIDITY - TOKENB_LIQUIDITY),
        );

        // Check reserves and constant product
        const signCFFMAlice = this.instancesCFMM.alice.getTokenSignature(this.CFMMAddress);
        const encryptedReserveA = await this.cfmm.getReserveA(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const reserveA = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveA);

        const encryptedReserveB = await this.cfmm.getReserveB(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const reserveB = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveB);

        const encryptedCP = await this.cfmm.getConstantProduct(signCFFMAlice.publicKey, signCFFMAlice.signature);
        const constantProduct = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedCP);

        expect(reserveA).to.be.equal(1);
        expect(reserveB).to.be.equal(TOKENA_LIQUIDITY * TOKENB_LIQUIDITY);
        expect(constantProduct).to.be.equal(TOKENA_LIQUIDITY * TOKENB_LIQUIDITY);
      });

      it("should revert after the limit", async function () {
        const encryptedAmountSwap = this.instancesTokenB.alice.encrypt32(
          TOKENA_LIQUIDITY * TOKENB_LIQUIDITY - TOKENB_LIQUIDITY + 1,
        );

        let transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountSwap);
        await transaction.wait();

        // Swap
        transaction = await createTransaction(this.cfmm.swapBtoA, encryptedAmountSwap);
        await expect(transaction.wait()).to.be.reverted;
      });

      // avoid unnecessary operations
      it("should revert if 0 token is provided", async function () {
        const encryptedAmountSwap = this.instancesCFMM.alice.encrypt32(0);

        const transaction = await createTransaction(this.cfmm.swapBtoA, encryptedAmountSwap);
        await expect(transaction.wait()).to.be.reverted;
      });

      it("should revert when a negative number is proposed", async function () {
        const encryptedAmountSwap = this.instancesTokenB.alice.encrypt32(-1);

        let transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountSwap);
        await transaction.wait();

        // Swap
        transaction = await createTransaction(this.cfmm.swapBtoA, encryptedAmountSwap);
        await expect(transaction.wait()).to.be.reverted;
      });
    });
  });

  describe("Access control", function () {
    it("should revert when non admin calls getReserveA", async function () {
      const signCFFMBob = this.instancesCFMM.bob.getTokenSignature(this.CFMMAddress);
      await expect(this.cfmm.getReserveA(signCFFMBob.publicKey, signCFFMBob.signature)).to.be.reverted;
    });

    it("should revert when non admin calls getReserveB", async function () {
      const signCFFMBob = this.instancesCFMM.bob.getTokenSignature(this.CFMMAddress);
      await expect(this.cfmm.getReserveB(signCFFMBob.publicKey, signCFFMBob.signature)).to.be.reverted;
    });

    it("should revert when non admin calls getConstantProduct", async function () {
      const signCFFMBob = this.instancesCFMM.bob.getTokenSignature(this.CFMMAddress);
      await expect(this.cfmm.getConstantProduct(signCFFMBob.publicKey, signCFFMBob.signature)).to.be.reverted;
    });
  });
});
