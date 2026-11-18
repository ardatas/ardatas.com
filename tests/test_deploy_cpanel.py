import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('deploy_cpanel', Path(__file__).resolve().parents[1] / 'scripts/deploy-cpanel.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
SHA = 'a' * 40
ROOT = '/home/ardatas/repositories/ardatas.com'


class FakeAPI:
    def __init__(self, outcome='succeeded', sha=SHA, branch='main'):
        self.calls = []
        self.created = False
        self.outcome, self.sha, self.branch = outcome, sha, branch

    def call(self, module, function, **params):
        self.calls.append((module, function, params))
        if module == 'VersionControl':
            if function == 'retrieve':
                return [{'repository_root': ROOT, 'branch': self.branch, 'deployable': 1,
                         'last_update': {'identifier': self.sha}, 'tasks': []}]
            return {}
        if function == 'create':
            self.created = True
            return {'deploy_id': '12'}
        if not self.created:
            return []
        return [{'deploy_id': 12, 'repository_root': ROOT,
                 'timestamps': {self.outcome: '123'},
                 'repository_state': {'identifier': self.sha, 'branch': 'main'}}]


class DeploymentTests(unittest.TestCase):
    def test_success_requires_matching_deployment(self):
        api = FakeAPI()
        m.deploy(api, ROOT, SHA, 1)
        self.assertIn(('VersionControl', 'update', {'repository_root': ROOT, 'branch': 'main'}), api.calls)
        self.assertTrue(api.created)

    def test_text_deployable_flag(self):
        api = FakeAPI()
        original = api.call
        def call(module, function, **params):
            data = original(module, function, **params)
            if module == 'VersionControl' and function == 'retrieve':
                data[0]['deployable'] = '1'
            return data
        api.call = call
        m.deploy(api, ROOT, SHA, 1)
        self.assertTrue(api.created)

    def test_blocked_flag_reports_status_without_deploying(self):
        api = FakeAPI()
        original = api.call
        def call(module, function, **params):
            data = original(module, function, **params)
            if module == 'VersionControl' and function == 'retrieve':
                data[0]['deployable'] = 0
            return data
        api.call = call
        with self.assertRaisesRegex(m.DeployError, 'deployable=0'):
            m.deploy(api, ROOT, SHA, 1)
        self.assertFalse(api.created)

    def test_failed_and_canceled_deployments_fail(self):
        for outcome in ('failed', 'canceled'):
            with self.subTest(outcome=outcome), self.assertRaises(m.DeployError):
                m.deploy(FakeAPI(outcome), ROOT, SHA, 1)

    def test_mismatched_commit_never_deploys(self):
        api = FakeAPI(sha='b' * 40)
        with self.assertRaisesRegex(m.DeployError, 'Timed out'):
            m.deploy(api, ROOT, SHA, 0)
        self.assertFalse(api.created)

    def test_wrong_branch_never_updates(self):
        api = FakeAPI(branch='other')
        with self.assertRaises(m.DeployError):
            m.deploy(api, ROOT, SHA, 1)
        self.assertEqual(len(api.calls), 1)

    def test_pending_deployment_is_not_success(self):
        with self.assertRaisesRegex(m.DeployError, 'Timed out'):
            m.deploy(FakeAPI(outcome='queued'), ROOT, SHA, 0)

    def test_api_errors_redact_token(self):
        api = m.CPanel('https://cpanel.ardatas.com', 'user', 'secret-token')
        with patch.object(api.opener, 'open') as request:
            request.return_value.__enter__.return_value.read.return_value = b'{"result":{"status":0,"errors":["secret-token invalid"]}}'
            with self.assertRaises(m.DeployError) as result:
                api.call('VersionControl', 'retrieve')
            self.assertNotIn('secret-token', str(result.exception))
            self.assertIn('[redacted]', str(result.exception))

    def test_credentials_and_https_required(self):
        for url, user, token in [('http://example.com', 'user', 'token'),
                                 ('https://example.com/path', 'user', 'token'),
                                 ('https://example.com', '', '')]:
            with self.assertRaises(m.DeployError):
                m.CPanel(url, user, token)

    def test_redirects_are_not_followed(self):
        self.assertIsNone(m.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://other.example'))


if __name__ == '__main__':
    unittest.main()
