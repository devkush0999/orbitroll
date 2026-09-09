import type {
  AdminOverview,
  CloudResult,
  Connection,
  PlayerCard,
  Profile,
  RankedPlayer,
  RunReceipt,
} from '../features/community/types';
import type { MediaAsset } from '../../shared/media';
type Rpc<A, R> = { Args: A; Returns: R };
// Contract for the checked-in migrations. Regenerate against the project when
// adding schema changes (see supabase/README.md).
export type Database = {
  public: {
    Tables: {
      media_assets: {
        Row: MediaAsset;
        Insert: never;
        Update: never;
        Relationships: [];
      };
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
      admin_media_library: Rpc<{ p_offset?: number }, MediaAsset[]>;
      admin_publish_media: Rpc<
        { p_id: string; p_published: boolean; p_reason: string },
        undefined
      >;
      is_admin: Rpc<Record<string, never>, boolean>;
      submit_run: Rpc<
        {
          p_id: string;
          p_level: number;
          p_revision: number;
          p_directions: string[];
          p_owner: string;
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
