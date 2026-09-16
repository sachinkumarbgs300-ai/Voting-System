// ==========================================
// Decentralized Voting System
// MetaMask + Voting Smart Contract
// ==========================================


// Deployed Voting contract address
const CONTRACT_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";


// Voting smart contract ABI
const CONTRACT_ABI = [

    "function vote(uint256 candidateId) public",

    "function getCandidateCount() public view returns (uint256)",

    "function getCandidate(uint256 candidateId) public view returns (string name, uint256 voteCount)",

    "function hasVoted(address) public view returns (bool)",

    "function votingActive() public view returns (bool)"

];


// Global variables
let provider;
let signer;
let votingContract;
let userAddress;


// ==========================================
// Connect Wallet
// ==========================================

async function connectWallet() {

    // Check if MetaMask is installed
    if (typeof window.ethereum === "undefined") {

        alert("MetaMask is not installed. Please install MetaMask.");

        return;
    }


    try {

        // Request wallet connection
        await window.ethereum.request({
            method: "eth_requestAccounts"
        });


        // Create ethers provider
        provider = new ethers.BrowserProvider(window.ethereum);


        // Get user's account
        signer = await provider.getSigner();

        userAddress = await signer.getAddress();


        // Get blockchain network
        const network = await provider.getNetwork();


        // Hardhat Local Chain ID = 31337
        if (network.chainId !== 31337n) {

            alert(
                "Please switch MetaMask to Hardhat Local network."
            );

            return;
        }


        // Create contract instance
        votingContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
        );


        // Update wallet information
        document.getElementById("walletStatus").textContent =
            "Wallet: " + userAddress;


        document.getElementById("walletSystemStatus").textContent =
            "Connected";


        document.getElementById("networkStatus").textContent =
            "Hardhat Local";


        document.getElementById("contractStatus").textContent =
            "Connected";


        // Check voting status
        await updateVotingStatus();


        // Load current vote counts
        await loadVotes();


        console.log("Wallet connected:");
        console.log(userAddress);

    }

    catch (error) {

        console.error(error);

        alert(
            "Wallet connection failed: " +
            (error.shortMessage || error.message)
        );

    }

}


// ==========================================
// Check Voting Status
// ==========================================

async function updateVotingStatus() {

    try {

        const active =
            await votingContract.votingActive();


        const votingStatus =
            document.getElementById("votingStatus");


        const votingTitle =
            document.getElementById("votingTitle");


        const votingMessage =
            document.getElementById("votingMessage");


        if (active) {

            votingStatus.textContent =
                "Active";

            votingTitle.textContent =
                "Voting is Open";

            votingMessage.textContent =
                "You can cast your vote using your connected wallet.";

            enableVoteButtons();

        }

        else {

            votingStatus.textContent =
                "Ended";

            votingTitle.textContent =
                "Voting has Ended";

            votingMessage.textContent =
                "The voting process has been closed.";

            disableVoteButtons();

        }

    }

    catch (error) {

        console.error(
            "Unable to check voting status:",
            error
        );

    }

}


// ==========================================
// Enable Vote Buttons
// ==========================================

function enableVoteButtons() {

    document.getElementById("voteA").disabled = false;

    document.getElementById("voteB").disabled = false;

    document.getElementById("voteC").disabled = false;

}


// ==========================================
// Disable Vote Buttons
// ==========================================

function disableVoteButtons() {

    document.getElementById("voteA").disabled = true;

    document.getElementById("voteB").disabled = true;

    document.getElementById("voteC").disabled = true;

}


// ==========================================
// Load Votes From Blockchain
// ==========================================

async function loadVotes() {

    try {

        const candidateA =
            await votingContract.getCandidate(0);

        const candidateB =
            await votingContract.getCandidate(1);

        const candidateC =
            await votingContract.getCandidate(2);


        document.getElementById("votesA").textContent =
            candidateA[1].toString();


        document.getElementById("votesB").textContent =
            candidateB[1].toString();


        document.getElementById("votesC").textContent =
            candidateC[1].toString();


        console.log(
            "Votes loaded from blockchain."
        );

    }

    catch (error) {

        console.error(
            "Unable to load votes:",
            error
        );

    }

}


// ==========================================
// Cast Vote
// ==========================================

async function vote(candidateId) {

    if (!votingContract) {

        alert(
            "Please connect your MetaMask wallet first."
        );

        return;
    }


    try {

        // Check whether user has already voted
        const alreadyVoted =
            await votingContract.hasVoted(userAddress);


        if (alreadyVoted) {

            alert(
                "You have already voted!"
            );

            disableVoteButtons();

            return;
        }


        // Send vote transaction
        const transaction =
            await votingContract.vote(candidateId);


        alert(
            "Vote transaction submitted. Please wait..."
        );


        // Wait for blockchain confirmation
        await transaction.wait();


        alert(
            "Vote successfully recorded on blockchain!"
        );


        // Reload vote counts
        await loadVotes();


        // Disable voting because this wallet has voted
        disableVoteButtons();


        console.log(
            "Vote transaction:",
            transaction.hash
        );

    }

    catch (error) {

        console.error(error);


        if (
            error.code === "ACTION_REJECTED"
        ) {

            alert(
                "You rejected the MetaMask transaction."
            );

        }

        else {

            alert(
                "Voting failed: " +
                (error.shortMessage || error.message)
            );

        }

    }

}


// ==========================================
// Connect Wallet Button
// ==========================================

document
    .getElementById("connectWallet")
    .addEventListener(
        "click",
        connectWallet
    );


// ==========================================
// Detect Account Changes
// ==========================================

if (window.ethereum) {

    window.ethereum.on(
        "accountsChanged",
        function () {

            location.reload();

        }
    );


    window.ethereum.on(
        "chainChanged",
        function () {

            location.reload();

        }
    );

}