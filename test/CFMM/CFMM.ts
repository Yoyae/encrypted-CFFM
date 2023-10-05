import { expect } from "chai";
import { ethers } from "hardhat";

import { deployEncryptedERC20Fixture } from "../encryptedERC20/EncryptedERC20.fixture";
import { createInstances } from "../instance";
import { getSigners } from "../signers";
import { createTransaction } from "../utils";
import { deployCFMMFixture } from "./CFMM.fixture";

describe("CFMM", function () {
  before(async function () {
    this.signers = await getSigners(ethers);

    const contractTokenA = await deployEncryptedERC20Fixture("Naraggara", "NARA");
    this.tokenAAddress = await contractTokenA.getAddress();
    this.tokenA = contractTokenA;
    this.instancesTokenA = await createInstances(this.tokenAAddress, ethers, this.signers);

    //Mint some tokens
    let encryptedAmount = this.instancesTokenA.alice.encrypt32(100000);
    let transaction = await createTransaction(this.tokenA.mint, encryptedAmount);
    await transaction.wait();

    const contractTokenB = await deployEncryptedERC20Fixture("Naraggara", "NARA");
    this.tokenBAddress = await contractTokenB.getAddress();
    this.tokenB = contractTokenB;
    this.instancesTokenB = await createInstances(this.tokenBAddress, ethers, this.signers);

    //Mint some tokens
    encryptedAmount = this.instancesTokenB.alice.encrypt32(100000);
    transaction = await createTransaction(this.tokenB.mint, encryptedAmount);
    await transaction.wait();
  });

  beforeEach(async function () {
    const contractCFMM = await deployCFMMFixture(this.tokenAAddress, this.tokenBAddress);
    this.CFMMAddress = await contractCFMM.getAddress();
    this.cfmm = contractCFMM;
    this.instancesCFMM = await createInstances(this.CFMMAddress, ethers, this.signers);
  });

  it("should add liquidity correctly", async function () {
    const encryptedAmountA = this.instancesTokenA.alice.encrypt32(10000);
    const encryptedAmountB = this.instancesTokenB.alice.encrypt32(1000);

    let transaction = await createTransaction(this.tokenA.approve, this.CFMMAddress, encryptedAmountA);
    await transaction.wait();
    transaction = await createTransaction(this.tokenB.approve, this.CFMMAddress, encryptedAmountB);
    await transaction.wait();

    transaction = await createTransaction(this.cfmm.addLiquidity, encryptedAmountA, encryptedAmountB);
    await transaction.wait();

    const tokenA = this.instancesTokenA.alice.getTokenSignature(this.tokenAAddress);
    const encryptedBalanceA = await this.tokenA.balanceOf(tokenA.publicKey, tokenA.signature);
    const balanceA = this.instancesTokenA.alice.decrypt(this.tokenAAddress, encryptedBalanceA);

    const tokenB = this.instancesTokenB.alice.getTokenSignature(this.tokenBAddress);
    const encryptedBalanceB = await this.tokenB.balanceOf(tokenB.publicKey, tokenB.signature);
    const balanceB = this.instancesTokenB.alice.decrypt(this.tokenBAddress, encryptedBalanceB);

    expect(balanceA).to.be.equal(100000 - 10000);
    expect(balanceB).to.be.equal(100000 - 1000);

    const signCFFMAlice = this.instancesCFMM.alice.getTokenSignature(this.CFMMAddress);
    const encryptedReserveA = await this.cfmm.getReserveA(signCFFMAlice.publicKey, signCFFMAlice.signature);
    const reserveA = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveA);

    const encryptedReserveB = await this.cfmm.getReserveB(signCFFMAlice.publicKey, signCFFMAlice.signature);
    const reserveB = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedReserveB);

    const encryptedCP = await this.cfmm.getConstantProduct(signCFFMAlice.publicKey, signCFFMAlice.signature);
    const constantProduct = this.instancesCFMM.alice.decrypt(this.CFMMAddress, encryptedCP);

    expect(reserveA).to.be.equal(10000);
    expect(reserveB).to.be.equal(1000);
    expect(constantProduct).to.be.equal(10000 * 1000);
  });
});
