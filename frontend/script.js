
// ============================================================
// DECENTRALIZED VOTING SYSTEM - TIME BASED VERSION
// ============================================================

// IMPORTANT:
// Paste your NEW deployed contract address here after deployment.

const CONTRACT_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const HARDHAT_CHAIN_ID = "31337";


// ============================================================
// CONTRACT ABI
// ============================================================

const CONTRACT_ABI = [

    "function vote(uint256 candidateId)",

    "function getCandidateCount() view returns (uint256)",

    "function getCandidate(uint256 candidateId) view returns (string name, uint256 voteCount)",

    "function hasVoted(address) view returns (bool)",

    "function owner() view returns (address)",

    "function votingStartTime() view returns (uint256)",

    "function votingEndTime() view returns (uint256)",

    "function scheduleSet() view returns (bool)",

    "function manuallyEnded() view returns (bool)",

    "function setVotingSchedule(uint256 startTime, uint256 endTime)",

    "function votingActive() view returns (bool)",

    "function votingHasEnded() view returns (bool)"

];


// ============================================================
// GLOBAL VARIABLES
// ============================================================

let provider = null;
let signer = null;
let votingContract = null;

let userAddress = null;
let ownerAddress = null;

let currentVotingPhase = "not-connected";
let isAdmin = false;


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

const scheduleStatus =
    document.getElementById("scheduleStatus");

const countdown =
    document.getElementById("countdown");

const scheduleStartDisplay =
    document.getElementById("scheduleStartDisplay");

const scheduleEndDisplay =
    document.getElementById("scheduleEndDisplay");

const adminPanel =
    document.getElementById("adminPanel");

const startDateTime =
    document.getElementById("startDateTime");

const endDateTime =
    document.getElementById("endDateTime");

const setScheduleButton =
    document.getElementById("setScheduleButton");

const scheduleMessage =
    document.getElementById("scheduleMessage");

const voteButtons =
    document.querySelectorAll(".vote-button");


// ============================================================
// HELPER FUNCTIONS
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


function formatDate(timestamp) {

    if (!timestamp || Number(timestamp) === 0) {
        return "Not Set";
    }

    return new Date(
        Number(timestamp) * 1000
    ).toLocaleString();

}


function disableVoteButtons() {

    voteButtons.forEach(button => {
        button.disabled = true;
    });

}


function enableVoteButtons() {

    voteButtons.forEach(button => {
        button.disabled = false;
    });

}


function formatRemaining(seconds) {

    if (seconds <= 0) {
        return "00:00:00";
    }

    const days = Math.floor(seconds / 86400);

    const hours = Math.floor(
        (seconds % 86400) / 3600
    );

    const minutes = Math.floor(
        (seconds % 3600) / 60
    );

    const secs = seconds % 60;

    let result = "";

    if (days > 0) {
        result += days + " days ";
    }

    result +=
        String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(secs).padStart(2, "0");

    return result;
}


// ============================================================
// RESET WALLET STATE
// ============================================================

function resetWalletState() {

    provider = null;
    signer = null;
    votingContract = null;

    userAddress = null;
    ownerAddress = null;

    isAdmin = false;
    currentVotingPhase = "not-connected";

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

    scheduleStatus.textContent =
        "Schedule Not Set";

    countdown.textContent =
        "Connect your wallet to view the schedule.";

    scheduleStartDisplay.textContent =
        "Not Set";

    scheduleEndDisplay.textContent =
        "Not Set";

    adminPanel.hidden = true;

    disableVoteButtons();

}


// ============================================================
// CHECK NETWORK
// ============================================================

async function checkNetwork() {

    if (!provider) {
        return false;
    }

    const network = await provider.getNetwork();

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

        adminPanel.hidden = true;

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
            alert("MetaMask is not installed.");
            return;
        }

        if (!accounts || accounts.length === 0) {
            resetWalletState();
            return;
        }

        if (
            CONTRACT_ADDRESS ===
            "PASTE_NEW_CONTRACT_ADDRESS_HERE"
        ) {
            alert(
                "Please add the new deployed contract address in script.js."
            );
            return;
        }

        provider = new ethers.BrowserProvider(
            window.ethereum
        );

        signer = await provider.getSigner(
            accounts[0]
        );

        userAddress = await signer.getAddress();

        walletStatus.textContent =
            "Wallet: " + shortenAddress(userAddress);

        walletSystemStatus.textContent =
            shortenAddress(userAddress);

        connectWalletButton.textContent =
            "Wallet Connected";

        const correctNetwork =
            await checkNetwork();

        if (!correctNetwork) {
            votingContract = null;
            adminPanel.hidden = true;
            return;
        }

        // Verify that the contract exists on this network.
        const contractCode =
            await provider.getCode(CONTRACT_ADDRESS);

        if (contractCode === "0x") {
            throw new Error(
                "No contract found at this address. Check the deployment address."
            );
        }

        votingContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            CONTRACT_ABI,
            signer
        );

        contractStatus.textContent =
            "Deployed";

        // Identify the contract owner.
        ownerAddress =
            await votingContract.owner();

        isAdmin =
            userAddress.toLowerCase() ===
            ownerAddress.toLowerCase();

        adminPanel.hidden = !isAdmin;

        if (isAdmin) {
            scheduleMessage.textContent =
                "Admin account connected.";
        }

        await loadVotes();

        await updateVotingStatus();

        await checkUserVote();

    } catch (error) {

        console.error(
            "Wallet initialization error:",
            error
        );

        votingMessage.textContent =
            error.message ||
            "Unable to connect wallet.";

        disableVoteButtons();

    }

}


// ============================================================
// CONNECT WALLET
// ============================================================

async function connectWallet() {

    try {

        if (!window.ethereum) {
            alert("MetaMask is not installed.");
            return;
        }

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

        votingMessage.textContent =
            error.code === 4001
                ? "Wallet connection was rejected."
                : "Unable to connect wallet.";

    }

}


// ============================================================
// LOAD SCHEDULE FROM BLOCKCHAIN
// ============================================================

async function loadSchedule() {

    if (!votingContract) {
        return null;
    }

    const scheduled =
        await votingContract.scheduleSet();

    if (!scheduled) {

        scheduleStartDisplay.textContent =
            "Not Set";

        scheduleEndDisplay.textContent =
            "Not Set";

        return {
            scheduled: false
        };
    }

    const start =
        await votingContract.votingStartTime();

    const end =
        await votingContract.votingEndTime();

    scheduleStartDisplay.textContent =
        formatDate(start);

    scheduleEndDisplay.textContent =
        formatDate(end);

    return {
        scheduled: true,
        start: Number(start),
        end: Number(end)
    };

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

        const schedule =
            await loadSchedule();

        if (!schedule || !schedule.scheduled) {

            currentVotingPhase =
                "not-scheduled";

            scheduleStatus.textContent =
                "Schedule Not Set";

            countdown.textContent =
                "Waiting for admin to set the schedule.";

            votingStatus.textContent =
                "Not Scheduled";

            votingTitle.textContent =
                "Voting Not Yet Scheduled";

            votingMessage.textContent =
                "The admin must set the voting start and end times.";

            disableVoteButtons();

            return;
        }

        const manuallyEnded =
            await votingContract.manuallyEnded();

        // Browser time is used for the countdown and display.
        // The smart contract's block.timestamp is authoritative
        // when a voting transaction is executed.

        const now =
            Math.floor(Date.now() / 1000);

        if (manuallyEnded || now > schedule.end) {

            currentVotingPhase = "ended";

            scheduleStatus.textContent =
                "Voting Ended";

            countdown.textContent =
                "The voting period has ended.";

            votingStatus.textContent =
                "Ended";

            votingTitle.textContent =
                "Voting Ended";

            votingMessage.textContent =
                "The voting process has ended. No further votes are accepted.";

            disableVoteButtons();

        } else if (now < schedule.start) {

            currentVotingPhase =
                "not-started";

            scheduleStatus.textContent =
                "Voting Not Started";

            countdown.textContent =
                "Voting starts in: " +
                formatRemaining(schedule.start - now);

            votingStatus.textContent =
                "Not Started";

            votingTitle.textContent =
                "Voting Not Yet Started";

            votingMessage.textContent =
                "Voting will automatically start at the scheduled time.";

            disableVoteButtons();

        } else {

            currentVotingPhase =
                "active";

            scheduleStatus.textContent =
                "Voting Active";

            countdown.textContent =
                "Voting ends in: " +
                formatRemaining(schedule.end - now);

            votingStatus.textContent =
                "Active";

            votingTitle.textContent =
                "Voting Is Active";

            votingMessage.textContent =
                "Select one candidate and cast your vote.";

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

        if (!votingContract || !userAddress) {
            disableVoteButtons();
            return;
        }

        if (currentVotingPhase !== "active") {
            disableVoteButtons();
            return;
        }

        const alreadyVoted =
            await votingContract.hasVoted(userAddress);

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
// LOAD VOTES
// ============================================================

async function loadVotes() {

    try {

        if (!votingContract) {
            return;
        }

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

    } catch (error) {

        console.error(
            "Loading votes error:",
            error
        );

    }

}


// ============================================================
// ADMIN: SET VOTING SCHEDULE
// ============================================================

async function setVotingSchedule() {

    try {

        if (!votingContract || !isAdmin) {

            alert(
                "Only the admin can set the voting schedule."
            );

            return;
        }

        if (!startDateTime.value || !endDateTime.value) {

            alert(
                "Please select both start and end date/time."
            );

            return;
        }

        const startMilliseconds =
            new Date(startDateTime.value).getTime();

        const endMilliseconds =
            new Date(endDateTime.value).getTime();

        if (
            !Number.isFinite(startMilliseconds) ||
            !Number.isFinite(endMilliseconds)
        ) {

            alert("Please enter valid date and time values.");

            return;
        }

        const startTime =
            Math.floor(startMilliseconds / 1000);

        const endTime =
            Math.floor(endMilliseconds / 1000);

        const now =
            Math.floor(Date.now() / 1000);

        if (startTime <= now) {

            alert(
                "Voting start time must be in the future."
            );

            return;
        }

        if (endTime <= startTime) {

            alert(
                "Voting end time must be after start time."
            );

            return;
        }

        setScheduleButton.disabled = true;

        setScheduleButton.textContent =
            "Waiting for MetaMask...";

        scheduleMessage.textContent =
            "Please confirm the schedule transaction in MetaMask.";

        const transaction =
            await votingContract.setVotingSchedule(
                startTime,
                endTime
            );

        setScheduleButton.textContent =
            "Transaction Submitted";

        scheduleMessage.textContent =
            "Waiting for blockchain confirmation...";

        await transaction.wait();

        scheduleMessage.textContent =
            "Voting schedule successfully saved on the blockchain.";

        alert(
            "Voting schedule successfully set!"
        );

        await updateVotingStatus();

        await checkUserVote();

    } catch (error) {

        console.error(
            "Schedule setting error:",
            error
        );

        const message =
            error.reason ||
            error.shortMessage ||
            error.message ||
            "Unable to set schedule.";

        scheduleMessage.textContent =
            "Error: " + message;

        alert(
            "Schedule setting failed: " + message
        );

    } finally {

        setScheduleButton.disabled = false;

        setScheduleButton.textContent =
            "Set Voting Schedule";

    }

}


// ============================================================
// VOTE FUNCTION
// ============================================================

async function vote(candidateId) {

    try {

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

        if (
            candidateId !== 0 &&
            candidateId !== 1 &&
            candidateId !== 2
        ) {

            alert("Invalid candidate.");

            return;
        }

        // Refresh status before submitting.
        await updateVotingStatus();

        if (currentVotingPhase !== "active") {

            alert(
                "Voting is not currently active."
            );

            return;
        }

        const alreadyVoted =
            await votingContract.hasVoted(userAddress);

        if (alreadyVoted) {

            alert(
                "This wallet has already voted."
            );

            disableVoteButtons();

            return;
        }

        let candidateName;

        if (candidateId === 0) {
            candidateName = "Candidate A";
        } else if (candidateId === 1) {
            candidateName = "Candidate B";
        } else {
            candidateName = "Candidate C";
        }

        disableVoteButtons();

        votingMessage.textContent =
            "Please confirm your vote in MetaMask.";

        const transaction =
            await votingContract.vote(candidateId);

        votingMessage.textContent =
            "Transaction submitted. Waiting for confirmation...";

        await transaction.wait();

        await loadVotes();

        await updateVotingStatus();

        await checkUserVote();

        alert(
            "Vote successfully cast for " +
            candidateName + "!"
        );

    } catch (error) {

        console.error(
            "Voting error:",
            error
        );

        await updateVotingStatus();

        await checkUserVote();

        const message =
            error.reason ||
            error.shortMessage ||
            error.message ||
            "Voting failed.";

        alert(
            "Voting failed: " + message
        );

    }

}


// ============================================================
// CANDIDATE BUTTON LISTENERS
// ============================================================

voteButtons.forEach(button => {

    button.addEventListener(
        "click",
        function () {

            const candidateId =
                Number(button.dataset.candidateId);

            vote(candidateId);

        }
    );

});


// ============================================================
// ADMIN SCHEDULE BUTTON
// ============================================================

setScheduleButton.addEventListener(
    "click",
    setVotingSchedule
);


// ============================================================
// CONNECT WALLET BUTTON
// ============================================================

connectWalletButton.addEventListener(
    "click",
    connectWallet
);


// ============================================================
// METAMASK ACCOUNT CHANGE
// ============================================================

if (window.ethereum) {

    window.ethereum.on(
        "accountsChanged",
        async function (accounts) {

            if (!accounts || accounts.length === 0) {

                resetWalletState();

                return;
            }

            await initializeWallet(accounts);

        }
    );


    // ========================================================
    // METAMASK NETWORK CHANGE
    // ========================================================

    window.ethereum.on(
        "chainChanged",
        async function () {

            const accounts =
                await window.ethereum.request({
                    method: "eth_accounts"
                });

            if (accounts && accounts.length > 0) {

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
                console.log("MetaMask not detected.");
                return;
            }

            const accounts =
                await window.ethereum.request({
                    method: "eth_accounts"
                });

            if (accounts && accounts.length > 0) {

                await initializeWallet(accounts);

            }

        } catch (error) {

            console.error(
                "Auto connection error:",
                error
            );

        }

    }
);


// ============================================================
// AUTOMATIC STATUS REFRESH
// ============================================================

// Refresh schedule and status every 5 seconds.
// No transaction is needed to start or end voting.

setInterval(
    async function () {

        if (!votingContract) {
            return;
        }

        await updateVotingStatus();

        await checkUserVote();

    },
    5000
);
