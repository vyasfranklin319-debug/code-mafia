import { syncMatchToFirestore } from '../config/firebaseAdmin.js';

const matchHistory = [];

export function addMatchToHistory(record) {
  const item = {
    id: record.id || `hist-${Date.now()}`,
    date: record.date || new Date().toLocaleString(),
    packName: record.packName || 'Task Master API',
    language: record.language || 'JavaScript',
    playerCount: record.playerCount || 6,
    mafiaCount: record.mafiaCount || 2,
    winner: record.winner || 'DEVELOPERS',
    durationMinutes: record.durationMinutes || 15,
    roundsCount: record.roundsCount || 2
  };

  matchHistory.unshift(item);

  // Synchronize telemetry to Firebase Firestore matchHistory collection
  try {
    syncMatchToFirestore(item);
  } catch (e) {
    console.warn('[Firebase Sync Warning]', e.message);
  }

  return item;
}

export function getMatchHistory() {
  return matchHistory;
}

export function generateHistoryCsv() {
  const headers = ['ID,Date,ContentPack,Language,Players,Mafia,Winner,DurationMin,Rounds'];
  const rows = matchHistory.map(h => 
    `${h.id},${h.date},"${h.packName}",${h.language},${h.playerCount},${h.mafiaCount},${h.winner},${h.durationMinutes},${h.roundsCount}`
  );
  return [headers, ...rows].join('\n');
}
