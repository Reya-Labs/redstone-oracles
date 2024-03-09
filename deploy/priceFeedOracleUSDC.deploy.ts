import { deployments, getNamedAccounts } from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  if (hre.network.name !== "hardhat") {
    console.log(
      `Deploying PriceFeedOracleWithAdapter to ${hre.network.name}. Hit ctrl + c to abort`
    );
  }

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const adapterUSDC = await deploy("RedstonePriceFeedWithRoundsUSDC", {
    from: deployer,
    log: hre.network.name !== "hardhat",
    proxy: {
      proxyContract: "EIP173Proxy"
    }
  });
  console.log(`Deployed Price Feed USDC to ${adapterUSDC.address}`);
};

export default func;

func.tags = ["USDCWR"];
