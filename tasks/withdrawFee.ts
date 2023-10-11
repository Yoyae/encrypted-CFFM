import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import { createInstances } from "../test/instance";
import { Signers, getSigners } from "../test/signers";
import { FhevmInstances } from "../test/types";

task("task:withdrawFee")
  .addParam("account", "Specify which account [alice, bob, carol, dave]")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const signers = await getSigners(ethers);

    //CFMM
    const cfmm = await deployments.get("CFMM");
    console.log("CFMM deployed to: ", await cfmm.address);
    const cfmmAddress = await cfmm.address;
    const instancesCfmm = await createInstances(cfmmAddress, ethers, signers);
    const cfmmContract = await ethers.getContractAt("CFMM", cfmmAddress);
    const generatecfmm = instancesCfmm[taskArguments.account as keyof FhevmInstances].generateToken({
      verifyingContract: cfmmAddress,
    });
    const signatureCfmm = await signers[taskArguments.account as keyof Signers].signTypedData(
      generatecfmm.token.domain,
      { Reencrypt: generatecfmm.token.types.Reencrypt },
      generatecfmm.token.message,
    );
    instancesCfmm[taskArguments.account as keyof FhevmInstances].setTokenSignature(cfmmAddress, signatureCfmm);

    const encryptedFeeBalancesBefore: [string, string] = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .getFeeBalances(generatecfmm.publicKey, signatureCfmm);
    const encryptedFeeBalanceTokenABefore = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedFeeBalancesBefore[0],
    );
    const encryptedFeeBalanceTokenBBefore = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedFeeBalancesBefore[1],
    );
    console.log("Balance fee of tokenA before : ", encryptedFeeBalanceTokenABefore);
    console.log("Balance fee of tokenB before : ", encryptedFeeBalanceTokenBBefore);

    //Withdraw fees
    const tx = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .withdrawFee(signers.alice.address);

    await tx.wait(1);

    const encryptedFeeBalancesAfter: [string, string] = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .getFeeBalances(generatecfmm.publicKey, signatureCfmm);
    const encryptedFeeBalanceTokenAAfter = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedFeeBalancesAfter[0],
    );
    const encryptedFeeBalanceTokenBAfter = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedFeeBalancesAfter[1],
    );
    console.log("Balance fee of tokenA after : ", encryptedFeeBalanceTokenAAfter);
    console.log("Balance fee of tokenB after : ", encryptedFeeBalanceTokenBAfter);
  });
