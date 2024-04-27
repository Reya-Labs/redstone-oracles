import {
  Web3Function,
  Web3FunctionContext
} from "@gelatonetwork/web3-functions-sdk";
import { BigNumber, Contract, ethers } from "ethers";

import * as sdk from "@redstone-finance/sdk";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
const parsePrice = (value: Uint8Array) => {
  const bigNumberPrice = ethers.BigNumber.from(value);
  return bigNumberPrice.toNumber() / 10 ** 8; // Redstone uses 8 decimals
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  let abi = [
    "function updateDataFeedsValues(uint256) external",
    "function getDataServiceId() public pure  override returns (string memory)",
    "function getUniqueSignersThreshold() public pure returns (uint8)",
    "function latestRoundData() external view returns (uint80,int256,uint256,int256,uint80)",
    "function decimals() external view returns (uint8)"
  ];

  // todo: input validation lengths should be the same

  const priceFeedAdapterAddresses: string[] = userArgs.priceFeedAdapterAddresses as string[];
  const priceFeeds: string[] = userArgs.priceFeeds as string[];

  const getLatestSignedPrice = await sdk.requestDataPackages({
    dataServiceId: "redstone-primary-prod",
    uniqueSignersCount: 3,
    dataFeeds: priceFeeds,
    urls: ["https://oracle-gateway-1.a.redstone.finance"]
  });

  const callDataResults: { to: string; data: string }[] = [];

  for (let i = 0; i < priceFeedAdapterAddresses.length; i++) {
    if (priceFeeds[i] == undefined) {
      return { canExec: false, message: "No price feed arg" };
    }
    const priceFeedAdapter = new Contract(
      priceFeedAdapterAddresses[i],
      abi,
      provider
    );
    // Wrap contract with redstone data service
    const wrappedOracle = WrapperBuilder.wrap(
      priceFeedAdapter
    ).usingDataService(getLatestSignedPrice);

    // Retrieve stored & live prices

    const { dataPackage } = getLatestSignedPrice[priceFeeds[i]]![0];

    const parsedPrice = parsePrice(dataPackage.dataPoints[0].value);
    // Craft transaction to update the price on-chain
    console.log(
      `Setting ${priceFeeds[i]} price in PriceFeed contract to: ${parsedPrice}`
    );
    const {
      data
    } = await wrappedOracle.populateTransaction.updateDataFeedsValues(
      dataPackage.timestampMilliseconds
    );
    callDataResults[i] = {
      to: priceFeedAdapterAddresses[i],
      data: data
    };
  }

  return {
    canExec: true,
    callData: callDataResults
  };
});
