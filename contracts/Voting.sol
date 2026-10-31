
// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract Voting {

    struct Candidate {
        string name;
        uint256 voteCount;
    }

    Candidate[] public candidates;

    // One vote per wallet address
    mapping(address => bool) public hasVoted;

    address public owner;

    // Voting schedule
    uint256 public votingStartTime;
    uint256 public votingEndTime;

    bool public scheduleSet;
    bool public manuallyEnded;

    event VoteCast(
        address indexed voter,
        uint256 indexed candidateId
    );

    event VotingScheduleSet(
        uint256 startTime,
        uint256 endTime
    );

    event VotingEnded();

    modifier onlyOwner() {
        require(
            msg.sender == owner,
            "Only owner can perform this action"
        );
        _;
    }

    constructor() {
        owner = msg.sender;

        scheduleSet = false;
        manuallyEnded = false;

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

    // Admin sets or changes the schedule before voting starts.
    function setVotingSchedule(
        uint256 startTime,
        uint256 endTime
    ) external onlyOwner {

        require(
            !scheduleSet || block.timestamp < votingStartTime,
            "Schedule cannot be changed after voting starts"
        );

        require(
            startTime > block.timestamp,
            "Start time must be in the future"
        );

        require(
            endTime > startTime,
            "End time must be after start time"
        );

        votingStartTime = startTime;
        votingEndTime = endTime;

        scheduleSet = true;
        manuallyEnded = false;

        emit VotingScheduleSet(
            startTime,
            endTime
        );
    }

    // Automatically checks whether voting is currently active.
    function votingActive() public view returns (bool) {

        if (!scheduleSet || manuallyEnded) {
            return false;
        }

        return (
            block.timestamp >= votingStartTime &&
            block.timestamp <= votingEndTime
        );
    }

    // Returns whether the scheduled voting period has ended.
    function votingHasEnded() public view returns (bool) {

        return (
            manuallyEnded ||
            (
                scheduleSet &&
                block.timestamp > votingEndTime
            )
        );
    }

    // Cast vote
    function vote(uint256 candidateId) public {

        require(
            votingActive(),
            "Voting is not active or outside schedule"
        );

        require(
            !hasVoted[msg.sender],
            "You have already voted"
        );

        require(
            candidateId < candidates.length,
            "Invalid candidate"
        );

        hasVoted[msg.sender] = true;

        candidates[candidateId].voteCount++;

        emit VoteCast(
            msg.sender,
            candidateId
        );
    }

    // Admin can still end voting early if necessary.
    function endVoting() external onlyOwner {

        require(
            votingActive(),
            "Voting is not active"
        );

        manuallyEnded = true;

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
