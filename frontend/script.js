let votes = {
    A: 0,
    B: 0,
    C: 0
};

function vote(candidate) {

    votes[candidate]++;

    document.getElementById(
        "votes" + candidate
    ).textContent = votes[candidate];
}


document.getElementById("connectWallet")
    .addEventListener("click", function () {

        document.getElementById("walletStatus").textContent =
            "Wallet connection will be added with MetaMask.";

    });