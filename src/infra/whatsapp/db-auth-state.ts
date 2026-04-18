import {
  BufferJSON,
  initAuthCreds,
  proto,
} from "@whiskeysockets/baileys";
import type {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
} from "@whiskeysockets/baileys";
import * as sessionRepo from "../repos/whatsapp-session.repo";

const reviveFromJsonb = <T>(value: unknown): T =>
  JSON.parse(JSON.stringify(value), BufferJSON.reviver) as T;

const toJsonbSafe = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, BufferJSON.replacer));

export const createDbAuthState = async (userId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> => {
  const row = await sessionRepo.getSession(userId);
  const creds: AuthenticationCreds = row?.creds
    ? reviveFromJsonb<AuthenticationCreds>(row.creds)
    : initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      get: async (type, ids) => {
        const raw = await sessionRepo.getSignalKeys(userId, type, ids);
        const out: { [id: string]: SignalDataTypeMap[typeof type] } = {};
        for (const id of ids) {
          if (!(id in raw)) continue;
          let value = reviveFromJsonb<unknown>(raw[id]);
          if (type === "app-state-sync-key" && value) {
            value = proto.Message.AppStateSyncKeyData.fromObject(value as object);
          }
          out[id] = value as SignalDataTypeMap[typeof type];
        }
        return out;
      },
      set: async (data) => {
        for (const typeKey of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          const entries = data[typeKey]!;
          const rows = Object.keys(entries).map((key_id) => ({
            key_id,
            value: entries[key_id] == null ? null : toJsonbSafe(entries[key_id]),
          }));
          await sessionRepo.setSignalKeys(userId, typeKey, rows);
        }
      },
    },
  };

  const saveCreds = async () => {
    await sessionRepo.upsertCreds(userId, toJsonbSafe(state.creds));
  };

  return { state, saveCreds };
};
