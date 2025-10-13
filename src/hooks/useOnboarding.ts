import { useState, useEffect } from 'react';

interface OnboardingState {
  isCompleted: boolean;
  completedAt: string | null;
  shouldShow: boolean;
}

export const useOnboarding = () => {
  const [state, setState] = useState<OnboardingState>({
    isCompleted: false,
    completedAt: null,
    shouldShow: false,
  });

  useEffect(() => {
    const completed = localStorage.getItem('onboarding_completed') === 'true';
    const completedAt = localStorage.getItem('onboarding_completed_at');
    const dismissed = sessionStorage.getItem('onboarding_dismissed') === 'true';

    setState({
      isCompleted: completed,
      completedAt: completedAt,
      shouldShow: !completed && !dismissed,
    });
  }, []);

  const markComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_completed_at', new Date().toISOString());
    setState({
      isCompleted: true,
      completedAt: new Date().toISOString(),
      shouldShow: false,
    });
  };

  const dismissForSession = () => {
    sessionStorage.setItem('onboarding_dismissed', 'true');
    setState((prev) => ({
      ...prev,
      shouldShow: false,
    }));
  };

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed');
    localStorage.removeItem('onboarding_completed_at');
    sessionStorage.removeItem('onboarding_dismissed');
    setState({
      isCompleted: false,
      completedAt: null,
      shouldShow: true,
    });
  };

  const showOnboarding = () => {
    sessionStorage.removeItem('onboarding_dismissed');
    setState((prev) => ({
      ...prev,
      shouldShow: true,
    }));
  };

  return {
    ...state,
    markComplete,
    dismissForSession,
    resetOnboarding,
    showOnboarding,
  };
};
