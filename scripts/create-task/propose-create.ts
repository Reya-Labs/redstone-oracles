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
  const cid = "QmZ3qp2KR43NTzvqcLYzEDajspP2rUzJq9FuFvD3LLDR99";

  const { taskId, tx } = await automate.prepareBatchExecTask(
    {
      name: "Web3Function - Reya Multiple",
      web3FunctionHash: cid,
      web3FunctionArgs: {
        priceFeeds: ["ETH", "BTC", "WBTC", "USDC", "USDT", "DAI"],
        priceFeedAdapterAddresses: [
          "0xFb49001366fC0b23B4892909426bd3796958b6D4",
          "0x34e8C1929Abb778358202Ea061eaE6f8a88dcA6A",
          "0x1Db3251c664De5990A31518fecA26189d39E0191",
          "0xBf356E1d7D083E9439A50D38430713BeE7F05a4c",
          "0xB3315A412c0DD59Ff4F040106FC1dE43e9528947",
          "0x201a385ce2a2fcDFd190DaB925B3AB1F9E11ab60"
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
  const txServiceUrl = "https://safe-transaction-sepolia.safe.global";
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
