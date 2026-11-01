// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Voting {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    Candidate[] public candidates;
    mapping(address => bool) public hasVoted;

    address public owner;

    uint256 public votingStartTime;
    uint256 public votingEndTime;

    bool public scheduleSet;
    bool public manuallyEnded;

    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event VotingScheduleSet(uint256 startTime, uint256 endTime);
    event VotingEnded();

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    constructor() {
        owner = msg.sender;
        scheduleSet = false;
        manuallyEnded = false;
        // Candidates are intentionally not hardcoded.
        // The admin adds candidates through the website.
    }

    // Admin can add candidates until the scheduled start time.
    function addCandidate(string calldata name) external onlyOwner {
        require(bytes(name).length > 0, "Candidate name cannot be empty");

        if (scheduleSet) {
            require(
                block.timestamp < votingStartTime,
                "Candidates can only be added before voting starts"
            );
        }

        uint256 candidateId = candidates.length;
        candidates.push(Candidate(name, 0));

        emit CandidateAdded(candidateId, name);
    }

    // Admin sets or changes the schedule before voting starts.
    function setVotingSchedule(
        uint256 startTime,
        uint256 endTime
    ) external onlyOwner {
        require(candidates.length > 0, "Add at least one candidate first");

        require(
            !scheduleSet || block.timestamp < votingStartTime,
            "Schedule cannot be changed after voting starts"
        );

        require(startTime > block.timestamp, "Start time must be in the future");
        require(endTime > startTime, "End time must be after start time");

        votingStartTime = startTime;
        votingEndTime = endTime;
        scheduleSet = true;
        manuallyEnded = false;

        emit VotingScheduleSet(startTime, endTime);
    }

    function votingActive() public view returns (bool) {
        if (!scheduleSet || manuallyEnded) {
            return false;
        }

        return (
            block.timestamp >= votingStartTime &&
            block.timestamp <= votingEndTime
        );
    }

    function votingHasEnded() public view returns (bool) {
        return (
            manuallyEnded ||
            (scheduleSet && block.timestamp > votingEndTime)
        );
    }

    function vote(uint256 candidateId) external {
        require(votingActive(), "Voting is not active or outside schedule");
        require(!hasVoted[msg.sender], "You have already voted");
        require(candidateId < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount++;

        emit VoteCast(msg.sender, candidateId);
    }

    function endVoting() external onlyOwner {
        require(votingActive(), "Voting is not active");
        manuallyEnded = true;
        emit VotingEnded();
    }

    function getCandidateCount() external view returns (uint256) {
        return candidates.length;
    }

    function getCandidate(
        uint256 candidateId
    ) external view returns (string memory name, uint256 voteCount) {
        require(candidateId < candidates.length, "Invalid candidate");

        Candidate memory candidate = candidates[candidateId];
        return (candidate.name, candidate.voteCount);
    }
}
