import { Store } from '@tanstack/store';
import type { SliderVariable } from '../math/types';

interface SliderState {
  variables: Record<string, SliderVariable>;
  animating: Record<string, boolean>;
  animationSpeed: Record<string, number>; // cycles per second
  dirty: boolean;
}

export const sliderStore = new Store<SliderState>({
  variables: {},
  animating: {},
  animationSpeed: {},
  dirty: false,
});

// Use intervals instead of RAF to avoid conflicts with the render loop's RAF
const animationIntervals: Record<string, ReturnType<typeof setInterval>> = {};
const animationStartTimes: Record<string, number> = {};

export function syncSliderVariables(allFreeVars: string[]): void {
  const current = sliderStore.state.variables;
  const next: Record<string, SliderVariable> = {};

  for (const name of allFreeVars) {
    if (current[name]) {
      next[name] = current[name];
    } else {
      next[name] = { value: 1, min: -10, max: 10, step: 0.1 };
    }
  }

  const currentKeys = Object.keys(current).sort();
  const nextKeys = Object.keys(next).sort();
  const keysChanged = currentKeys.length !== nextKeys.length ||
    currentKeys.some((k, i) => k !== nextKeys[i]);

  if (keysChanged) {
    for (const name of currentKeys) {
      if (!next[name]) stopAnimation(name);
    }
    sliderStore.setState((prev) => ({ ...prev, variables: next, dirty: true }));
  }
}

export function setSliderValue(name: string, value: number): void {
  sliderStore.setState((prev) => {
    const existing = prev.variables[name];
    if (!existing) return prev;
    return {
      ...prev,
      variables: { ...prev.variables, [name]: { ...existing, value } },
      dirty: true,
    };
  });
}

export function setSliderRange(name: string, min: number, max: number): void {
  sliderStore.setState((prev) => {
    const existing = prev.variables[name];
    if (!existing) return prev;
    const clampedValue = Math.min(max, Math.max(min, existing.value));
    return {
      ...prev,
      variables: { ...prev.variables, [name]: { ...existing, min, max, value: clampedValue } },
      dirty: true,
    };
  });
}

export function setSliderStep(name: string, step: number): void {
  sliderStore.setState((prev) => {
    const existing = prev.variables[name];
    if (!existing) return prev;
    return {
      ...prev,
      variables: { ...prev.variables, [name]: { ...existing, step: Math.max(0.001, step) } },
    };
  });
}

export function setAnimationSpeed(name: string, speed: number): void {
  sliderStore.setState((prev) => ({
    ...prev,
    animationSpeed: { ...prev.animationSpeed, [name]: speed },
  }));
}

export function markSlidersClean(): void {
  sliderStore.setState((prev) => ({ ...prev, dirty: false }));
}

export function getSliderScope(): Record<string, number> {
  const vars = sliderStore.state.variables;
  const scope: Record<string, number> = {};
  for (const [name, slider] of Object.entries(vars)) {
    scope[name] = slider.value;
  }
  return scope;
}

function stopAnimation(name: string): void {
  if (animationIntervals[name] != null) {
    clearInterval(animationIntervals[name]);
    delete animationIntervals[name];
    delete animationStartTimes[name];
  }
}

export function toggleAnimation(name: string): void {
  const isAnimating = sliderStore.state.animating[name];

  if (isAnimating) {
    stopAnimation(name);
    sliderStore.setState((prev) => ({
      ...prev,
      animating: { ...prev.animating, [name]: false },
    }));
  } else {
    sliderStore.setState((prev) => ({
      ...prev,
      animating: { ...prev.animating, [name]: true },
    }));

    animationStartTimes[name] = performance.now();

    animationIntervals[name] = setInterval(() => {
      const state = sliderStore.state;
      const variable = state.variables[name];
      if (!variable || !state.animating[name]) {
        stopAnimation(name);
        return;
      }

      const range = variable.max - variable.min;
      if (range <= 0) return;

      const speed = state.animationSpeed[name] ?? 0.25;
      const elapsed = (performance.now() - animationStartTimes[name]) / 1000;
      const phase = (elapsed * speed) % 2;
      const t = phase <= 1 ? phase : 2 - phase; // triangle wave
      const raw = variable.min + t * range;
      const stepped = Math.round(raw / variable.step) * variable.step;
      const clamped = Math.min(variable.max, Math.max(variable.min, stepped));

      setSliderValue(name, clamped);
    }, 16); // ~60fps
  }
}
