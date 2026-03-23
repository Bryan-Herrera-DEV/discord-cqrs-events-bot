import type { VoiceXpHistoryEntry } from "@contexts/levels/domain/VoiceXpHistoryEntry";

export interface VoiceXpHistoryRepository {
  init(): Promise<void>;
  append(entry: VoiceXpHistoryEntry): Promise<void>;
}
