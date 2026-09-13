async function checkGithubKey() {
    const key = document.getElementById("github_key").value;
    const response = await fetch("https://api.github.com/user", {
        method: "GET",
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${key}`,
            "X-GitHub-Api-Version": "2026-03-10"
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// https://api.github.com/repos/OWNER/REPO/commits
async function getCommits(OWNER, REPO) {
    const key = document.getElementById("github_key").value;
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/commits`, {
        method: "GET",
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${key}`,
            "X-GitHub-Api-Version": "2026-03-10"
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// https://api.github.com/repos/OWNER/REPO/commits/REF
async function getCommit(OWNER, REPO, commitSha) {
    const key = document.getElementById("github_key").value;
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/commits/${commitSha}`, {
        method: "GET",
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${key}`,
            "X-GitHub-Api-Version": "2026-03-10"
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// https://api.github.com/repos/OWNER/REPO/commits/REF/check-runs
async function getCIStatus(OWNER, REPO, SHA) {
    const key = document.getElementById("github_key").value;
    const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/commits/${SHA}/check-runs`, {
        method: "GET",
        headers: {
            "Accept": "application/vnd.github+json",
            "Authorization": `Bearer ${key}`,
            "X-GitHub-Api-Version": "2026-03-10"
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

export { getCommits, getCommit, getCIStatus, checkGithubKey };