import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

import { getSigners } from "../test/signers";

task("task:deployCFMM").setAction(async function (taskArguments: TaskArguments, { ethers }) {
  const signers = await getSigners(ethers);
  const contractFactoryTokenA = await ethers.getContractFactory("EncryptedERC20");
  const contractTokenA = await contractFactoryTokenA.connect(signers.alice).deploy("Naraggara", "NARA"); // 1st possible city of Zama battle
  await contractTokenA.waitForDeployment();

  const contractFactoryTokenB = await ethers.getContractFactory("EncryptedERC20");
  const contractTokenB = await contractFactoryTokenB.connect(signers.alice).deploy("Margaron", "MARG"); // 2nd possible city of Zama battle
  await contractTokenB.waitForDeployment();

  const contractFactory = await ethers.getContractFactory("CFMM");
  const contract = await contractFactory
    .connect(signers.alice)
    .deploy(await contractTokenA.getAddress(), await contractTokenB.getAddress());
  await contract.waitForDeployment();

  console.log("TokenA deployed to: ", await contractTokenA.getAddress());
  console.log("TokenB deployed to: ", await contractTokenB.getAddress());
  console.log("CFMM deployed to: ", await contract.getAddress());
});
