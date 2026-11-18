#!/usr/bin/env python3
"""Pull and deploy the pushed main commit through cPanel UAPI (Python 3.9+).

Setup: create a token in cPanel > Security > Manage API Tokens, then set
CPANEL_API_TOKEN and CPANEL_USER in your environment. Run --list-repositories
 to find CPANEL_REPOSITORY_ROOT (the server's Git checkout, not public_html).

Usage:
    python3 scripts/deploy-cpanel.py --list-repositories
    python3 scripts/deploy-cpanel.py --repository-root /home/ardatas/repositories/ardatas.com

CPANEL_URL defaults to https://cpanel.ardatas.com. If the hosting proxy does
not expose /execute, set it to the provider's HTTPS cPanel endpoint on :2083.
The script deploys the committed .cpanel.yml, which publishes BOTH websites.
It does not build, commit, push, or upload uncommitted local files.
API reference: https://api.docs.cpanel.net/specifications/cpanel.openapi
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]


class DeployError(Exception):
    pass


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward an API credential to a login page or another host.
        return None


class CPanel:
    def __init__(self, url, user, token):
        parsed = urllib.parse.urlsplit(url)
        if (parsed.scheme != 'https' or not parsed.hostname or parsed.username
                or parsed.password or parsed.query or parsed.fragment
                or parsed.path not in ('', '/')):
            raise DeployError('CPANEL_URL must be an HTTPS origin without credentials or a path.')
        if not user or not token or any(c in user + token for c in '\r\n'):
            raise DeployError('Set CPANEL_USER and CPANEL_API_TOKEN in your environment.')
        self.url, self.user, self.token = url.rstrip('/'), user, token
        self.opener = urllib.request.build_opener(NoRedirect())

    def call(self, module, function, **params):
        url = f'{self.url}/execute/{module}/{function}'
        if params:
            url += '?' + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={
            'Authorization': f'cpanel {self.user}:{self.token}',
            'Accept': 'application/json',
        })
        try:
            with self.opener.open(req, timeout=30) as response:
                payload = json.load(response)
        except urllib.error.HTTPError as exc:
            raise DeployError(f'{module}/{function}: HTTP {exc.code}; check endpoint and token.') from None
        except (OSError, ValueError) as exc:
            raise DeployError(f'{module}/{function}: network or invalid JSON response ({type(exc).__name__}).') from None
        result = payload.get('result', payload) if isinstance(payload, dict) else {}
        if result.get('status') != 1:
            detail = str(result.get('errors') or 'API request failed').replace(self.token, '[redacted]')
            raise DeployError(f'{module}/{function}: {detail}')
        return result.get('data')


def repository(api, root):
    matches = [r for r in api.call('VersionControl', 'retrieve') or []
               if r.get('repository_root') == root]
    if len(matches) != 1:
        raise DeployError('Repository not found; run --list-repositories and use its exact path.')
    return matches[0]


def wait_for(check, timeout, label):
    deadline = time.monotonic() + timeout
    while True:
        result = check()
        if result:
            return result
        if time.monotonic() >= deadline:
            raise DeployError(f'Timed out waiting for {label}; the server job may still be running. Check cPanel before retrying.')
        time.sleep(min(3, max(0, deadline - time.monotonic())))


def deploy(api, root, expected, timeout):
    repo = repository(api, root)
    if repo.get('branch') != 'main' or repo.get('tasks'):
        raise DeployError('Repository must be on main with no pending version-control tasks.')
    for task in api.call('VersionControlDeployment', 'retrieve') or []:
        if task.get('repository_root') == root and not any(
                task.get('timestamps', {}).get(k) for k in ('succeeded', 'failed', 'canceled')):
            raise DeployError('A deployment is already pending; check cPanel before retrying.')
    print('Updating cPanel checkout from main...', flush=True)
    api.call('VersionControl', 'update', repository_root=root, branch='main')

    def updated():
        current = repository(api, root)
        if current.get('tasks'):
            return False
        if current.get('last_update', {}).get('identifier') != expected:
            return False
        if current.get('branch') != 'main' or current.get('deployable') != 1:
            raise DeployError('Updated repository is not deployable on main.')
        return current

    wait_for(updated, timeout, 'the expected commit')
    print(f'Deploying {expected} via .cpanel.yml (main site and Studyplan)...', flush=True)
    created = api.call('VersionControlDeployment', 'create', repository_root=root)
    if not isinstance(created, dict) or created.get('deploy_id') is None:
        raise DeployError('No deployment ID returned; check cPanel before retrying.')
    deployment_id = str(created['deploy_id'])
    print(f'Deployment {deployment_id}; log: {created.get("log_path", "see cPanel")}', flush=True)

    def completed():
        for task in api.call('VersionControlDeployment', 'retrieve') or []:
            if str(task.get('deploy_id')) != deployment_id or task.get('repository_root') != root:
                continue
            timestamps = task.get('timestamps', {})
            if timestamps.get('failed') or timestamps.get('canceled'):
                raise DeployError(f'Deployment {deployment_id} failed or was canceled; inspect its cPanel log.')
            if timestamps.get('succeeded'):
                state = task.get('repository_state', {})
                if state.get('identifier') != expected or state.get('branch') != 'main':
                    raise DeployError('Deployment completed with an unexpected commit or branch; inspect cPanel.')
                return task
        return False

    wait_for(completed, timeout, 'deployment completion')
    print(f'cPanel reports successful deployment of {expected}. Live HTTP content has not been verified.')


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--list-repositories', action='store_true', help='Read-only: list checkout paths and branches')
    parser.add_argument('--repository-root', default=os.getenv('CPANEL_REPOSITORY_ROOT'))
    parser.add_argument('--timeout', type=int, default=300, help='Maximum seconds per server phase (default: 300)')
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error('--timeout must be positive')
    if not args.list_repositories and not args.repository_root:
        parser.error('Set CPANEL_REPOSITORY_ROOT or pass --repository-root; use --list-repositories to find it.')
    api = CPanel(os.getenv('CPANEL_URL', 'https://cpanel.ardatas.com'),
                 os.getenv('CPANEL_USER', ''), os.getenv('CPANEL_API_TOKEN', ''))
    if args.list_repositories:
        for repo in api.call('VersionControl', 'retrieve') or []:
            print(f'{repo.get("repository_root")}  branch={repo.get("branch")}')
        return
    expected = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    remote = subprocess.check_output(['git', 'ls-remote', 'https://github.com/ardatas/ardatas.com.git',
                                      'refs/heads/main'], cwd=ROOT, text=True).split()
    if not re.fullmatch(r'[0-9a-f]{40}', expected) or not remote or remote[0] != expected:
        raise DeployError('Local HEAD must match GitHub main. Commit and push the intended release first.')
    deploy(api, args.repository_root, expected, args.timeout)


if __name__ == '__main__':
    try:
        main()
    except (DeployError, subprocess.CalledProcessError) as exc:
        print(f'Deployment stopped: {exc}', file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print('Stopped waiting; a queued server job may still run. Check cPanel.', file=sys.stderr)
        sys.exit(130)
