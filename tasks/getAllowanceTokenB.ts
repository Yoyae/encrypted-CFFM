import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import { createInstances } from "../test/instance";
import { Signers, getSigners } from "../test/signers";
import { FhevmInstances } from "../test/types";

task("task:getAllowanceTokenB")
  .addParam("account", "Specify which account [alice, bob, carol, dave]")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const EncryptedERC20 = await deployments.get("tokenB");
    const CFMM = await deployments.get("CFMM");
    console.log("eERC20 found at " + EncryptedERC20.address);
    const signers = await getSigners(ethers);

    const instances = await createInstances(EncryptedERC20.address, ethers, signers);

    const encryptedERC20 = await ethers.getContractAt("EncryptedERC20", EncryptedERC20.address);

    const generateToken = instances[taskArguments.account as keyof FhevmInstances].generateToken({
      verifyingContract: EncryptedERC20.address,
    });

    const signature = await signers[taskArguments.account as keyof Signers].signTypedData(
      generateToken.token.domain,
      { Reencrypt: generateToken.token.types.Reencrypt },
      generateToken.token.message,
    );

    instances[taskArguments.account as keyof FhevmInstances].setTokenSignature(EncryptedERC20.address, signature);

    const encryptedAllowance = await encryptedERC20
      .connect(signers[taskArguments.account as keyof Signers])
      .allowance(CFMM.address, generateToken.publicKey, signature);

    const allowance = instances[taskArguments.account as keyof FhevmInstances].decrypt(
      EncryptedERC20.address,
      encryptedAllowance,
    );

    console.log("Allowance for CFMM : ", allowance);
  });
