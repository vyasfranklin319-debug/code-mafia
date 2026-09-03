import React from 'react';
import { BattleGridDashboard } from './BattleGridDashboard';

interface DashboardPageProps {
  onNewGame: () => void;
  onViewHistory: () => void;
  onViewAdminPacks: () => void;
  onJoinByPin?: (pinCode: string) => void;
  onQuickMatch?: () => void;
  showFavoritesOnly?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNewGame,
  onViewHistory,
  onViewAdminPacks,
  onJoinByPin,
  onQuickMatch,
  showFavoritesOnly = false
}) => {
  return (
    <BattleGridDashboard
      onNewGame={onNewGame}
      onViewHistory={onViewHistory}
      onViewAdminPacks={onViewAdminPacks}
      onJoinByPin={onJoinByPin}
      onQuickMatch={onQuickMatch}
      showFavoritesOnly={showFavoritesOnly}
    />
  );
};
