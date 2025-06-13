// Interest management for massive multiplayer
// Only send relevant world state to each client based on their position/sector

export function getRelevantStateForPlayer(playerId: string, worldState: any, playerPositions: Record<string, {x: number, y: number}>, radius: number = 2000) {
  const me = playerPositions[playerId];
  if (!me) return {};
  // Filter players and objects within radius
  const relevantPlayers = Object.entries(playerPositions)
    .filter(([id, pos]) => id === playerId || Math.hypot(pos.x - me.x, pos.y - me.y) < radius)
    .map(([id]) => id);
  // TODO: Filter enemies, bullets, events, etc. similarly
  return {
    players: relevantPlayers,
    // ...other relevant state
  };
}
