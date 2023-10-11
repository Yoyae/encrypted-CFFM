import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import { createInstances } from "../test/instance";
import { Signers, getSigners } from "../test/signers";
import { FhevmInstances } from "../test/types";

task("task:swapBtoA")
  .addParam("amount", "amount of tokenA to swap")
  .addParam("account", "Specify which account [alice, bob, carol, dave]")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const signers = await getSigners(ethers);

    //Token B
    const tokenB = await deployments.get("tokenB");
    console.log("tokenB deployed to: ", await tokenB.address);
    const tokenBAddress = await tokenB.address;
    const instancesTokenB = await createInstances(tokenBAddress, ethers, signers);
    const tokenBContract = await ethers.getContractAt("EncryptedERC20", tokenBAddress);
    const generateTokenB = instancesTokenB[taskArguments.account as keyof FhevmInstances].generateToken({
      verifyingContract: tokenBAddress,
    });
    const signatureTokenB = await signers[taskArguments.account as keyof Signers].signTypedData(
      generateTokenB.token.domain,
      { Reencrypt: generateTokenB.token.types.Reencrypt },
      generateTokenB.token.message,
    );
    instancesTokenB[taskArguments.account as keyof FhevmInstances].setTokenSignature(tokenBAddress, signatureTokenB);

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

    const encryptedReserveABefore = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .getReserveA(generatecfmm.publicKey, signatureCfmm);
    const reserveABefore = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedReserveABefore,
    );
    console.log("Reserve A before : ", reserveABefore);

    const encryptedReserveBBefore = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .getReserveB(generatecfmm.publicKey, signatureCfmm);
    const reserveBBefore = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedReserveBBefore,
    );
    console.log("Reserve B before : ", reserveBBefore);

    const encryptedCPBefore = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .getConstantProduct(generatecfmm.publicKey, signatureCfmm);
    const cPBefore = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedCPBefore,
    );
    console.log("Constant Product before : ", cPBefore);

    //Approve token transfer
    let tx = await tokenBContract
      .connect(signers[taskArguments.account as keyof Signers])
      .approve(
        cfmmAddress,
        instancesTokenB[taskArguments.account as keyof FhevmInstances].encrypt32(+taskArguments.amount),
      );

    await tx.wait(1);
    console.log("Approve done.");

    //Swap token B to A
    tx = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .swap(1, instancesCfmm[taskArguments.account as keyof FhevmInstances].encrypt32(+taskArguments.amount));

    await tx.wait(1);

    const encryptedReserveANew = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .getReserveA(generatecfmm.publicKey, signatureCfmm);
    const reserveANew = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedReserveANew,
    );
    console.log("Reserve A after : ", reserveANew);

    const encryptedReserveBNew = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .getReserveB(generatecfmm.publicKey, signatureCfmm);
    const reserveBNew = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(
      cfmmAddress,
      encryptedReserveBNew,
    );
    console.log("Reserve B after : ", reserveBNew);

    const encryptedCPNew = await cfmmContract
      .connect(signers[taskArguments.account as keyof Signers])
      .getConstantProduct(generatecfmm.publicKey, signatureCfmm);
    const cPNew = instancesCfmm[taskArguments.account as keyof FhevmInstances].decrypt(cfmmAddress, encryptedCPNew);
    console.log("Constant Product after : ", cPNew);
  });
