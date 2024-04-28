import hre from "hardhat";

import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import {
  MetaTransactionData,
  OperationType
} from "@safe-global/safe-core-sdk-types";

import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

import SafeApiKit from "@safe-global/api-kit";
import { AutomateSDK, TriggerType } from "@gelatonetwork/automate-sdk";
import { safeAddress } from "../safe";

const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();

  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: deployer
  });

  const protocolKit = await Safe.create({
    ethAdapter,
    safeAddress
  });

  const predictedSafeAddress = await protocolKit.getAddress();
  console.log({ predictedSafeAddress });

  const isSafeDeployed = await protocolKit.isSafeDeployed();
  console.log({ isSafeDeployed });

  const chainId = (await ethers.provider.getNetwork()).chainId;

  const automate = new AutomateSDK(chainId, deployer);
  const cid = "QmReeJNQUJXkFUuxTMs5ZrY7km121YgmnRRsDaCc3UsJs5";

  const { taskId, tx } = await automate.prepareBatchExecTask(
    {
      name: "Web3Function - Reya Multiple",
      web3FunctionHash: cid,
      web3FunctionArgs: {
        priceFeeds: ["ETH", "BTC", "WBTC", "USDC", "USDT", "DAI"],
        priceFeedAdapterAddresses: [
          "0x9EF1363f109e1e4D5cC3894357f144406f1804D5",
          "0x852096024A7d400aB0119ef73AAE02aDAeC5E564",
          "0xD6BB3a8bef8917668f940Fe4D48376E088cD9502",
          "0x67F464C8c3F971AebeD01a0Cf10d2F4bA68A8530",
          "0xbFD9Dc0d7050d1B41f5E75AB2aE24f8b28939DFB",
          "0x767f02881891453218f4144EbFd2F39b5C8d3B59"
        ]
      },
      trigger: {
        interval: 10 * 1000,
        type: TriggerType.TIME
      }
    },
    {},
    safeAddress
  );
  const txServiceUrl = "https://transaction.safe.reya.network";
  const service = new SafeApiKit({ txServiceUrl, ethAdapter: ethAdapter });

  const safeTransactionData: MetaTransactionData = {
    to: tx.to,
    data: tx.data,
    value: "0",
    operation: OperationType.Call
  };

  // Propose transaction to the service
  const safeTransaction = await protocolKit.createTransaction({
    safeTransactionData
  });
  const senderAddress = await deployer.getAddress();
  const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
  const signature = await protocolKit.signTransactionHash(safeTxHash);
  await service.proposeTransaction({
    safeAddress: safeAddress,
    safeTransactionData: safeTransaction.data,
    safeTxHash,
    senderAddress,
    senderSignature: signature.data
  });

  console.log("Proposed a transaction with Safe:", safeAddress);
  console.log("- safeTxHash:", safeTxHash);
  console.log("- Sender:", senderAddress);
  console.log("- Sender signature:", signature.data);
  console.log("- TaskId:", taskId);
}
main();
