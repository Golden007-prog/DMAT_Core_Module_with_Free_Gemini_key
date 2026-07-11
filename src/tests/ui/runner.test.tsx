import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Runner from '../../ui/screens/Runner';
import Results from '../../ui/screens/Results';
import { sessionStore } from '../../state/sessionStore';
import { useSettings } from '../../state/settingsStore';
import type { LatinQuestion } from '../../engine/types';

function renderRunner() {
  return render(
    <MemoryRouter initialEntries={['/run']}>
      <Routes>
        <Route path="/" element={<div>home-screen</div>} />
        <Route path="/run" element={<Runner />} />
        <Route path="/results/:sessionId" element={<Results />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function prepareSession(
  over: {
    mode?: 'practice' | 'exam';
    subtest?: 'latin' | 'equations' | 'figures';
    count?: number;
  } = {},
) {
  await sessionStore.getState().startNewSession({
    mode: over.mode ?? 'practice',
    subtest: over.subtest ?? 'latin',
    difficulty: 'easy',
    questionCount: over.count ?? 3,
    seed: 1,
  });
}

beforeEach(() => {
  cleanup();
  sessionStore.setState({ session: null, progress: null, currentIndex: 0 });
  useSettings.setState({ instantFeedback: true, hideTimer: false, examNavFree: false });
});

describe('Runner', () => {
  it('redirects home when no session exists (R3 mount guard)', () => {
    renderRunner();
    expect(screen.getByText('home-screen')).toBeInTheDocument();
  });

  it('shows the arming screen at READY and starts only on click', async () => {
    await prepareSession();
    renderRunner();
    expect(screen.getByRole('button', { name: /start test/i })).toBeInTheDocument();
    expect(sessionStore.getState().session!.state).toBe('ready');
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50)); // post-paint rAF arming
    });
    expect(sessionStore.getState().session!.state).toBe('running');
  });

  it('latin: answering via letter buttons records the answer and shows instant feedback', async () => {
    await prepareSession();
    renderRunner();
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const q = sessionStore.getState().session!.questions[0] as LatinQuestion;
    fireEvent.click(screen.getByRole('radio', { name: `Answer ${q.solutionLetter}` }));
    expect(sessionStore.getState().session!.answers[q.id]).toBe(q.solutionLetter);
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
    expect(screen.getByText(/explanation/i)).toBeInTheDocument();
  });

  it('navigates with Next and submits from the last question', async () => {
    useSettings.setState({ instantFeedback: false });
    await prepareSession({ count: 2 });
    renderRunner();
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));
    // confirm dialog (unanswered questions)
    fireEvent.click(screen.getByRole('button', { name: /submit anyway/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(sessionStore.getState().session!.state).toBe('finished');
  });

  it('exam mode hides Previous and the question palette (forward-only)', async () => {
    await prepareSession({ mode: 'exam', count: 2 });
    renderRunner();
    fireEvent.click(screen.getByRole('button', { name: /start test/i }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(screen.queryByRole('button', { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no note-taking/i)).toBeInTheDocument();
  });
});
