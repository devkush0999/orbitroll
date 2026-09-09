export type Profile = { id: string; username: string; display_name: string; is_public: boolean; invite_code: string; created_at: string };
export type PlayerCard = { username: string; display_name: string; points: number; stars: number; levels: number };
export type RankedPlayer = PlayerCard & { user_id: string; rank: number };
export type Connection = { user_id: string; username: string; display_name: string };
export type CloudResult = { level_id: number; stars: number; moves: number };
export type RunReceipt = { id: string; points: number; stars: number; moves: number; crystals: number };
export type AdminRun = { id: string; level_id: number; points: number; stars: number; moves: number; hidden: boolean; excluded: boolean; created_at: string; username: string; display_name: string };
export type AdminOverview = { players: number; runs: number; recent: AdminRun[]; audit: { action: string; target: string; reason: string; created_at: string }[] };
