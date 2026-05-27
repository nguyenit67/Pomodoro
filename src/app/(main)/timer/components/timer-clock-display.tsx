'use client';

import { memo, useMemo } from 'react';
import { useTimerStore } from '@/stores/timer-store';
import { useSystemStore } from '@/stores/system-store';
import { useTranslation } from '@/contexts/i18n-context';
import {
    AnalogClock,
    DigitalClock,
    FlipClock,
} from './clocks';

export const TimerClockDisplay = memo(function TimerClockDisplay() {
    const { t } = useTranslation();
    const timeLeft = useTimerStore((state) => state.timeLeft);
    const settings = useTimerStore((state) => state.settings);
    const mode = useTimerStore((state) => state.mode);
    const isRunning = useTimerStore((state) => state.isRunning);
    const setTimerSettingsOpen = useSystemStore((state) => state.setTimerSettingsOpen);

    const totalTimeForMode = useMemo(() => {
        switch (mode) {
            case 'work':
                return settings.workDuration * 60;
            case 'shortBreak':
                return settings.shortBreakDuration * 60;
            case 'longBreak':
                return settings.longBreakDuration * 60;
            default:
                return 25 * 60;
        }
    }, [mode, settings]);

    const progressPercent = useMemo(() => {
        const total = totalTimeForMode || 1;
        return ((total - timeLeft) / total) * 100;
    }, [timeLeft, totalTimeForMode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs
            .toString()
            .padStart(2, '0')}`;
    };

    const formattedTime = formatTime(timeLeft);
    const clockSize = settings.clockSize || 'medium';

    let clockContent = null;
    switch (settings.clockType) {
        case 'analog':
            clockContent = (
                <AnalogClock
                    formattedTime={formattedTime}
                    totalTimeForMode={totalTimeForMode}
                    timeLeft={timeLeft}
                    clockSize={clockSize}
                    isRunning={isRunning}
                />
            );
            break;
        case 'flip':
            clockContent = (
                <FlipClock
                    formattedTime={formattedTime}
                    timeLeft={timeLeft}
                    isRunning={isRunning}
                    clockSize={clockSize}
                />
            );
            break;
        case 'progress':
            // Progress clock type removed from UI; fallback to digital
        case 'digital':
        default:
            clockContent = (
                <DigitalClock
                    formattedTime={formattedTime}
                    isRunning={isRunning}
                    timeLeft={timeLeft}
                    totalTimeForMode={totalTimeForMode}
                    clockSize={clockSize}
                />
            );
            break;
    }

    return (
        <div 
            onClick={() => setTimerSettingsOpen(true)}
            className="cursor-pointer inline-block transition-transform hover:scale-[1.02] active:scale-[0.98]"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTimerSettingsOpen(true);
                }
            }}
            title={t('timerComponents.enhancedTimer.timerSettings')}
        >
            {clockContent}
        </div>
    );
});
