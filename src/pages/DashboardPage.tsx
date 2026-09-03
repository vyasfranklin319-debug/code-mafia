import React from 'react';
import { BattleGridDashboard } from './BattleGridDashboard';

interface DashboardPageProps {
  onNewGame: () => void;
  onViewHistory: () => void;
  onViewAdminPacks: () => void;
  showFavoritesOnly?: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNewGame,
  onViewHistory,
  onViewAdminPacks,
  showFavoritesOnly = false
}) => {
  return (
    <BattleGridDashboard
      onNewGame={onNewGame}
      onViewHistory={onViewHistory}
      onViewAdminPacks={onViewAdminPacks}
      showFavoritesOnly={showFavoritesOnly}
    />
  );
};
