// ============================================================
// DECENTRALIZED VOTING SYSTEM
// ============================================================


// ============================================================
// CONFIGURATION
// ============================================================

const CONTRACT_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const HARDHAT_CHAIN_ID = "31337";


// ============================================================
// CONTRACT ABI
// ============================================================

const CONTRACT_ABI = [

    // Vote
    "function vote(uint256 candidateId) public",

    // Candidate information
    "function getCandidateCount() public view returns (uint256)",

    "function getCandidate(uint256 candidateId) public view returns (string name, uint256 voteCount)",

    // Wallet voting status
    "function hasVoted(address) public view returns (bool)",

    // Voting status
    "function votingActive() public view returns (bool)"

];


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let provider = null;

let signer = null;

let votingContract = null;

let userAddress = null;


// ============================================================
// DOM ELEMENTS
// ============================================================

const connectWalletButton =
    document.getElementById("connectWallet");

const walletStatus =
    document.getElementById("walletStatus");

const walletSystemStatus =
    document.getElementById("walletSystemStatus");

const networkStatus =
    document.getElementById("networkStatus");

const contractStatus =
    document.getElementById("contractStatus");

const votingStatus =
    document.getElementById("votingStatus");

const votingTitle =
    document.getElementById("votingTitle");

const votingMessage =
    document.getElementById("votingMessage");

const voteButtons =
    document.querySelectorAll(".vote-button");


// ============================================================
// HELPER: SHORTEN WALLET ADDRESS
// ============================================================

function shortenAddress(address) {

    if (!address) {
        return "Not Connected";
    }

    return (
        address.substring(0, 6) +
        "..." +
        address.substring(address.length - 4)
    );
}


// ============================================================
// HELPER: DISABLE ALL VOTE BUTTONS
// ============================================================

function disableVoteButtons() {

    voteButtons.forEach(function (button) {

        button.disabled = true;

    });

}


// ============================================================
// HELPER: ENABLE ALL VOTE BUTTONS
// ============================================================

function enableVoteButtons() {

    voteButtons.forEach(function (button) {

        button.disabled = false;

    });

}


// ============================================================
// RESET WALLET
// ============================================================

function resetWalletState() {

    provider = null;

    signer = null;

    votingContract = null;

    userAddress = null;


    walletStatus.textContent =
        "Wallet: Not Connected";

    walletSystemStatus.textContent =
        "Not Connected";

    networkStatus.textContent =
        "Not Connected";

    contractStatus.textContent =
        "Not Connected";

    votingStatus.textContent =
        "Not Connected";

    votingTitle.textContent =
        "Voting System";

    votingMessage.textContent =
        "Connect your MetaMask wallet to access the voting system.";


    connectWalletButton.textContent =
        "Connect Wallet";


    disableVoteButtons();

}


// ============================================================
// CHECK HARDHAT NETWORK
// ============================================================

async function checkNetwork() {

    if (!provider) {
        return false;
    }


    const network =
        await provider.getNetwork();


    const chainId =
        network.chainId.toString();


    if (chainId !== HARDHAT_CHAIN_ID) {

        networkStatus.textContent =
            "Wrong Network";

        contractStatus.textContent =
            "Unavailable";

        votingStatus.textContent =
            "Wrong Network";

        votingTitle.textContent =
            "Wrong Network";

        votingMessage.textContent =
            "Please switch MetaMask to Hardhat Local.";

        disableVoteButtons();

        return false;
    }


    networkStatus.textContent =
        "Hardhat Local";

    return true;

}


// ============================================================
// INITIALIZE WALLET
// ============================================================

async function initializeWallet(accounts) {

    try {

        if (!window.ethereum) {

            alert(
                "MetaMask is not installed. Please install MetaMask."
            );

            return;

        }


        // ----------------------------------------------------
        // No account
        // ----------------------------------------------------

        if (!accounts || accounts.length === 0) {

            resetWalletState();

            return;

        }


        // ----------------------------------------------------
        // Create provider
        // ----------------------------------------------------

        provider =
            new ethers.BrowserProvider(
                window.ethereum
            );


        // ----------------------------------------------------
        // IMPORTANT:
        // Explicitly use the account supplied by MetaMask
        // ----------------------------------------------------

        const selectedAccount =
            accounts[0];


        // ----------------------------------------------------
        // Create signer for current MetaMask account
        // ----------------------------------------------------

        signer =
            await provider.getSigner(
                selectedAccount
            );


        // ----------------------------------------------------
        // Get exact wallet address
        // ----------------------------------------------------

        userAddress =
            await signer.getAddress();


        // ----------------------------------------------------
        // Check network
        // ----------------------------------------------------

        const correctNetwork =
            await checkNetwork();


        if (!correctNetwork) {
            return;
        }


        // ----------------------------------------------------
        // Create contract using CURRENT wallet signer
        // ----------------------------------------------------

        votingContract =
            new ethers.Contract(
                CONTRACT_ADDRESS,
                CONTRACT_ABI,
                signer
            );


        // ----------------------------------------------------
        // Update wallet information
        // ----------------------------------------------------

        walletStatus.textContent =
            "Wallet: " +
            shortenAddress(userAddress);

        walletSystemStatus.textContent =
            shortenAddress(userAddress);


        connectWalletButton.textContent =
            "Wallet Connected";


        contractStatus.textContent =
            "Deployed";


        // ----------------------------------------------------
        // Load blockchain data
        // ----------------------------------------------------

        await loadVotes();

        await updateVotingStatus();

        await checkUserVote();


    } catch (error) {

        console.error(
            "Wallet initialization error:",
            error
        );


        votingMessage.textContent =
            "Unable to connect wallet. Check MetaMask and try again.";

        disableVoteButtons();

    }

}


// ============================================================
// CONNECT WALLET BUTTON
// ============================================================

async function connectWallet() {

    try {

        if (!window.ethereum) {

            alert(
                "MetaMask is not installed."
            );

            return;

        }


        // Ask MetaMask for the currently selected account
        const accounts =
            await window.ethereum.request({
                method: "eth_requestAccounts"
            });


        await initializeWallet(accounts);


    } catch (error) {

        console.error(
            "Connect wallet error:",
            error
        );


        if (error.code === 4001) {

            votingMessage.textContent =
                "Wallet connection was rejected.";

        } else {

            votingMessage.textContent =
                "Unable to connect wallet.";

        }

    }

}


// ============================================================
// UPDATE VOTING STATUS
// ============================================================

async function updateVotingStatus() {

    try {

        if (!votingContract) {

            disableVoteButtons();

            return;

        }


        const active =
            await votingContract.votingActive();


        if (active) {

            votingStatus.textContent =
                "Active";

            votingTitle.textContent =
                "Voting is Active";

            votingMessage.textContent =
                "Select one candidate and cast your vote.";

        } else {

            votingStatus.textContent =
                "Ended";

            votingTitle.textContent =
                "Voting Ended";

            votingMessage.textContent =
                "The voting process has ended.";

            disableVoteButtons();

        }


    } catch (error) {

        console.error(
            "Voting status error:",
            error
        );

        votingStatus.textContent =
            "Error";

        disableVoteButtons();

    }

}


// ============================================================
// CHECK WHETHER CURRENT WALLET HAS VOTED
// ============================================================

async function checkUserVote() {

    try {

        if (
            !votingContract ||
            !userAddress
        ) {

            disableVoteButtons();

            return;

        }


        const active =
            await votingContract.votingActive();


        if (!active) {

            disableVoteButtons();

            return;

        }


        // IMPORTANT:
        // Check hasVoted for CURRENT MetaMask account
        const alreadyVoted =
            await votingContract.hasVoted(
                userAddress
            );


        if (alreadyVoted) {

            disableVoteButtons();

            votingMessage.textContent =
                "This wallet has already voted.";

            votingStatus.textContent =
                "Already Voted";

        } else {

            enableVoteButtons();

            votingMessage.textContent =
                "Select one candidate and cast your vote.";

            votingStatus.textContent =
                "Active";

        }


    } catch (error) {

        console.error(
            "Checking user vote error:",
            error
        );

        disableVoteButtons();

    }

}


// ============================================================
// LOAD VOTES FROM BLOCKCHAIN
// ============================================================

async function loadVotes() {

    try {

        if (!votingContract) {
            return;
        }


        // Candidate A = ID 0
        const candidateA =
            await votingContract.getCandidate(0);


        // Candidate B = ID 1
        const candidateB =
            await votingContract.getCandidate(1);


        // Candidate C = ID 2
        const candidateC =
            await votingContract.getCandidate(2);


        // Update vote counts

        document.getElementById("votesA")
            .textContent =
            candidateA[1].toString();


        document.getElementById("votesB")
            .textContent =
            candidateB[1].toString();


        document.getElementById("votesC")
            .textContent =
            candidateC[1].toString();


        console.log(
            "Votes loaded:",
            {
                candidateA:
                    candidateA[1].toString(),

                candidateB:
                    candidateB[1].toString(),

                candidateC:
                    candidateC[1].toString()
            }
        );


    } catch (error) {

        console.error(
            "Loading votes error:",
            error
        );

    }

}


// ============================================================
// VOTE FUNCTION
// ============================================================

async function vote(candidateId) {

    try {

        // ----------------------------------------------------
        // Make sure wallet is connected
        // ----------------------------------------------------

        if (
            !votingContract ||
            !signer ||
            !userAddress
        ) {

            alert(
                "Please connect your MetaMask wallet first."
            );

            return;

        }


        // ----------------------------------------------------
        // Validate candidate ID
        // ----------------------------------------------------

        if (
            candidateId !== 0 &&
            candidateId !== 1 &&
            candidateId !== 2
        ) {

            alert(
                "Invalid candidate."
            );

            return;

        }


        // ----------------------------------------------------
        // Check voting status
        // ----------------------------------------------------

        const active =
            await votingContract.votingActive();


        if (!active) {

            alert(
                "Voting has ended."
            );

            disableVoteButtons();

            return;

        }


        // ----------------------------------------------------
        // Check current wallet
        // ----------------------------------------------------

        const alreadyVoted =
            await votingContract.hasVoted(
                userAddress
            );


        if (alreadyVoted) {

            alert(
                "This wallet has already voted."
            );

            disableVoteButtons();

            return;

        }


        // ----------------------------------------------------
        // Disable buttons while transaction is pending
        // ----------------------------------------------------

        disableVoteButtons();


        // ----------------------------------------------------
        // Get candidate name
        // ----------------------------------------------------

        let candidateName;


        if (candidateId === 0) {

            candidateName =
                "Candidate A";

        } else if (candidateId === 1) {

            candidateName =
                "Candidate B";

        } else {

            candidateName =
                "Candidate C";

        }


        console.log(
            "Voting for:",
            candidateName
        );

        console.log(
            "Candidate ID:",
            candidateId
        );

        console.log(
            "Wallet:",
            userAddress
        );


        // ----------------------------------------------------
        // Send transaction
        // ----------------------------------------------------

        const transaction =
            await votingContract.vote(
                candidateId
            );


        votingMessage.textContent =
            "Transaction submitted. Waiting for confirmation...";


        console.log(
            "Transaction hash:",
            transaction.hash
        );


        // ----------------------------------------------------
        // Wait for blockchain confirmation
        // ----------------------------------------------------

        await transaction.wait();


        // ----------------------------------------------------
        // Reload blockchain data
        // ----------------------------------------------------

        await loadVotes();

        await updateVotingStatus();

        await checkUserVote();


        alert(
            "Vote successfully cast for " +
            candidateName +
            "!"
        );


    } catch (error) {

        console.error(
            "Voting error:",
            error
        );


        // Re-check wallet state after error
        await checkUserVote();


        if (
            error.code === 4001
        ) {

            alert(
                "Transaction was rejected in MetaMask."
            );

        } else if (
            error.reason
        ) {

            alert(
                "Voting failed: " +
                error.reason
            );

        } else if (
            error.shortMessage
        ) {

            alert(
                "Voting failed: " +
                error.shortMessage
            );

        } else {

            alert(
                "Voting failed. Check the browser console and MetaMask."
            );

        }

    }

}


// ============================================================
// CANDIDATE BUTTON EVENT LISTENERS
// ============================================================

voteButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            const candidateId =
                Number(
                    button.dataset.candidateId
                );


            console.log(
                "Clicked candidate ID:",
                candidateId
            );


            vote(candidateId);

        }
    );

});


// ============================================================
// CONNECT BUTTON EVENT LISTENER
// ============================================================

connectWalletButton.addEventListener(
    "click",
    connectWallet
);


// ============================================================
// META MASK ACCOUNT CHANGE
// ============================================================

if (window.ethereum) {

    window.ethereum.on(
        "accountsChanged",
        async function (accounts) {

            console.log(
                "MetaMask account changed:",
                accounts
            );


            // No account connected
            if (
                !accounts ||
                accounts.length === 0
            ) {

                resetWalletState();

                return;

            }


            // ------------------------------------------------
            // IMPORTANT:
            // Do NOT call eth_requestAccounts here.
            //
            // MetaMask has already provided the new account.
            // Rebuild the signer and contract using it.
            // ------------------------------------------------

            await initializeWallet(accounts);

        }
    );


    // ========================================================
    // META MASK NETWORK CHANGE
    // ========================================================

    window.ethereum.on(
        "chainChanged",
        async function () {

            console.log(
                "MetaMask network changed."
            );


            // Recreate provider after network change

            provider =
                new ethers.BrowserProvider(
                    window.ethereum
                );


            const accounts =
                await window.ethereum.request({
                    method: "eth_accounts"
                });


            if (
                accounts &&
                accounts.length > 0
            ) {

                await initializeWallet(accounts);

            } else {

                resetWalletState();

            }

        }
    );

}


// ============================================================
// AUTO CONNECT ON PAGE LOAD
// ============================================================

window.addEventListener(
    "load",
    async function () {

        try {

            if (!window.ethereum) {

                console.log(
                    "MetaMask not detected."
                );

                return;

            }


            // ------------------------------------------------
            // eth_accounts checks existing permission silently
            // It does NOT open the MetaMask popup.
            // ------------------------------------------------

            const accounts =
                await window.ethereum.request({
                    method: "eth_accounts"
                });


            if (
                accounts &&
                accounts.length > 0
            ) {

                console.log(
                    "Existing MetaMask connection found."
                );


                await initializeWallet(
                    accounts
                );

            } else {

                console.log(
                    "No wallet connected to this website."
                );

            }


        } catch (error) {

            console.error(
                "Auto connection error:",
                error
            );

        }

    }
);