const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    if (!line || /^\s*#/.test(line)) return;
    const index = line.indexOf('=');
    if (index === -1) return;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && !Object.prototype.hasOwnProperty.call(process.env, key)) {
      process.env[key] = value;
    }
  });
}

loadEnv(path.join(__dirname, '.env'));

const requiredVars = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
requiredVars.forEach(key => {
  if (!process.env[key]) {
    console.error(`Missing required env var ${key}`);
    process.exit(1);
  }
});

const repoPath = process.env.REPO_PATH || process.cwd();
const approvals = new Map();

function runGit(args) {
  const result = spawnSync('git', args, { cwd: repoPath, encoding: 'utf8' });
  if (result.error) {
    throw new Error(`Failed to run git ${args.join(' ')}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join('\n');
    throw new Error(output || `git ${args.join(' ')} exited with code ${result.status}`);
  }
  return result;
}

function parseStatusOutput(output) {
  const lines = output.split(/\r?\n/).filter(Boolean);
  const staged = [];
  const modified = [];
  const untracked = [];
  lines.forEach(line => {
    const status = line.slice(0, 2);
    const file = line.slice(3).trim();
    if (status === '??') {
      untracked.push(file);
      return;
    }
    if (status[0] !== ' ') {
      staged.push(file);
    }
    if (status[1] !== ' ') {
      modified.push(file);
    }
  });
  return { staged, modified, untracked };
}

async function gitStatusTool() {
  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim();
  const status = parseStatusOutput(runGit(['status', '--porcelain']).stdout);
  return { branch, ...status };
}

async function preparePushTool(input) {
  if (!input || typeof input.branch !== 'string' || typeof input.message !== 'string') {
    throw new Error('preparePush requires branch and message.');
  }
  runGit(['checkout', input.branch]);
  const stagedFiles = runGit(['diff', '--cached', '--name-only']).stdout.trim();
  if (!stagedFiles) {
    throw new Error('No staged changes. Stage files before calling preparePush.');
  }
  const commit = runGit(['commit', '-m', input.message]);
  const commitSha = runGit(['rev-parse', 'HEAD']).stdout.trim();
  approvals.set(input.branch, commitSha);
  return {
    branch: input.branch,
    commit: commitSha,
    output: [commit.stdout, commit.stderr].filter(Boolean).join('\n')
  };
}

async function pushWithApprovalTool(input) {
  if (!input || typeof input.branch !== 'string') {
    throw new Error('pushWithApproval requires branch.');
  }
  const commitSha = approvals.get(input.branch);
  if (!commitSha) {
    throw new Error('No prepared commit found for this branch.');
  }
  const push = runGit(['push', 'origin', input.branch]);
  approvals.delete(input.branch);
  const ci = await fetchCiStatus(input.branch, commitSha);
  return {
    branch: input.branch,
    commit: commitSha,
    pushOutput: [push.stdout, push.stderr].filter(Boolean).join('\n'),
    ciStatus: ci.status,
    workflow: ci.workflow,
    url: ci.url
  };
}

async function getCiStatusTool(input) {
  if (!input || typeof input.ref !== 'string') {
    throw new Error('getCiStatus requires ref.');
  }
  const runs = await listWorkflowRuns(input.ref);
  return runs;
}

async function fetchCiStatus(branch, commitSha) {
  const runs = await listWorkflowRuns(branch);
  if (!runs.length) {
    return { status: 'unknown', workflow: null, url: null };
  }
  const match = runs.find(run => run.head_sha === commitSha);
  const target = match || runs[0];
  return {
    status: target.conclusion || target.status,
    workflow: target.name,
    url: target.html_url
  };
}

async function listWorkflowRuns(branch) {
  const url = new URL(`https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/runs`);
  url.searchParams.set('per_page', '5');
  if (branch) {
    url.searchParams.set('branch', branch);
  }
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'mcp-github-server',
      'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github+json'
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub API error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return Array.isArray(data.workflow_runs)
    ? data.workflow_runs.map(run => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        head_sha: run.head_sha,
        html_url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at
      }))
    : [];
}

const manifest = {
  name: 'github-approval',
  label: 'GitHub Approval Flow',
  description: 'Manual approval for git push with CI feedback',
  tools: [
    { name: 'gitStatus', description: 'Show current git branch and status' },
    {
      name: 'preparePush',
      description: 'Create commit and cache for approval',
      input_schema: {
        type: 'object',
        properties: {
          branch: { type: 'string' },
          message: { type: 'string' }
        },
        required: ['branch', 'message']
      }
    },
    {
      name: 'pushWithApproval',
      description: 'Push after manual approval',
      input_schema: {
        type: 'object',
        properties: {
          branch: { type: 'string' }
        },
        required: ['branch']
      }
    },
    {
      name: 'getCiStatus',
      description: 'Fetch recent CI workflow runs',
      input_schema: {
        type: 'object',
        properties: {
          ref: { type: 'string' }
        },
        required: ['ref']
      }
    }
  ],
  env: ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO', 'REPO_PATH', 'PORT']
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

const tools = {
  gitStatus: gitStatusTool,
  preparePush: preparePushTool,
  pushWithApproval: pushWithApprovalTool,
  getCiStatus: getCiStatusTool
};

const port = Number(process.env.PORT || 3001);

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/manifest.json') {
      return sendJson(res, 200, manifest);
    }
    if (req.method === 'POST' && req.url === '/tools/call') {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', async () => {
        try {
          const payload = body ? JSON.parse(body) : {};
          const toolName = payload.tool;
          const input = payload.input || {};
          if (!toolName || !tools[toolName]) {
            throw new Error(`Unknown tool ${toolName}`);
          }
          const result = await tools[toolName](input);
          sendJson(res, 200, { ok: true, result });
        } catch (err) {
          sendJson(res, 400, { ok: false, error: err.message });
        }
      });
      return;
    }
    sendJson(res, 404, { ok: false, error: 'Not found' });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
});

server.listen(port, () => {
  console.log(`MCP GitHub server listening on port ${port}`);
});
