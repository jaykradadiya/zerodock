import { useState, useEffect } from 'react';
import { GitBranch, Copy, Check } from 'lucide-react';
import { createToolStore } from '../../../core/store/useToolState';
import { updateURLWithState, getStateFromURL } from '../../../shared/utils/state-share';

interface GitGeneratorState {
  scenario: string;
}

const scenarios = [
  {
    id: 'undo-commit-keep-changes',
    label: 'Undo last commit (keep changes)',
    command: 'git reset --soft HEAD~1',
    description: 'Removes the last commit from history, but keeps all your modified files staged and ready to be committed again.'
  },
  {
    id: 'undo-commit-discard-changes',
    label: 'Undo last commit (discard all changes)',
    command: 'git reset --hard HEAD~1',
    description: 'WARNING: This will completely destroy the last commit and all changes made in it. They cannot be recovered easily.'
  },
  {
    id: 'squash-commits',
    label: 'Squash last N commits into one',
    command: 'git rebase -i HEAD~3\n# Replace 3 with the number of commits you want to squash.\n# In the editor, change "pick" to "squash" or "s" for all but the first commit.',
    description: 'Opens an interactive rebase editor allowing you to combine multiple messy commits into a single clean commit.'
  },
  {
    id: 'rename-branch-local',
    label: 'Rename the current local branch',
    command: 'git branch -m new-branch-name',
    description: 'Renames the branch you are currently on.'
  },
  {
    id: 'delete-remote-branch',
    label: 'Delete a branch on remote (GitHub/GitLab)',
    command: 'git push origin --delete branch-name',
    description: 'Deletes the specified branch from the remote server.'
  },
  {
    id: 'discard-uncommitted',
    label: 'Discard all uncommitted local changes',
    command: 'git checkout .\ngit clean -fd',
    description: 'Reverts all tracked files to their last committed state and deletes any untracked files or directories.'
  },
  {
    id: 'stashing',
    label: 'Stash changes and pop them later',
    command: 'git stash\n# ... do some other work, switch branches ...\ngit stash pop',
    description: 'Temporarily shelves your uncommitted changes so you can work on something else, then applies them back when you are ready.'
  },
  {
    id: 'change-commit-message',
    label: 'Change the message of the last commit',
    command: 'git commit --amend -m "New better commit message"',
    description: 'Updates the commit message of your most recent commit. Do not use this if you have already pushed to a shared remote.'
  }
];

const useGitStore = createToolStore<GitGeneratorState>('git-generator', {
  scenario: scenarios[0].id,
});

export default function GitGenerator() {
  const { scenario, setValues } = useGitStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const urlState = getStateFromURL<GitGeneratorState>();
    if (urlState && urlState.scenario) {
      setValues(urlState);
    }
  }, []);

  const activeScenario = scenarios.find(s => s.id === scenario) || scenarios[0];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(activeScenario.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center p-4 sm:p-6 md:p-8 xl:p-10 2xl:p-12 w-full max-w-4xl 2xl:max-w-5xl mx-auto h-full min-h-0">
      <div className="w-full flex items-center gap-4 mb-8 shrink-0">
        <div className="w-12 h-12 rounded-xl bg-[var(--zd-primary-soft)] flex items-center justify-center text-[var(--zd-primary)]">
          <GitBranch className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl 2xl:text-3xl font-bold text-[var(--zd-text-primary)]">Git Command Generator</h1>
          <p className="text-[var(--zd-text-secondary)]">Find the right Git command for the right scenario</p>
        </div>
      </div>

      <div className="w-full bg-[var(--zd-bg)] rounded-2xl border border-[var(--zd-border)] shadow-sm overflow-hidden p-6 flex flex-col gap-8">
        
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-[var(--zd-text-muted)] uppercase tracking-wider">What do you want to do?</label>
          <select
            value={scenario}
            onChange={(e) => {
              setValues({ scenario: e.target.value });
              updateURLWithState({ scenario: e.target.value });
            }}
            className="w-full px-4 py-3 bg-[var(--zd-surface)] border border-[var(--zd-border)] rounded-lg text-sm font-semibold focus:outline-none focus:border-orange-500 text-[var(--zd-text-primary)]"
          >
            {scenarios.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            <div className="px-4 py-2 bg-slate-800 flex justify-between items-center border-b border-slate-700">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Terminal</span>
              <button onClick={copyToClipboard} className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="p-6">
              <pre className="text-sm font-mono text-green-400 whitespace-pre-wrap leading-relaxed">
                {activeScenario.command}
              </pre>
            </div>
          </div>
          
          <div className="bg-[var(--zd-surface)]/50 p-4 rounded-lg border border-[var(--zd-border)]">
            <p className="text-sm text-[var(--zd-text-secondary)] leading-relaxed">
              <span className="font-semibold text-[var(--zd-text-primary)]">Explanation:</span> {activeScenario.description}
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
