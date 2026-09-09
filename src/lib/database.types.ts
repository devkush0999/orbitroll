import type {
  AdminOverview,
  CloudResult,
  Connection,
  PlayerCard,
  Profile,
  RankedPlayer,
  RunReceipt,
} from '../features/community/types';
type Rpc<A, R> = { Args: A; Returns: R };
// Contract for the checked-in migrations. Regenerate against the project when
// adding schema changes (see supabase/README.md).
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: never;
        Update: Partial<
          Pick<Profile, 'username' | 'display_name' | 'is_public'>
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: Rpc<Record<string, never>, boolean>;
      submit_run: Rpc<
        {
          p_id: string;
          p_level: number;
          p_revision: number;
          p_directions: string[];
        },
        RunReceipt
      >;
      leaderboard: Rpc<
        { p_friends?: boolean; p_limit?: number; p_offset?: number },
        RankedPlayer[]
      >;
      player_card: Rpc<{ p_username: string }, PlayerCard | null>;
      my_results: Rpc<Record<string, never>, CloudResult[]>;
      invite_details: Rpc<
        { p_code: string },
        Pick<PlayerCard, 'username' | 'display_name'> | null
      >;
      accept_invite: Rpc<{ p_code: string }, undefined>;
      my_connections: Rpc<Record<string, never>, Connection[]>;
      disconnect_player: Rpc<{ p_user: string }, undefined>;
      admin_overview: Rpc<{ p_offset?: number }, AdminOverview>;
      admin_moderate_run: Rpc<
        { p_run: string; p_hidden: boolean; p_reason: string },
        undefined
      >;
      admin_moderate_player: Rpc<
        { p_username: string; p_excluded: boolean; p_reason: string },
        undefined
      >;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
