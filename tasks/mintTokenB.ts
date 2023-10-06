import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import { createInstances } from "../test/instance";
import { Signers, getSigners } from "../test/signers";
import { FhevmInstances } from "../test/types";

task("task:mintTokenB")
  .addParam("mint", "Tokens to mint")
  .addParam("account", "Specify which account [alice, bob, carol, dave]")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;
    const EncryptedERC20 = await deployments.get("tokenB");
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

    const encryptedBalanceOld = await encryptedERC20
      .connect(signers[taskArguments.account as keyof Signers])
      .balanceOf(generateToken.publicKey, signature);

    const balanceOld = instances[taskArguments.account as keyof FhevmInstances].decrypt(
      EncryptedERC20.address,
      encryptedBalanceOld,
    );

    console.log("BalanceOf before : ", balanceOld);

    const tx = await encryptedERC20
      .connect(signers[taskArguments.account as keyof Signers])
      .mint(instances[taskArguments.account as keyof FhevmInstances].encrypt32(+taskArguments.mint));

    // This is the ideal way
    // but method 'HardhatEthersProvider.waitForTransaction' is not implemented
    // await ethers.provider.waitForTransaction(tx.hash);

    // Another way is to wait 1 confirmation
    await tx.wait(1);

    const encryptedBalanceNew = await encryptedERC20
      .connect(signers[taskArguments.account as keyof Signers])
      .balanceOf(generateToken.publicKey, signature);

    const balanceNew = instances[taskArguments.account as keyof FhevmInstances].decrypt(
      EncryptedERC20.address,
      encryptedBalanceNew,
    );

    console.log("BalanceOf after : ", balanceNew);
  });
