import { ethers } from "hardhat";

import type { CFMM } from "../../types";
import { getSigners } from "../signers";

export async function deployCFMMFixture(tokenAAddress: string, tokenBAddress: string): Promise<CFMM> {
  const signers = await getSigners(ethers);

  const contractFactory = await ethers.getContractFactory("CFMM");
  const contract = await contractFactory.connect(signers.alice).deploy(tokenAAddress, tokenBAddress);
  await contract.waitForDeployment();

  return contract;
}
