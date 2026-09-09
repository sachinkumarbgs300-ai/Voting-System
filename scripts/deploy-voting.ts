import { network } from "hardhat";

async function main() {
    const { ethers } = await network.connect();

    const Voting = await ethers.getContractFactory("Voting");

    const voting = await Voting.deploy();

    await voting.waitForDeployment();

    console.log("Voting contract deployed to:");
    console.log(await voting.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});