// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract Voting {

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    Candidate[] public candidates;

    // Stores whether each wallet has already voted
    mapping(address => bool) public hasVoted;

    address public owner;

    bool public votingActive;

    event VoteCast(
        address indexed voter,
        uint256 indexed candidateId
    );

    event VotingEnded();

    constructor() {
        owner = msg.sender;

        votingActive = true;

        candidates.push(
            Candidate("Candidate A", 0)
        );

        candidates.push(
            Candidate("Candidate B", 0)
        );

        candidates.push(
            Candidate("Candidate C", 0)
        );
    }

    function vote(uint256 candidateId) public {

        require(
            votingActive,
            "Voting is not active"
        );

        require(
            !hasVoted[msg.sender],
            "You have already voted"
        );

        require(
            candidateId < candidates.length,
            "Invalid candidate"
        );

        // Mark this wallet as having voted
        hasVoted[msg.sender] = true;

        // Increase selected candidate's vote count
        candidates[candidateId].voteCount++;

        emit VoteCast(
            msg.sender,
            candidateId
        );
    }

    function endVoting() public {

        require(
            msg.sender == owner,
            "Only owner can end voting"
        );

        votingActive = false;

        emit VotingEnded();
    }

    function getCandidateCount()
        public
        view
        returns (uint256)
    {
        return candidates.length;
    }

    function getCandidate(uint256 candidateId)
        public
        view
        returns (
            string memory name,
            uint256 voteCount
        )
    {
        require(
            candidateId < candidates.length,
            "Invalid candidate"
        );

        Candidate memory candidate =
            candidates[candidateId];

        return (
            candidate.name,
            candidate.voteCount
        );
    }
}