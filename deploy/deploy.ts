import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedTokenA = await deploy("tokenA", {
    from: deployer,
    contract: "EncryptedERC20",
    args: ["Naraggara", "NARA"],
    log: true,
  });

  console.log(`Token A contract: `, deployedTokenA.address);

  const deployedTokenB = await deploy("tokenB", {
    from: deployer,
    contract: "EncryptedERC20",
    args: ["Margaron", "MARG"],
    log: true,
  });

  console.log(`Token B contract: `, deployedTokenB.address);

  const CFMM = await deploy("CFMM", {
    from: deployer,
    args: [deployedTokenA.address, deployedTokenB.address],
    log: true,
  });

  console.log(`CFMM contract: `, CFMM.address);
};
export default func;
func.id = "deploy_CFMM"; // id required to prevent reexecution
func.tags = ["CFMM"];
