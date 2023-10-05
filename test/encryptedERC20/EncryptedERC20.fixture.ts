import { ethers } from "hardhat";

import type { EncryptedERC20 } from "../../types";
import { getSigners } from "../signers";

export async function deployEncryptedERC20Fixture(name: string, symbol: string): Promise<EncryptedERC20> {
  const signers = await getSigners(ethers);

  const contractFactory = await ethers.getContractFactory("EncryptedERC20");
  const contract = await contractFactory.connect(signers.alice).deploy(name, symbol);
  await contract.waitForDeployment();

  return contract;
}
