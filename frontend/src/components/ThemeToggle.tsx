import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      className={['icon-button', className].filter(Boolean).join(' ')}
      onClick={toggleTheme}
      title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      type="button"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
