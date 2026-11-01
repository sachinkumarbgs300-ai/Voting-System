// ============================================================
// DECENTRALIZED VOTING SYSTEM - DYNAMIC CANDIDATES + SCHEDULE
// ============================================================

// IMPORTANT: Replace this with the address printed by your latest deployment.
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const HARDHAT_CHAIN_ID = "31337";

// ABI for the updated Voting.sol contract.
const CONTRACT_ABI = [
    "function vote(uint256 candidateId)",
    "function addCandidate(string name)",
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
    "function votingHasEnded() view returns (bool)",
    "event CandidateAdded(uint256 indexed candidateId, string name)"
];

// ============================================================
// GLOBAL STATE
// ============================================================

let provider = null;
let signer = null;
let votingContract = null;
let userAddress = null;
let ownerAddress = null;
let currentVotingPhase = "not-connected";
let isAdmin = false;
let candidateData = [];
let userHasVoted = false;

// ============================================================
// DOM ELEMENTS
// ============================================================

const connectWalletButton = document.getElementById("connectWallet");
const walletStatus = document.getElementById("walletStatus");
const walletSystemStatus = document.getElementById("walletSystemStatus");
const networkStatus = document.getElementById("networkStatus");
const contractStatus = document.getElementById("contractStatus");
const votingStatus = document.getElementById("votingStatus");
const votingTitle = document.getElementById("votingTitle");
const votingMessage = document.getElementById("votingMessage");
const scheduleStatus = document.getElementById("scheduleStatus");
const countdown = document.getElementById("countdown");
const scheduleStartDisplay = document.getElementById("scheduleStartDisplay");
const scheduleEndDisplay = document.getElementById("scheduleEndDisplay");
const adminPanel = document.getElementById("adminPanel");
const scheduleControls = document.getElementById("scheduleControls");
const candidateManagement = document.getElementById("candidateManagement");
const startDateTime = document.getElementById("startDateTime");
const endDateTime = document.getElementById("endDateTime");
const setScheduleButton = document.getElementById("setScheduleButton");
const scheduleMessage = document.getElementById("scheduleMessage");
const candidateNameInput = document.getElementById("candidateName");
const addCandidateButton = document.getElementById("addCandidateButton");
const candidateMessage = document.getElementById("candidateMessage");
const adminCandidateList = document.getElementById("adminCandidateList");
const candidatesList = document.getElementById("candidatesList");

// ============================================================
// HELPERS
// ============================================================

function shortenAddress(address) {
    if (!address) return "Not Connected";
    return address.substring(0, 6) + "..." + address.substring(address.length - 4);
}

function formatDate(timestamp) {
    if (!timestamp || Number(timestamp) === 0) return "Not Set";
    return new Date(Number(timestamp) * 1000).toLocaleString();
}

function formatRemaining(seconds) {
    if (seconds <= 0) return "00:00:00";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    let result = "";
    if (days > 0) result += days + " days ";
    result += String(hours).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(secs).padStart(2, "0");
    return result;
}

function setVoteButtonsDisabled(disabled) {
    document.querySelectorAll(".vote-button").forEach(button => {
        button.disabled = disabled;
    });
}

function setCandidateManagementAvailability(available) {
    if (!isAdmin) {
        candidateManagement.hidden = true;
        return;
    }
    candidateManagement.hidden = !available;
    if (!available) {
        candidateMessage.textContent = "Candidate registration is closed because voting has started or the scheduled start time has passed.";
    }
}

function showEmptyCandidates(message) {
    candidatesList.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.className = "empty-candidates";
    paragraph.textContent = message;
    candidatesList.appendChild(paragraph);
}

function renderAdminCandidateList() {
    adminCandidateList.replaceChildren();

    if (candidateData.length === 0) {
        const item = document.createElement("li");
        item.textContent = "No candidates added yet.";
        adminCandidateList.appendChild(item);
        return;
    }

    candidateData.forEach((candidate, index) => {
        const item = document.createElement("li");
        item.textContent = `${index + 1}. ${candidate.name}`;
        adminCandidateList.appendChild(item);
    });
}

function renderCandidates() {
    candidatesList.replaceChildren();

    if (candidateData.length === 0) {
        showEmptyCandidates(
            votingContract
                ? "No candidates have been added yet. The admin must add candidates before voting can be scheduled."
                : "Connect your MetaMask wallet to load the candidates."
        );
        renderAdminCandidateList();
        return;
    }

    candidateData.forEach((candidate, index) => {
        const card = document.createElement("article");
        card.className = "candidate";

        const icon = document.createElement("div");
        icon.className = "candidate-icon";
        icon.textContent = String(index + 1);

        const name = document.createElement("h2");
        name.textContent = candidate.name;

        const role = document.createElement("p");
        role.className = "candidate-role";
        role.textContent = `Candidate ${index + 1}`;

        const votes = document.createElement("div");
        votes.className = "votes";
        votes.append("Votes: ");

        const voteCount = document.createElement("span");
        voteCount.textContent = candidate.voteCount.toString();
        votes.appendChild(voteCount);

        const button = document.createElement("button");
        button.className = "vote-button";
        button.textContent = "Vote";
        button.dataset.candidateId = String(index);
        button.disabled = true;
        button.setAttribute("aria-label", `Vote for ${candidate.name}`);

        card.append(icon, name, role, votes, button);
        candidatesList.appendChild(card);
    });

    renderAdminCandidateList();
}

function resetWalletState() {
    provider = null;
    signer = null;
    votingContract = null;
    userAddress = null;
    ownerAddress = null;
    isAdmin = false;
    candidateData = [];
    userHasVoted = false;
    currentVotingPhase = "not-connected";

    walletStatus.textContent = "Wallet: Not Connected";
    walletSystemStatus.textContent = "Not Connected";
    networkStatus.textContent = "Not Connected";
    contractStatus.textContent = "Not Connected";
    votingStatus.textContent = "Not Connected";
    votingTitle.textContent = "Voting System";
    votingMessage.textContent = "Connect your MetaMask wallet to access the voting system.";
    connectWalletButton.textContent = "Connect Wallet";
    scheduleStatus.textContent = "Schedule Not Set";
    countdown.textContent = "Connect your wallet to view the schedule.";
    scheduleStartDisplay.textContent = "Not Set";
    scheduleEndDisplay.textContent = "Not Set";
    adminPanel.hidden = true;
    candidateManagement.hidden = true;
    scheduleControls.hidden = false;
    setVoteButtonsDisabled(true);
    showEmptyCandidates("Connect your MetaMask wallet to load the candidates.");
}

async function checkNetwork() {
    if (!provider) return false;

    const network = await provider.getNetwork();
    if (network.chainId.toString() !== HARDHAT_CHAIN_ID) {
        networkStatus.textContent = "Wrong Network";
        contractStatus.textContent = "Unavailable";
        votingStatus.textContent = "Wrong Network";
        votingTitle.textContent = "Wrong Network";
        votingMessage.textContent = "Please switch MetaMask to Hardhat Local (Chain ID 31337).";
        adminPanel.hidden = true;
        setVoteButtonsDisabled(true);
        return false;
    }

    networkStatus.textContent = "Hardhat Local";
    return true;
}

// ============================================================
// WALLET INITIALIZATION / CONNECTION
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

        if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "PASTE_NEW_CONTRACT_ADDRESS_HERE") {
            throw new Error("Paste the new deployed contract address into CONTRACT_ADDRESS in script.js.");
        }

        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner(accounts[0]);
        userAddress = await signer.getAddress();

        walletStatus.textContent = "Wallet: " + shortenAddress(userAddress);
        walletSystemStatus.textContent = shortenAddress(userAddress);
        connectWalletButton.textContent = "Wallet Connected";

        const correctNetwork = await checkNetwork();
        if (!correctNetwork) {
            votingContract = null;
            adminPanel.hidden = true;
            return;
        }

        const contractCode = await provider.getCode(CONTRACT_ADDRESS);
        if (contractCode === "0x") {
            throw new Error("No contract found at this address. Check the latest deployment address.");
        }

        votingContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        contractStatus.textContent = "Deployed";

        ownerAddress = await votingContract.owner();
        isAdmin = userAddress.toLowerCase() === ownerAddress.toLowerCase();
        adminPanel.hidden = !isAdmin;

        if (isAdmin) {
            scheduleMessage.textContent = "Admin account connected.";
        }

        await loadCandidates();
        await updateVotingStatus();
        await checkUserVote();
    } catch (error) {
        console.error("Wallet initialization error:", error);
        votingMessage.textContent = error.shortMessage || error.message || "Unable to connect wallet.";
        contractStatus.textContent = "Connection Error";
        setVoteButtonsDisabled(true);
    }
}

async function connectWallet() {
    try {
        if (!window.ethereum) {
            alert("MetaMask is not installed.");
            return;
        }
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        await initializeWallet(accounts);
    } catch (error) {
        console.error("Connect wallet error:", error);
        votingMessage.textContent = error.code === 4001
            ? "Wallet connection was rejected."
            : (error.shortMessage || error.message || "Unable to connect wallet.");
    }
}

// ============================================================
// CANDIDATES: READ AND RENDER
// ============================================================

async function loadCandidates() {
    if (!votingContract) return;

    try {
        const count = Number(await votingContract.getCandidateCount());
        const loadedCandidates = [];

        for (let candidateId = 0; candidateId < count; candidateId++) {
            const candidate = await votingContract.getCandidate(candidateId);
            loadedCandidates.push({
                id: candidateId,
                name: candidate[0],
                voteCount: candidate[1]
            });
        }

        candidateData = loadedCandidates;
        renderCandidates();
    } catch (error) {
        console.error("Loading candidates error:", error);
        showEmptyCandidates("Unable to load candidates from the blockchain.");
    }
}

// ============================================================
// SCHEDULE: READ AND UPDATE STATUS
// ============================================================

async function loadSchedule() {
    if (!votingContract) return null;

    const scheduled = await votingContract.scheduleSet();
    if (!scheduled) {
        scheduleStartDisplay.textContent = "Not Set";
        scheduleEndDisplay.textContent = "Not Set";
        return { scheduled: false };
    }

    const start = await votingContract.votingStartTime();
    const end = await votingContract.votingEndTime();

    scheduleStartDisplay.textContent = formatDate(start);
    scheduleEndDisplay.textContent = formatDate(end);

    return {
        scheduled: true,
        start: Number(start),
        end: Number(end)
    };
}

async function updateVotingStatus() {
    try {
        if (!votingContract) {
            setVoteButtonsDisabled(true);
            return;
        }

        const schedule = await loadSchedule();

        if (!schedule || !schedule.scheduled) {
            currentVotingPhase = "not-scheduled";
            scheduleStatus.textContent = "Schedule Not Set";
            countdown.textContent = "Waiting for admin to set the schedule.";
            votingStatus.textContent = "Not Scheduled";
            votingTitle.textContent = "Voting Not Yet Scheduled";
            votingMessage.textContent = candidateData.length === 0
                ? "The admin must add candidates and then set the voting schedule."
                : "The admin must set the voting start and end times.";
            scheduleControls.hidden = !isAdmin;
            setCandidateManagementAvailability(true);
            setVoteButtonsDisabled(true);
            return;
        }

        const manuallyEnded = await votingContract.manuallyEnded();
        const now = Math.floor(Date.now() / 1000);

        // The browser clock is used for the countdown display.
        // The smart contract's block.timestamp is authoritative for transactions.
        const registrationOpen = now < schedule.start && !manuallyEnded;
        setCandidateManagementAvailability(registrationOpen);
        scheduleControls.hidden = !isAdmin || now >= schedule.start;

        if (manuallyEnded || now > schedule.end) {
            currentVotingPhase = "ended";
            scheduleStatus.textContent = "Voting Ended";
            countdown.textContent = "The voting period has ended.";
            votingStatus.textContent = "Ended";
            votingTitle.textContent = "Voting Ended";
            votingMessage.textContent = "The voting process has ended. No further votes are accepted.";
            setVoteButtonsDisabled(true);
        } else if (now < schedule.start) {
            currentVotingPhase = "not-started";
            scheduleStatus.textContent = "Voting Not Started";
            countdown.textContent = "Voting starts in: " + formatRemaining(schedule.start - now);
            votingStatus.textContent = "Not Started";
            votingTitle.textContent = "Voting Not Yet Started";
            votingMessage.textContent = "Voting will automatically start at the scheduled time.";
            setVoteButtonsDisabled(true);
        } else {
            currentVotingPhase = "active";
            scheduleStatus.textContent = "Voting Active";
            countdown.textContent = "Voting ends in: " + formatRemaining(schedule.end - now);
            votingStatus.textContent = "Active";
            votingTitle.textContent = "Voting Is Active";
            votingMessage.textContent = "Select one candidate and cast your vote.";
        }
    } catch (error) {
        console.error("Voting status error:", error);
        votingStatus.textContent = "Error";
        setVoteButtonsDisabled(true);
    }
}

async function checkUserVote() {
    try {
        if (!votingContract || !userAddress || currentVotingPhase !== "active") {
            userHasVoted = false;
            setVoteButtonsDisabled(true);
            return;
        }

        userHasVoted = await votingContract.hasVoted(userAddress);
        setVoteButtonsDisabled(userHasVoted);

        if (userHasVoted) {
            votingMessage.textContent = "This wallet has already voted.";
            votingStatus.textContent = "Already Voted";
        } else {
            votingMessage.textContent = "Select one candidate and cast your vote.";
        }
    } catch (error) {
        console.error("Checking user vote error:", error);
        setVoteButtonsDisabled(true);
    }
}

// ============================================================
// ADMIN: ADD CANDIDATE
// ============================================================

async function addCandidate() {
    if (!votingContract || !isAdmin) {
        alert("Only the admin can add candidates.");
        return;
    }

    const name = candidateNameInput.value.trim();
    if (!name) {
        candidateMessage.textContent = "Please enter a candidate name.";
        candidateNameInput.focus();
        return;
    }

    try {
        const schedule = await loadSchedule();
        const now = Math.floor(Date.now() / 1000);

        if (schedule && schedule.scheduled && now >= schedule.start) {
            candidateMessage.textContent = "Candidates can only be added before voting starts.";
            setCandidateManagementAvailability(false);
            return;
        }

        addCandidateButton.disabled = true;
        addCandidateButton.textContent = "Waiting for MetaMask...";
        candidateMessage.textContent = "Confirm the add-candidate transaction in MetaMask.";

        const transaction = await votingContract.addCandidate(name);

        addCandidateButton.textContent = "Transaction Submitted";
        candidateMessage.textContent = "Waiting for blockchain confirmation...";
        await transaction.wait();

        candidateNameInput.value = "";
        candidateMessage.textContent = `Candidate "${name}" was successfully added to the blockchain.`;
        await loadCandidates();
        await updateVotingStatus();
    } catch (error) {
        console.error("Add candidate error:", error);
        const message = error.reason || error.shortMessage || error.message || "Unable to add candidate.";
        candidateMessage.textContent = "Error: " + message;
    } finally {
        addCandidateButton.disabled = false;
        addCandidateButton.textContent = "Add Candidate";
    }
}

// ============================================================
// ADMIN: SET VOTING SCHEDULE
// ============================================================

async function setVotingSchedule() {
    try {
        if (!votingContract || !isAdmin) {
            alert("Only the admin can set the voting schedule.");
            return;
        }

        if (candidateData.length === 0) {
            scheduleMessage.textContent = "Add at least one candidate before setting the schedule.";
            return;
        }

        if (!startDateTime.value || !endDateTime.value) {
            scheduleMessage.textContent = "Please select both start and end date/time.";
            return;
        }

        const startMilliseconds = new Date(startDateTime.value).getTime();
        const endMilliseconds = new Date(endDateTime.value).getTime();

        if (!Number.isFinite(startMilliseconds) || !Number.isFinite(endMilliseconds)) {
            scheduleMessage.textContent = "Please enter valid date and time values.";
            return;
        }

        const startTime = Math.floor(startMilliseconds / 1000);
        const endTime = Math.floor(endMilliseconds / 1000);
        const now = Math.floor(Date.now() / 1000);

        if (startTime <= now) {
            scheduleMessage.textContent = "Voting start time must be in the future.";
            return;
        }
        if (endTime <= startTime) {
            scheduleMessage.textContent = "Voting end time must be after start time.";
            return;
        }

        setScheduleButton.disabled = true;
        setScheduleButton.textContent = "Waiting for MetaMask...";
        scheduleMessage.textContent = "Please confirm the schedule transaction in MetaMask.";

        const transaction = await votingContract.setVotingSchedule(startTime, endTime);

        setScheduleButton.textContent = "Transaction Submitted";
        scheduleMessage.textContent = "Waiting for blockchain confirmation...";
        await transaction.wait();

        scheduleMessage.textContent = "Voting schedule successfully saved on the blockchain.";
        await updateVotingStatus();
        await checkUserVote();
    } catch (error) {
        console.error("Schedule setting error:", error);
        const message = error.reason || error.shortMessage || error.message || "Unable to set schedule.";
        scheduleMessage.textContent = "Error: " + message;
    } finally {
        setScheduleButton.disabled = false;
        setScheduleButton.textContent = "Set Voting Schedule";
    }
}

// ============================================================
// VOTE
// ============================================================

async function vote(candidateId) {
    try {
        if (!votingContract || !signer || !userAddress) {
            alert("Please connect your MetaMask wallet first.");
            return;
        }

        if (!Number.isInteger(candidateId) || candidateId < 0 || candidateId >= candidateData.length) {
            alert("Invalid candidate.");
            return;
        }

        await updateVotingStatus();
        if (currentVotingPhase !== "active") {
            alert("Voting is not currently active.");
            return;
        }

        const alreadyVoted = await votingContract.hasVoted(userAddress);
        if (alreadyVoted) {
            userHasVoted = true;
            setVoteButtonsDisabled(true);
            alert("This wallet has already voted.");
            return;
        }

        const selectedCandidate = candidateData[candidateId];
        setVoteButtonsDisabled(true);
        votingMessage.textContent = "Please confirm your vote in MetaMask.";

        const transaction = await votingContract.vote(candidateId);
        votingMessage.textContent = "Transaction submitted. Waiting for confirmation...";
        await transaction.wait();

        await loadCandidates();
        await updateVotingStatus();
        await checkUserVote();

        alert(`Your vote for ${selectedCandidate.name} was successfully cast!`);
    } catch (error) {
        console.error("Voting error:", error);
        await updateVotingStatus();
        await checkUserVote();
        const message = error.reason || error.shortMessage || error.message || "Voting failed.";
        alert("Voting failed: " + message);
    }
}

// Event delegation works for candidate cards created dynamically.
candidatesList.addEventListener("click", event => {
    const button = event.target.closest(".vote-button");
    if (!button || button.disabled) return;
    vote(Number(button.dataset.candidateId));
});

// ============================================================
// EVENT LISTENERS
// ============================================================

connectWalletButton.addEventListener("click", connectWallet);
setScheduleButton.addEventListener("click", setVotingSchedule);
addCandidateButton.addEventListener("click", addCandidate);

candidateNameInput.addEventListener("keydown", event => {
    if (event.key === "Enter" && !addCandidateButton.disabled && !candidateManagement.hidden) {
        addCandidate();
    }
});

if (window.ethereum) {
    window.ethereum.on("accountsChanged", async accounts => {
        if (!accounts || accounts.length === 0) {
            resetWalletState();
            return;
        }
        await initializeWallet(accounts);
    });

    window.ethereum.on("chainChanged", async () => {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
            await initializeWallet(accounts);
        } else {
            resetWalletState();
        }
    });
}

// ============================================================
// AUTO CONNECT AND PERIODIC REFRESH
// ============================================================

window.addEventListener("load", async () => {
    try {
        if (!window.ethereum) {
            console.log("MetaMask not detected.");
            return;
        }

        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
            await initializeWallet(accounts);
        }
    } catch (error) {
        console.error("Auto connection error:", error);
    }
});

// Refresh countdown and phase every five seconds.
// The smart contract itself enforces the actual voting window.
setInterval(async () => {
    if (!votingContract) return;
    await updateVotingStatus();
    await checkUserVote();
}, 5000);
